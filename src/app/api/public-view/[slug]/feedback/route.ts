import { after, NextRequest, NextResponse } from 'next/server';
import * as z from 'zod';
import { supabaseAdmin, type PublicView } from '@/lib/supabase';
import { checkRateLimit, getClientIp } from '@/lib/request-security';
import { uploadFileToLinear } from '@/lib/linear-file-upload';
import { MAX_FORM_ATTACHMENT_SIZE_BYTES } from '@/lib/form-attachment';
import {
  appendAttachmentMarkdown,
  createIssueForPublicView,
  resolveLinearTokenForPublicView,
} from '@/lib/public-view-issue-creation';
import { verifyWebhookSignature } from '@/lib/webhook-signature';

const MAX_FEEDBACK_ATTACHMENT_FILES = 3;
const MAX_BASE64_ATTACHMENT_LENGTH = Math.ceil((MAX_FORM_ATTACHMENT_SIZE_BYTES * 4) / 3) + 4;
const MAX_FEEDBACK_BODY_BYTES =
  MAX_FEEDBACK_ATTACHMENT_FILES * MAX_BASE64_ATTACHMENT_LENGTH + 512 * 1024;
const MAX_MARKDOWN_FIELD_LENGTH = 20_000;
const MAX_DESCRIPTION_LENGTH = 60_000;
const FEEDBACK_ISSUE_CREATE_CONCURRENCY = 3;

const jsonRecordSchema = z.record(z.string(), z.unknown());

const feedbackAttachmentSchema = z.object({
  id: z.string().max(200).optional(),
  fileName: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(1).max(100),
  dataBase64: z.string().trim().min(1).max(MAX_BASE64_ATTACHMENT_LENGTH),
  caption: z.string().trim().max(1000).optional(),
  annotationId: z.string().max(200).optional(),
  metadata: jsonRecordSchema.optional(),
}).passthrough();

const annotationSchema = z.object({
  id: z.string().max(200).optional(),
  comment: z.string().max(5000).optional(),
  elementPath: z.string().max(2000).optional(),
  element: z.string().max(200).optional(),
  url: z.string().max(2000).optional(),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  boundingBox: jsonRecordSchema.optional(),
  selectedText: z.string().max(5000).optional(),
  nearbyText: z.string().max(5000).optional(),
  reactComponents: z.string().max(5000).optional(),
  cssClasses: z.string().max(5000).optional(),
  computedStyles: z.string().max(10000).optional(),
  accessibility: z.string().max(5000).optional(),
  intent: z.string().max(80).optional(),
  severity: z.string().max(80).optional(),
  kind: z.string().max(80).optional(),
}).passthrough();

const feedbackItemSchema = z.object({
  id: z.string().max(200).optional(),
  title: z.string().max(300).optional(),
  comment: z.string().max(5000).optional(),
  selector: z.string().max(2000).optional(),
  element: z.string().max(200).optional(),
  url: z.string().max(2000).optional(),
  sourcePath: z.string().max(2000).optional(),
  componentPath: z.string().max(5000).optional(),
  severity: z.string().max(80).optional(),
  intent: z.string().max(80).optional(),
  selectedText: z.string().max(5000).optional(),
  nearbyText: z.string().max(5000).optional(),
  attachments: z.array(feedbackAttachmentSchema).max(MAX_FEEDBACK_ATTACHMENT_FILES).optional(),
  metadata: jsonRecordSchema.optional(),
  raw: z.unknown().optional(),
}).passthrough();

