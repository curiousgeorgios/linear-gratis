type GraphQLResult<T> = { data?: T; errors?: Array<{ message: string }> };

export async function linearRequest<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token.trim() },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Linear returned ${response.status}`);
  const result = await response.json() as GraphQLResult<T>;
  if (result.errors?.length || !result.data) throw new Error(result.errors?.map(error => error.message).join('; ') || 'Linear returned no data');
  return result.data;
}
