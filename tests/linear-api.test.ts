import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import {
  fetchLinearIssues,
  fetchRoadmapIssues,
  LinearCustomerRequestManager,
  paginateLinearConnection,
  type LinearConnection,
} from '../src/lib/linear'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function useFetch(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = handler as typeof fetch
}

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

describe('Linear Relay pagination', () => {
  test('follows cursors, trims credentials, preserves variables, and concatenates pages', async () => {
    const requests: Array<{ url: string; authorization: string | null; body: Record<string, unknown> }> = []
    const pages: Array<LinearConnection<{ id: string }>> = [
      { nodes: [{ id: 'one' }, { id: 'two' }], pageInfo: { hasNextPage: true, endCursor: 'cursor-1' } },
      { nodes: [{ id: 'three' }], pageInfo: { hasNextPage: false, endCursor: null } },
    ]

    useFetch(async (input, init) => {
      requests.push({
        url: String(input),
        authorization: new Headers(init?.headers).get('Authorization'),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      })
      const page = pages[requests.length - 1]
      return jsonResponse({ data: { connection: page } })
    })

    const result = await paginateLinearConnection({
      apiToken: '  lin_api_token  ',
      query: 'query Test($after: String) { connection(after: $after) { nodes { id } } }',
      variables: { filter: { state: 'started' } },
      extract: (data) => data.connection as LinearConnection<{ id: string }>,
    })

    assert.deepEqual(result, { success: true, nodes: [{ id: 'one' }, { id: 'two' }, { id: 'three' }] })
    assert.deepEqual(requests.map((request) => request.url), [
      'https://api.linear.app/graphql',
      'https://api.linear.app/graphql',
    ])
    assert.deepEqual(requests.map((request) => request.authorization), ['lin_api_token', 'lin_api_token'])
    assert.deepEqual(
      requests.map((request) => (request.body.variables as Record<string, unknown>).after),
      [null, 'cursor-1'],
    )
    assert.deepEqual(
      requests.map((request) => (request.body.variables as Record<string, unknown>).filter),
      [{ state: 'started' }, { state: 'started' }],
    )
  })

  test('returns bounded, actionable failures for remote error modes', async () => {
    useFetch(async () => new Response('maintenance', { status: 503, statusText: 'Unavailable' }))
    assert.deepEqual(
      await paginateLinearConnection({
        apiToken: 'token',
        query: 'query',
        extract: () => { throw new Error('unreachable') },
      }),
      { success: false, error: 'Linear API error: 503 Unavailable - maintenance' },
    )

    useFetch(async () => jsonResponse({ errors: [{ message: 'bad query' }, { message: 'bad variable' }] }))
    assert.deepEqual(
      await paginateLinearConnection({
        apiToken: 'token',
        query: 'query',
        extract: () => { throw new Error('unreachable') },
      }),
      { success: false, error: 'GraphQL errors: bad query, bad variable' },
    )

    useFetch(async () => jsonResponse({ data: null }))
    assert.deepEqual(
      await paginateLinearConnection({
        apiToken: 'token',
        query: 'query',
        extract: () => { throw new Error('unreachable') },
      }),
      { success: false, error: 'No data returned from Linear API' },
    )
  })

  test('stops a misbehaving cursor loop at the configured safety limit', async () => {
    let calls = 0
    useFetch(async () => {
      calls += 1
      return jsonResponse({
        data: {
          connection: {
            nodes: [{ id: calls }],
            pageInfo: { hasNextPage: true, endCursor: `cursor-${calls}` },
          },
        },
      })
    })

    const result = await paginateLinearConnection({
      apiToken: 'token',
      query: 'query',
      maxPages: 3,
      extract: (data) => data.connection as LinearConnection<{ id: number }>,
    })

    assert.deepEqual(result, { success: false, error: 'Pagination exceeded safety limit (3 pages)' })
    assert.equal(calls, 3)
  })
})

describe('Linear issue adapters', () => {
  const issueNode = {
    id: 'issue-1',
    identifier: 'TST-1',
    title: 'Test issue',
    description: 'Description',
    priority: 2,
    priorityLabel: 'High',
    estimate: 3,
    url: 'https://linear.app/issue/TST-1',
    dueDate: '2026-09-01',
    state: { id: 'state-1', name: 'In Progress', color: '#f59e0b', type: 'started' },
    assignee: { id: 'user-1', name: 'User One' },
    labels: { nodes: [{ id: 'label-1', name: 'Bug', color: '#ef4444' }] },
    project: { id: 'project-1', name: 'Project One', color: '#5e6ad2' },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
  }

  test('validates required selectors without performing a request', async () => {
    let calls = 0
    useFetch(async () => {
      calls += 1
      return jsonResponse({})
    })

    assert.deepEqual(await fetchLinearIssues('token', {}), {
      success: false,
      error: 'Either projectId or teamId must be provided',
    })
    assert.deepEqual(await fetchRoadmapIssues('token', []), {
      success: false,
      error: 'At least one projectId must be provided',
    })
    assert.equal(calls, 0)
  })

  test('passes structured filters as variables and normalises issue labels', async () => {
    let requestBody: Record<string, unknown> | undefined
    useFetch(async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return jsonResponse({
        data: {
          issues: {
            nodes: [issueNode],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      })
    })

    const result = await fetchLinearIssues('token', {
      projectId: 'project-1',
      teamId: 'ignored-because-project-wins',
      statuses: ['In Progress'],
      labelIds: ['label-1'],
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.deepEqual(result.issues[0].labels, issueNode.labels.nodes)
    const variables = requestBody?.variables as Record<string, unknown>
    assert.deepEqual(variables.filter, {
      project: { id: { eq: 'project-1' } },
      state: { name: { in: ['In Progress'] } },
      labels: { some: { id: { in: ['label-1'] } } },
    })
  })

  test('normalises roadmap issue project and due-date fields', async () => {
    useFetch(async () => jsonResponse({ data: { issues: { nodes: [issueNode] } } }))

    const result = await fetchRoadmapIssues(' token ', ['project-1', 'project-2'])
    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.issues[0].dueDate, '2026-09-01')
    assert.deepEqual(result.issues[0].project, issueNode.project)
    assert.deepEqual(result.issues[0].labels, issueNode.labels.nodes)
  })
})

describe('Linear customer request manager', () => {
  test('returns successful API payloads and turns failures into stable results', async () => {
    const manager = new LinearCustomerRequestManager('token')
    useFetch(async () => jsonResponse({ success: true, customer: { id: 'customer-1' }, request: { id: 'request-1' } }))

    assert.deepEqual(
      await manager.createRequestWithCustomer(
        { name: 'A', email: 'a@example.com' },
        { title: 'Request', body: 'Body' },
        'project-1',
      ),
      { success: true, customer: { id: 'customer-1' }, request: { id: 'request-1' } },
    )

    useFetch(async () => jsonResponse({ error: 'Linear rejected the request' }, { status: 400 }))
    assert.deepEqual(
      await manager.createRequestWithCustomer(
        { name: 'A', email: 'a@example.com' },
        { title: 'Request', body: 'Body' },
        'project-1',
      ),
      { success: false, error: 'Linear rejected the request' },
    )
  })
})