const feedbackPayloadSchema = z.object({
  version: z.number().int().positive().optional(),
  title: z.string().trim().max(300).optional(),
  summary: z.string().trim().max(1000).optional(),
  source: z.object({
    tool: z.string().trim().min(1).max(100),
    app: z.string().trim().max(150).optional(),
    environment: z.string().trim().max(80).optional(),
    url: z.string().trim().max(2000).optional(),
    submittedAt: z.string().trim().max(80).optional(),
  }).passthrough(),
  reporter: z.object({
    id: z.string().max(200).optional(),
    name: z.string().max(200).optional(),
    email: z.string().email().optional(),
    organisationId: z.string().max(200).optional(),
    role: z.string().max(80).optional().nullable(),
  }).optional(),
  context: jsonRecordSchema.optional(),
  output: z.string().max(100000).optional(),
  annotations: z.array(annotationSchema).max(100).optional(),
  items: z.array(feedbackItemSchema).max(100).optional(),
  attachments: z.array(feedbackAttachmentSchema).max(MAX_FEEDBACK_ATTACHMENT_FILES).optional(),
  raw: z.unknown().optional(),
}).refine(
  (payload) =>
    Boolean(payload.summary || payload.output) ||
    (payload.annotations?.length ?? 0) > 0 ||
    (payload.items?.length ?? 0) > 0,
  { message: 'Feedback payload must include summary, output, annotations, or items' },
);

type FeedbackPayload = z.infer<typeof feedbackPayloadSchema>;
type FeedbackItem = z.infer<typeof feedbackItemSchema>;
type Annotation = z.infer<typeof annotationSchema>;
type FeedbackAttachment = z.infer<typeof feedbackAttachmentSchema>;
type UploadedFeedbackAttachment = { fileName: string; assetUrl: string };

type LoadViewResult =
  | { ok: true; view: PublicView }
  | { ok: false; status: number; error: string };

type FeedbackProcessingResult =
  | { ok: true; issue: unknown; issues: unknown[] }
  | {
      ok: false;
      status: number;
      error: string;
      details?: unknown;
      createdIssues?: unknown[];
    };

type FeedbackAttachmentUploadOptions = {
  item?: FeedbackItem;
  itemsById?: Map<string, FeedbackItem>;
};

type FeedbackAttachmentUploadResult =
  | { ok: true; attachment: UploadedFeedbackAttachment }
  | { ok: false; status: number; error: string };

type ParsedFeedbackPayloadResult =
  | { ok: true; payload: FeedbackPayload; items: FeedbackItem[] }
  | { ok: false; result: Extract<FeedbackProcessingResult, { ok: false }> };

type FeedbackProcessingInput = {
  payload: FeedbackPayload;
  items: FeedbackItem[];
  linearToken: string;
  view: PublicView;
};

function getFeedbackWebhookSecret(): string | null {
  return process.env.FEEDBACK_WEBHOOK_SECRET || null;
}

function bytesLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 20)).trimEnd()}\n\n[truncated]`;
}

function compactJson(value: unknown, maxLength = MAX_MARKDOWN_FIELD_LENGTH): string {
  try {
    return truncate(JSON.stringify(value, null, 2), maxLength);
  } catch {
    return '[unserializable]';
  }
}

function redactAttachmentData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAttachmentData);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      key === 'dataBase64' && typeof entryValue === 'string'
        ? `[base64 omitted; ${entryValue.length} chars]`
        : redactAttachmentData(entryValue),
    ]),
  );
}

function fenced(value: string, language = ''): string {
  return `\`\`\`${language}\n${value.replace(/```/g, "'''")}\n\`\`\``;
}

