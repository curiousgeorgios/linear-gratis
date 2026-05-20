export const MAX_FORM_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
export const MAX_FORM_SUBMIT_BODY_BYTES = MAX_FORM_ATTACHMENT_SIZE_BYTES + 512 * 1024

export const ALLOWED_FORM_ATTACHMENT_TYPES: Record<string, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WebP',
  'image/gif': 'GIF',
  'application/pdf': 'PDF',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'application/json': 'JSON',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
}

export type AttachmentValidationResult =
  | { ok: true }
  | { ok: false; error: string }

export type AttachmentLike = {
  name: string
  size: number
  type: string
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getAllowedAttachmentTypeList(): string {
  return Array.from(new Set(Object.values(ALLOWED_FORM_ATTACHMENT_TYPES))).join(', ')
}

export function validateFormAttachmentFile(file: AttachmentLike): AttachmentValidationResult {
  if (!file.name.trim()) {
    return { ok: false, error: 'Attachment must have a file name.' }
  }

  if (file.size <= 0) {
    return { ok: false, error: 'Attachment is empty.' }
  }

  if (file.size > MAX_FORM_ATTACHMENT_SIZE_BYTES) {
    return {
      ok: false,
      error: `Attachment must be ${formatFileSize(MAX_FORM_ATTACHMENT_SIZE_BYTES)} or smaller.`,
    }
  }

  if (!ALLOWED_FORM_ATTACHMENT_TYPES[file.type]) {
    return {
      ok: false,
      error: `Unsupported attachment type. Allowed types: ${getAllowedAttachmentTypeList()}.`,
    }
  }

  return { ok: true }
}
