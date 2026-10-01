import { McpToolError } from './protocol'

const LINEAR_API_URL = 'https://api.linear.app/graphql'

/** Run one Linear GraphQL operation; failures surface as tool errors. */
export async function linearGraphQL<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token.trim() },
      body: JSON.stringify({ query, variables }),
    })
  } catch {
    throw new McpToolError('Could not reach the Linear API.')
  }

  if (response.status === 401 || response.status === 403) {
    throw new McpToolError('Linear rejected the stored API token. Reconnect Linear in the profile settings.')
  }

  const body = (await response.json().catch(() => null)) as {
    data?: T
    errors?: Array<{ message: string }>
  } | null

  if (!response.ok || !body || body.errors?.length || !body.data) {
    throw new McpToolError(`Linear API error: ${body?.errors?.[0]?.message ?? `HTTP ${response.status}`}`)
  }
  return body.data
}