function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function line(label: string, value: string | null | undefined): string | null {
  const cleanValue = present(value);
  return cleanValue ? `- ${label}: ${cleanValue}` : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function numberFromRecord(record: Record<string, unknown> | null, keys: string[]): number | null {
  if (!record) return null;

  for (const key of keys) {
    const value = numberValue(record[key]);
    if (value !== null) return value;
  }

  return null;
}

function formatCoordinate(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function getItemMetadataRecord(item: FeedbackItem): Record<string, unknown> | null {
  return asRecord(item.metadata);
}

function getItemRawRecord(item: FeedbackItem): Record<string, unknown> | null {
  return asRecord(item.raw);
}

function getItemBoundingBoxRecord(item: FeedbackItem): Record<string, unknown> | null {
  const metadata = getItemMetadataRecord(item);
  const raw = getItemRawRecord(item);

  return (
    asRecord(metadata?.boundingBox) ??
    asRecord(raw?.boundingBox) ??
    asRecord(metadata?.rect) ??
    asRecord(raw?.rect)
  );
}

function formatMarkerPosition(item: FeedbackItem): string | null {
  const metadata = getItemMetadataRecord(item);
  const raw = getItemRawRecord(item);
  const x =
    numberFromRecord(metadata, ['x', 'clientX', 'pageX']) ??
    numberFromRecord(raw, ['x', 'clientX', 'pageX']);
  const y =
    numberFromRecord(metadata, ['y', 'clientY', 'pageY']) ??
    numberFromRecord(raw, ['y', 'clientY', 'pageY']);

  if (x === null && y === null) return null;

  return [
    x !== null ? `x=${formatCoordinate(x)}` : null,
    y !== null ? `y=${formatCoordinate(y)}` : null,
  ].filter(Boolean).join(', ');
}

function formatElementBounds(item: FeedbackItem): string | null {
  const boundingBox = getItemBoundingBoxRecord(item);
  if (!boundingBox) return null;

  const left = numberFromRecord(boundingBox, ['left', 'x']);
  const top = numberFromRecord(boundingBox, ['top', 'y']);
  const width = numberFromRecord(boundingBox, ['width', 'w']);
  const height = numberFromRecord(boundingBox, ['height', 'h']);
  const right = numberFromRecord(boundingBox, ['right']);
  const bottom = numberFromRecord(boundingBox, ['bottom']);
  const parts = [
    left !== null ? `x=${formatCoordinate(left)}` : null,
    top !== null ? `y=${formatCoordinate(top)}` : null,
    width !== null ? `w=${formatCoordinate(width)}` : null,
    height !== null ? `h=${formatCoordinate(height)}` : null,
    right !== null ? `right=${formatCoordinate(right)}` : null,
    bottom !== null ? `bottom=${formatCoordinate(bottom)}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : compactJson(boundingBox, 500);
}

function getFeedbackItemForAttachment(
  attachment: FeedbackAttachment,
  options: FeedbackAttachmentUploadOptions,
): FeedbackItem | undefined {
  const annotationId = present(attachment.annotationId);
  if (annotationId) return options.itemsById?.get(annotationId);
  return options.item;
}

function buildAttachmentDisplayName(
  attachment: FeedbackAttachment,
  options: FeedbackAttachmentUploadOptions = {},
): string {
  const item = getFeedbackItemForAttachment(attachment, options);
  const baseName = present(attachment.caption) ?? attachment.fileName;
  if (!item) return baseName;

  const annotationId = present(attachment.annotationId) ?? present(item.id);
  const markerPosition = formatMarkerPosition(item);
  const elementBounds = formatElementBounds(item);
  const markerDetails = [
    annotationId ? `annotation ${annotationId}` : null,
    markerPosition ? `marker ${markerPosition}` : null,
    elementBounds ? `bounds ${elementBounds}` : null,
  ].filter((value): value is string => Boolean(value));

  if (markerDetails.length === 0) return baseName;
  return truncate(`${baseName} (${markerDetails.join('; ')})`, 1000).replace(/\s+/g, ' ');
}

function buildFeedbackItemMap(items: FeedbackItem[]): Map<string, FeedbackItem> {
  return new Map(
    items
      .map((item): [string, FeedbackItem] | null => {
        const id = present(item.id);
        return id ? [id, item] : null;
      })
      .filter((entry): entry is [string, FeedbackItem] => Boolean(entry)),
  );
}

function normaliseAnnotation(annotation: Annotation): FeedbackItem {
  const comment = present(annotation.comment) ?? undefined;

  return {
    id: annotation.id,
    title: comment,
    comment,
    selector: annotation.elementPath,
    element: annotation.element,
    url: annotation.url,
    componentPath: annotation.reactComponents,
    severity: annotation.severity,
    intent: annotation.intent,
    selectedText: annotation.selectedText,
    nearbyText: annotation.nearbyText,
    metadata: {
      x: annotation.x,
      y: annotation.y,
      boundingBox: annotation.boundingBox,
      cssClasses: annotation.cssClasses,
      computedStyles: annotation.computedStyles,
      accessibility: annotation.accessibility,
      kind: annotation.kind,
    },
    raw: annotation,
  };
}

function normaliseFeedbackItems(payload: FeedbackPayload): FeedbackItem[] {
  if (payload.items?.length) return payload.items;
  return payload.annotations?.map(normaliseAnnotation) ?? [];
}

function parseFeedbackPayload(rawBody: string): ParsedFeedbackPayloadResult {
  try {
    const json = JSON.parse(rawBody) as unknown;
    const parsed = feedbackPayloadSchema.safeParse(json);
    if (!parsed.success) {
      return {
        ok: false,
        result: {
          ok: false,
          status: 400,
          error: 'Invalid feedback payload',
          details: parsed.error.issues,
        },
      };
    }

    return {
      ok: true,
      payload: parsed.data,
      items: normaliseFeedbackItems(parsed.data),
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        ok: false,
        result: { ok: false, status: 400, error: 'Invalid JSON body' },
      };
    }

    throw error;
  }
}

function buildFallbackIssueTitle(payload: FeedbackPayload, itemCount: number): string {
  const appName = present(payload.source.app) ?? present(payload.source.tool) ?? 'external tool';
  const base = present(payload.title) ?? `Feedback from ${appName}`;
  const suffix = itemCount > 0 ? ` (${itemCount} item${itemCount === 1 ? '' : 's'})` : '';
  return truncate(`[Feedback] ${base}${suffix}`, 300);
}

function buildItemIssueTitle(payload: FeedbackPayload, item: FeedbackItem, index: number): string {
  const commentTitle = present(item.title) ?? present(item.comment);
  if (commentTitle) return truncate(commentTitle, 300);

  const appName = present(payload.source.app) ?? present(payload.source.tool) ?? 'external tool';
  return truncate(`[Feedback] ${appName} annotation ${index + 1}`, 300);
}

function formatFeedbackItem(item: FeedbackItem, index: number): string {
  const heading = present(item.title) ?? present(item.comment) ?? `Feedback item ${index + 1}`;
  const comment = present(item.comment);
  const selectedText = present(item.selectedText);
  const nearbyText = present(item.nearbyText);
  const details = [
    line('ID', item.id),
    line('Severity', item.severity),
    line('Intent', item.intent),
    line('URL', item.url),
    line('Marker position', formatMarkerPosition(item)),
    line('Element bounds', formatElementBounds(item)),
    line('Selector', item.selector),
    line('Element', item.element),
    line('Source', item.sourcePath),
    line('Components', item.componentPath),
  ].filter((value): value is string => Boolean(value));

  const body = [
    `### ${index + 1}. ${heading}`,
    details.length > 0 ? details.join('\n') : null,
    comment && comment !== heading
      ? `\nComment:\n${fenced(truncate(comment, MAX_MARKDOWN_FIELD_LENGTH))}`
      : null,
    selectedText
      ? `\nSelected text:\n${fenced(truncate(selectedText, MAX_MARKDOWN_FIELD_LENGTH))}`
      : null,
    nearbyText
      ? `\nNearby text:\n${fenced(truncate(nearbyText, MAX_MARKDOWN_FIELD_LENGTH))}`
      : null,
    item.metadata ? `\nMetadata:\n${fenced(compactJson(item.metadata), 'json')}` : null,
  ].filter((value): value is string => Boolean(value));

  return body.join('\n\n');
}

function buildIssueDescription(
  payload: FeedbackPayload,
  items: FeedbackItem[],
  options: { includeStructuredOutput?: boolean } = {},
): string {
  const sourceLines = [
    line('Tool', payload.source.tool),
    line('App', payload.source.app),
    line('Environment', payload.source.environment),
    line('URL', payload.source.url),
    line('Submitted at', payload.source.submittedAt),
  ].filter((value): value is string => Boolean(value));

  const reporterLines = [
    line('Name', payload.reporter?.name),
    line('Email', payload.reporter?.email),
    line('ID', payload.reporter?.id),
    line('Organisation', payload.reporter?.organisationId),
    line('Role', payload.reporter?.role ?? undefined),
  ].filter((value): value is string => Boolean(value));

  const sections = [
    payload.summary ? `## Summary\n\n${payload.summary}` : null,
    sourceLines.length > 0 ? `## Source\n\n${sourceLines.join('\n')}` : null,
    reporterLines.length > 0 ? `## Reporter\n\n${reporterLines.join('\n')}` : null,
    payload.context ? `## Context\n\n${fenced(compactJson(payload.context), 'json')}` : null,
    items.length > 0
      ? `## Feedback ${items.length === 1 ? 'Item' : 'Items'}\n\n${items.map(formatFeedbackItem).join('\n\n')}`
      : null,
    options.includeStructuredOutput !== false && payload.output
      ? `## Structured Output\n\n${fenced(truncate(payload.output, MAX_MARKDOWN_FIELD_LENGTH), 'md')}`
      : null,
    `## Raw Payload\n\n${fenced(compactJson(redactAttachmentData(payload), 30_000), 'json')}`,
  ].filter((value): value is string => Boolean(value));

  return truncate(sections.join('\n\n'), MAX_DESCRIPTION_LENGTH);
}

function decodeBase64Attachment(attachment: FeedbackAttachment): File | null {
  try {
    const body = attachment.dataBase64.includes(',')
      ? attachment.dataBase64.split(',').at(-1) ?? ''
      : attachment.dataBase64;
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new File([bytes], attachment.fileName, { type: attachment.contentType });
  } catch {
    return null;
  }
}

async function uploadSingleFeedbackAttachment(
  apiToken: string,
  attachment: FeedbackAttachment,
  options: FeedbackAttachmentUploadOptions = {},
): Promise<FeedbackAttachmentUploadResult> {
  const file = decodeBase64Attachment(attachment);
  if (!file) {
    return { ok: false, status: 400, error: `Invalid base64 attachment: ${attachment.fileName}` };
  }

  const uploadResult = await uploadFileToLinear(apiToken, file);
  if (!uploadResult.success) {
    return {
      ok: false,
      status: 502,
      error: uploadResult.error || `Failed to upload attachment: ${attachment.fileName}`,
    };
  }

  return {
    ok: true,
    attachment: {
      fileName: buildAttachmentDisplayName(attachment, options),
      assetUrl: uploadResult.assetUrl,
    },
  };
}

async function uploadFeedbackAttachments(
  apiToken: string,
  attachments: FeedbackAttachment[] | undefined,
  options: FeedbackAttachmentUploadOptions = {},
): Promise<
  | { ok: true; attachments: UploadedFeedbackAttachment[] }
  | { ok: false; status: number; error: string }
> {
  if (!attachments?.length) return { ok: true, attachments: [] };

  const uploadResults = await Promise.all(
    attachments.map((attachment) => uploadSingleFeedbackAttachment(apiToken, attachment, options)),
  );
  const failedUpload = uploadResults.find(
    (result): result is Extract<FeedbackAttachmentUploadResult, { ok: false }> => !result.ok,
  );
  if (failedUpload) return failedUpload;

  const uploadedAttachments = uploadResults
    .filter((result): result is Extract<FeedbackAttachmentUploadResult, { ok: true }> => result.ok)
    .map((result) => result.attachment);

  return {
    ok: true,
    attachments: uploadedAttachments,
  };
}

async function loadActivePublicView(slug: string): Promise<LoadViewResult> {
  if (!slug) {
    return { ok: false, status: 400, error: 'Slug is required' };
  }

  const { data: view, error } = await supabaseAdmin
    .from('public_views')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !view) {
    return { ok: false, status: 404, error: 'Public view not found or inactive' };
  }

  if (view.expires_at && new Date(view.expires_at) < new Date()) {
    return { ok: false, status: 410, error: 'This public view has expired' };
  }

  if (!view.allow_issue_creation) {
    return { ok: false, status: 403, error: 'Issue creation not allowed on this view' };
  }

  return { ok: true, view: view as PublicView };
}

async function resolveFeedbackProcessingInput(options: {
  slug: string;
  clientIp: string;
  payload: FeedbackPayload;
  items: FeedbackItem[];
}): Promise<
  | { ok: true; input: FeedbackProcessingInput }
  | { ok: false; result: Extract<FeedbackProcessingResult, { ok: false }> }
> {
  const rateLimit = await checkRateLimit(`public-view:feedback:${options.slug}:${options.clientIp}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 429,
        error: `Too many requests. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
      },
    };
  }

  const viewResult = await loadActivePublicView(options.slug);
  if (!viewResult.ok) {
    return {
      ok: false,
      result: {
        ok: false,
        status: viewResult.status,
        error: viewResult.error,
      },
    };
  }

  const linearToken = await resolveLinearTokenForPublicView(viewResult.view);
  if (!linearToken) {
    return {
      ok: false,
      result: {
        ok: false,
        status: 500,
        error: 'Unable to create issue - Linear API token not found',
      },
    };
  }

  return {
    ok: true,
    input: {
      payload: options.payload,
      items: options.items,
      linearToken,
      view: viewResult.view,
    },
  };
}

