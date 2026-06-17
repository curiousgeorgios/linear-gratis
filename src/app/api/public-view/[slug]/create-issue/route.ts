import { NextRequest, NextResponse } from 'next/server';
import { authorisePublicView } from '@/lib/public-view-auth';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/request-security';
import { uploadFileToLinear } from '@/lib/linear-file-upload';
import {
  MAX_FORM_ATTACHMENT_SIZE_BYTES,
  validateFormAttachmentFile,
} from '@/lib/form-attachment';
import {
  appendAttachmentMarkdown,
  createIssueForPublicView,
  resolveLinearTokenForPublicView,
} from '@/lib/public-view-issue-creation';
import * as z from 'zod';

const MAX_ISSUE_ATTACHMENT_FILES = 3;
const MAX_ISSUE_CREATE_BODY_BYTES =
  MAX_ISSUE_ATTACHMENT_FILES * MAX_FORM_ATTACHMENT_SIZE_BYTES + 512 * 1024;

const issueCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(10000).optional(),
  labelIds: z.array(z.string().min(1).max(100)).max(20).optional().default([]),
});

type IssueCreateValues = z.infer<typeof issueCreateSchema>;

type ParsedIssueCreatePayload = {
  values: IssueCreateValues;
  attachmentFiles: File[];
};

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== 'undefined' && value instanceof File && value.name.trim().length > 0;
}

function parseLabelIds(formData: FormData): string[] {
  const jsonValue = getFormString(formData, 'labelIds');
  if (jsonValue) {
    try {
      const parsed = JSON.parse(jsonValue) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((labelId): labelId is string => typeof labelId === 'string');
      }
    } catch {
      return [];
    }
  }

  return formData
    .getAll('labelId')
    .filter((labelId): labelId is string => typeof labelId === 'string');
}

async function parseIssueCreatePayload(request: NextRequest): Promise<ParsedIssueCreatePayload> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const attachmentFiles = formData
      .getAll('attachmentFiles')
      .filter(isUploadedFile);

    return {
      values: {
        title: getFormString(formData, 'title'),
        description: getFormString(formData, 'description'),
        labelIds: parseLabelIds(formData),
      },
      attachmentFiles,
    };
  }

  return {
    values: (await request.json()) as IssueCreateValues,
    attachmentFiles: [],
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_ISSUE_CREATE_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Attachment is too large' },
        { status: 413 }
      );
    }

    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`public-view:create-issue:${slug}:${clientIp}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfterSeconds);

    const payload = await parseIssueCreatePayload(request);
    if (payload.attachmentFiles.length > MAX_ISSUE_ATTACHMENT_FILES) {
      return NextResponse.json(
        { error: `You can attach up to ${MAX_ISSUE_ATTACHMENT_FILES} files` },
        { status: 400 }
      );
    }

    const parsed = issueCreateSchema.safeParse(payload.values);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid issue payload', issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const issueData = parsed.data;
    for (const attachmentFile of payload.attachmentFiles) {
      const validation = validateFormAttachmentFile(attachmentFile);
      if (!validation.ok) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    // Auth first: is_active + expiry + password cookie.
    const auth = await authorisePublicView(slug, request);
    if (!auth.ok) return auth.response;
    const viewData = auth.view;

    // Check if issue creation is allowed
    if (!viewData.allow_issue_creation) {
      return NextResponse.json(
        { error: 'Issue creation not allowed on this view' },
        { status: 403 }
      );
    }

    const linearToken = await resolveLinearTokenForPublicView(viewData);
    if (!linearToken) {
      return NextResponse.json(
        { error: 'Unable to create issue - Linear API token not found' },
        { status: 500 }
      );
    }

    const uploadedAttachments: Array<{ fileName: string; assetUrl: string }> = [];
    for (const attachmentFile of payload.attachmentFiles) {
      const uploadResult = await uploadFileToLinear(linearToken, attachmentFile);
      if (!uploadResult.success) {
        return NextResponse.json(
          { error: uploadResult.error || 'Failed to upload attachment' },
          { status: 502 }
        );
      }
      uploadedAttachments.push({
        fileName: attachmentFile.name,
        assetUrl: uploadResult.assetUrl,
      });
    }

    const result = await createIssueForPublicView(linearToken, viewData, {
      title: issueData.title,
      description: appendAttachmentMarkdown(issueData.description, uploadedAttachments),
      labelIds: issueData.labelIds,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.details ? { details: result.details } : {}),
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      issue: result.issue,
    });

  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
