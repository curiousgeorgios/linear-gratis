function escapeMarkdownAltText(value: string): string {
  return value.replace(/[[\]\\]/g, '\\$&')
}

export function appendAttachmentMarkdown(
  description: string | undefined,
  attachments: Array<{ fileName: string; assetUrl: string }>,
): string | undefined {
  if (attachments.length === 0) return description

  const attachmentMarkdown = attachments
    .map(({ fileName, assetUrl }) => `![${escapeMarkdownAltText(fileName)}](${assetUrl})`)
    .join('\n\n')

  return [description?.trim(), attachmentMarkdown].filter(Boolean).join('\n\n')
}