async function processAcceptedFeedback(options: {
  slug: string;
  clientIp: string;
  rawBody: string;
}): Promise<FeedbackProcessingResult> {
  const parsed = parseFeedbackPayload(options.rawBody);
  if (!parsed.ok) return parsed.result;

  const resolved = await resolveFeedbackProcessingInput({
    slug: options.slug,
    clientIp: options.clientIp,
    payload: parsed.payload,
    items: parsed.items,
  });
  if (!resolved.ok) return resolved.result;

  return processFeedbackSubmission(resolved.input);
}

async function processFeedbackItemIssue(options: {
  payload: FeedbackPayload;
  item: FeedbackItem;
  index: number;
  items: FeedbackItem[];
  itemsById: Map<string, FeedbackItem>;
  globalAttachments: UploadedFeedbackAttachment[];
  linearToken: string;
  view: PublicView;
}): Promise<FeedbackProcessingResult> {
  const itemAttachmentUpload = await uploadFeedbackAttachments(
    options.linearToken,
    options.item.attachments,
    { item: options.item, itemsById: options.itemsById },
  );
  if (!itemAttachmentUpload.ok) {
    return {
      ok: false,
      status: itemAttachmentUpload.status,
      error: itemAttachmentUpload.error,
    };
  }

  const result = await createIssueForPublicView(options.linearToken, options.view, {
    title: buildItemIssueTitle(options.payload, options.item, options.index),
    description: appendAttachmentMarkdown(
      buildIssueDescription(options.payload, [options.item], {
        includeStructuredOutput: options.items.length === 1,
      }),
      [...options.globalAttachments, ...itemAttachmentUpload.attachments],
    ),
    labelIds: [],
  });

  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      error: result.error,
      ...(result.details ? { details: result.details } : {}),
    };
  }

  return { ok: true, issue: result.issue, issues: [result.issue] };
}

