type SupabaseErrorLike = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

export function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const maybeError = error as SupabaseErrorLike
  if (
    maybeError.code === '42P01' ||
    maybeError.code === '42703' ||
    maybeError.code === 'PGRST204' ||
    maybeError.code === 'PGRST205'
  ) {
    return true
  }

  const text = [
    maybeError.message,
    maybeError.details,
    maybeError.hint,
  ].filter(Boolean).join(' ')

  return /could not find (?:the )?(?:table|column)|relation .* does not exist|column .* does not exist/i.test(text)
}