async function processFeedbackSubmission(options: {
  payload: FeedbackPayload;
  items: FeedbackItem[];
  linearToken: string;
  view: PublicView;
}): Promise<FeedbackProcessingResult> {
  const itemsById = buildFeedbackItemMap(options.items);
  const globalAttachmentUpload = await uploadFeedbackAttachments(
    options.linearToken,
    options.payload.attachments,
    { item: options.items.length === 1 ? options.items[0] : undefined, itemsById },
  );
  if (!globalAttachmentUpload.ok) {
    return {
      ok: false,
      status: globalAttachmentUpload.status,
      error: globalAttachmentUpload.error,
    };
  }

  if (options.items.length === 0) {
    const result = await createIssueForPublicView(options.linearToken, options.view, {
      title: buildFallbackIssueTitle(options.payload, 0),
      description: appendAttachmentMarkdown(
        buildIssueDescription(options.payload, []),
        globalAttachmentUpload.attachments,
      ),
      labelIds: [],
    });

    if (!result.ok) {
      return {
        ok: false,
        status: result.status,
        error: result.error,
        ...(result.details ? { details: result.details } : {}),
      };
    }

    return { ok: true, issue: result.issue, issues: [result.issue] };
  }

  const issues: unknown[] = [];
  for (let start = 0; start < options.items.length; start += FEEDBACK_ISSUE_CREATE_CONCURRENCY) {
    const batch = options.items.slice(start, start + FEEDBACK_ISSUE_CREATE_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((item, batchIndex) =>
        processFeedbackItemIssue({
          ...options,
          item,
          index: start + batchIndex,
          itemsById,
          globalAttachments: globalAttachmentUpload.attachments,
        }),
      ),
    );
    const batchIssues = batchResults
      .filter((result): result is Extract<FeedbackProcessingResult, { ok: true }> => result.ok)
      .map((result) => result.issue);
    const failedResult = batchResults.find(
      (result): result is Extract<FeedbackProcessingResult, { ok: false }> => !result.ok,
    );

    if (failedResult) {
      return {
        ...failedResult,
        ...(issues.length > 0 || batchIssues.length > 0
          ? { createdIssues: [...issues, ...batchIssues] }
          : {}),
      };
    }

    issues.push(...batchIssues);
  }

  return { ok: true, issue: issues[0], issues };
}

function feedbackProcessingResponse(result: FeedbackProcessingResult): NextResponse {
  if (result.ok) {
    return NextResponse.json({
      success: true,
      issue: result.issue,
      issues: result.issues,
    });
  }

  return NextResponse.json(
    {
      error: result.error,
      ...(result.createdIssues?.length ? { createdIssues: result.createdIssues } : {}),
      ...(result.details ? { details: result.details } : {}),
    },
    { status: result.status },
  );
}

function logFeedbackProcessingResult(
  slug: string,
  result: FeedbackProcessingResult,
  startedAt: number,
): void {
  const durationMs = Date.now() - startedAt;
  if (result.ok) {
    console.info(
      `Processed feedback webhook for ${slug}: created ${result.issues.length} issue(s) in ${durationMs}ms`,
    );
    return;
  }

  console.error(`Feedback webhook processing failed for ${slug} after ${durationMs}ms:`, {
    status: result.status,
    error: result.error,
    details: result.details,
    createdIssueCount: result.createdIssues?.length ?? 0,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const secret = getFeedbackWebhookSecret();
    if (!secret) {
      return NextResponse.json(
        { error: 'Feedback webhook secret is not configured' },
        { status: 503 },
      );
    }

    const { slug } = await params;
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_FEEDBACK_BODY_BYTES) {
      return NextResponse.json({ error: 'Feedback payload is too large' }, { status: 413 });
    }

    const clientIp = getClientIp(request);
    const rawBody = await request.text();
    if (bytesLength(rawBody) > MAX_FEEDBACK_BODY_BYTES) {
      return NextResponse.json({ error: 'Feedback payload is too large' }, { status: 413 });
    }

    const signature =
      request.headers.get('x-linear-gratis-signature') ??
      request.headers.get('x-feedback-signature');
    if (!verifyWebhookSignature(rawBody, secret, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const shouldProcessSynchronously = request.nextUrl.searchParams.get('sync') === '1';

    if (!shouldProcessSynchronously) {
      try {
        const startedAt = Date.now();
        after(async () => {
          try {
            const result = await processAcceptedFeedback({ slug, clientIp, rawBody });
            logFeedbackProcessingResult(slug, result, startedAt);
          } catch (error) {
            console.error(`Feedback webhook background processing crashed for ${slug}:`, error);
          }
        });

        return NextResponse.json(
          {
            success: true,
            accepted: true,
            processing: 'background',
            receivedBytes: bytesLength(rawBody),
          },
          { status: 202 },
        );
      } catch (backgroundError) {
        console.warn(
          'Feedback background processing was unavailable; processing synchronously instead:',
          backgroundError,
        );
      }
    }

    const parsed = parseFeedbackPayload(rawBody);
    if (!parsed.ok) return feedbackProcessingResponse(parsed.result);

    const resolved = await resolveFeedbackProcessingInput({
      slug,
      clientIp,
      payload: parsed.payload,
      items: parsed.items,
    });
    if (!resolved.ok) return feedbackProcessingResponse(resolved.result);

    const result = await processFeedbackSubmission(resolved.input);
    return feedbackProcessingResponse(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    console.error('Error in POST /api/public-view/[slug]/feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
