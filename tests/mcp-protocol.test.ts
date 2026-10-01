import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  handleMcpPayload,
  McpToolError,
  type McpTool,
} from '../src/lib/mcp/protocol'
import { mcpTools } from '../src/lib/mcp/tools'
import {
  generateApiToken,
  hashApiToken,
  looksLikeApiToken,
  readBearerToken,
} from '../src/lib/api-tokens'

function subset(actual: unknown, expected: unknown, path = 'value'): void {
  if (expected !== null && typeof expected === 'object') {
    assert.ok(actual !== null && typeof actual === 'object', `${path} should be an object`)
    for (const [key, value] of Object.entries(expected as Record<string, unknown>)) {
      subset((actual as Record<string, unknown>)[key], value, `${path}.${key}`)
    }
    return
  }
  assert.equal(actual, expected, path)
}

const server = { name: 'test', version: '0.0.1' }

const echo: McpTool<{ prefix: string }> = {
  name: 'echo',
  title: 'Echo',
  description: 'Echo text',
  inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  handler: async (args, ctx) => `${ctx.prefix}${String(args.text)}`,
}
const boom: McpTool<{ prefix: string }> = {
  ...echo,
  name: 'boom',
  inputSchema: { type: 'object', properties: {} },
  handler: async () => {
    throw new McpToolError('visible failure')
  },
}
const crash: McpTool<{ prefix: string }> = {
  ...echo,
  name: 'crash',
  inputSchema: { type: 'object', properties: {} },
  handler: async () => {
    throw new Error('secret internals')
  },
}
const ctx = { prefix: '> ' }
const tools = [echo, boom, crash]

describe('MCP protocol core', () => {
  test('initialize negotiates a supported protocol version', async () => {
    const res = await handleMcpPayload(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } },
      server, tools, ctx,
    )
    subset(res, { id: 1, result: { protocolVersion: '2025-03-26', serverInfo: { name: 'test' } } })
  })

  test('initialize falls back to the latest version for unknown requests', async () => {
    const res = await handleMcpPayload(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } },
      server, tools, ctx,
    )
    subset(res, { result: { protocolVersion: '2025-06-18' } })
  })

  test('notifications produce no response', async () => {
    assert.equal(await handleMcpPayload({ jsonrpc: '2.0', method: 'notifications/initialized' }, server, tools, ctx), null)
  })

  test('tools/list exposes schemas but never handlers', async () => {
    const res = (await handleMcpPayload({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, server, tools, ctx)) as {
      result: { tools: Array<Record<string, unknown>> }
    }
    assert.deepEqual(res.result.tools.map((t) => t.name), ['echo', 'boom', 'crash'])
    assert.equal(res.result.tools.every((t) => !('handler' in t)), true)
  })

  test('tools/call runs the handler and validates required arguments', async () => {
    const good = await handleMcpPayload(
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'echo', arguments: { text: 'hi' } } },
      server, tools, ctx,
    )
    subset(good, { result: { content: [{ type: 'text', text: '> hi' }] } })

    const missing = await handleMcpPayload(
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'echo', arguments: {} } },
      server, tools, ctx,
    )
    subset(missing, { error: { code: -32602 } })

    const unknown = await handleMcpPayload(
      { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'nope' } },
      server, tools, ctx,
    )
    subset(unknown, { error: { code: -32602 } })
  })

  test('tool errors are in-band and unexpected errors do not leak details', async () => {
    const visible = await handleMcpPayload(
      { jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'boom' } }, server, tools, ctx,
    )
    subset(visible, { result: { isError: true, content: [{ text: 'visible failure' }] } })

    const original = console.error
    console.error = () => undefined
    const hidden = (await handleMcpPayload(
      { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'crash' } }, server, tools, ctx,
    )) as { result: { isError: boolean; content: Array<{ text: string }> } }
    console.error = original
    assert.equal(hidden.result.isError, true)
    assert.ok(!(hidden.result.content[0].text).includes('secret'))
  })

  test('unknown methods, invalid requests and batches', async () => {
    subset(await handleMcpPayload({ jsonrpc: '2.0', id: 8, method: 'nope' }, server, tools, ctx), { error: { code: -32601 } })
    subset(await handleMcpPayload({ id: 9 }, server, tools, ctx), { error: { code: -32600 } })
    subset(await handleMcpPayload([], server, tools, ctx), { error: { code: -32600 } })

    const batch = (await handleMcpPayload(
      [
        { jsonrpc: '2.0', id: 1, method: 'ping' },
        { jsonrpc: '2.0', method: 'notifications/initialized' },
      ],
      server, tools, ctx,
    )) as unknown[]
    assert.equal((batch).length, 1)
  })
})

describe('MCP tool catalogue', () => {
  test('tool names are unique and every required field is declared in properties', () => {
    assert.equal(new Set(mcpTools.map((t) => t.name)).size, mcpTools.length)
    for (const tool of mcpTools) {
      for (const key of tool.inputSchema.required ?? []) {
        assert.ok((Object.keys(tool.inputSchema.properties)).includes(key))
      }
    }
  })

  test('organisation listings only touch the caller organisation via the context', async () => {
    const calls: string[] = []
    const rows = await mcpTools
      .find((t) => t.name === 'list_roadmaps')!
      .handler({}, {
        organisationId: 'org-1',
        baseUrl: 'https://feedback.example.com',
        getLinearToken: async () => 'unused',
        listOrgRows: async (table) => {
          calls.push(table)
          return [{ slug: 'q4', name: 'Q4' }]
        },
      })
    assert.deepEqual(calls, ['roadmaps'])
    assert.deepEqual(rows, [{ slug: 'q4', name: 'Q4', url: 'https://feedback.example.com/roadmap/q4' }])
  })

  test('linear_list_issues requires a team or project', async () => {
    await assert.rejects(
      mcpTools.find((t) => t.name === 'linear_list_issues')!.handler({}, {
        organisationId: 'org-1',
        baseUrl: '',
        getLinearToken: async () => 'unused',
        listOrgRows: async () => [],
      }),
      /teamId or projectId/,
    )
  })
})

describe('API tokens', () => {
  test('generated tokens are well formed, unique and hash deterministically', async () => {
    const a = generateApiToken()
    const b = generateApiToken()
    assert.equal(looksLikeApiToken(a.token), true)
    assert.notEqual(a.token, b.token)
    assert.equal(a.token.startsWith(a.prefix), true)
    assert.equal(await hashApiToken(a.token), await hashApiToken(a.token))
    assert.match(await hashApiToken(a.token), /^[0-9a-f]{64}$/)
    assert.notEqual(await hashApiToken(a.token), await hashApiToken(b.token))
  })

  test('bearer parsing and token shape checks', () => {
    assert.equal(readBearerToken('Bearer abc'), 'abc')
    assert.equal(readBearerToken('bearer abc'), 'abc')
    assert.equal(readBearerToken('Basic abc'), null)
    assert.equal(readBearerToken(null), null)
    assert.equal(looksLikeApiToken('lgk_short'), false)
    assert.equal(looksLikeApiToken('sb-token'), false)
  })
})

describe('MCP Linear tools', () => {
  const realFetch = globalThis.fetch
  const calls: Array<{ query: string; variables: Record<string, unknown> }> = []

  function ctx(overrides: Partial<Parameters<(typeof mcpTools)[number]['handler']>[1]> = {}) {
    return {
      organisationId: 'org-1',
      baseUrl: 'https://feedback.example.com',
      getLinearToken: async () => 'lin_api_token',
      listOrgRows: async () => [] as Array<Record<string, unknown>>,
      ...overrides,
    }
  }

  function tool(name: string) {
    const found = mcpTools.find((candidate) => candidate.name === name)
    assert.ok(found, `missing tool ${name}`)
    return found
  }

  function mockLinear(handler: (query: string, variables: Record<string, unknown>) => unknown, status = 200) {
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> }
      calls.push(body)
      assert.equal((init?.headers as Record<string, string>).Authorization, 'lin_api_token')
      return new Response(JSON.stringify(handler(body.query, body.variables)), { status })
    }) as typeof fetch
  }

  const issue = {
    id: 'i1', identifier: 'ENG-1', title: 'Bug', description: 'd', priority: 2, priorityLabel: 'High',
    url: 'https://linear.app/x/issue/ENG-1', createdAt: 'c', updatedAt: 'u',
    state: { id: 's', name: 'Todo', type: 'unstarted' },
    assignee: { id: 'a', name: 'Sam' }, team: { id: 't', key: 'ENG', name: 'Eng' }, project: null,
    labels: { nodes: [{ id: 'l', name: 'bug' }] },
  }

  test('reads teams and projects', async () => {
    calls.length = 0
    mockLinear((query) => ({ data: query.includes('teams') ? { teams: { nodes: [{ id: 't1' }] } } : { projects: { nodes: [{ id: 'p1' }] } } }))
    try {
      assert.deepEqual(await tool('linear_list_teams').handler({}, ctx()), [{ id: 't1' }])
      assert.deepEqual(await tool('linear_list_projects').handler({}, ctx()), [{ id: 'p1' }])
    } finally {
      globalThis.fetch = realFetch
    }
  })

  test('lists issues with a bounded, flattened shape', async () => {
    mockLinear(() => ({
      data: {
        issues: {
          nodes: [
            { ...issue, estimate: null, cycle: null, labels: { nodes: [{ id: 'l', name: 'bug', color: '#f00' }] }, state: { id: 's', name: 'Todo', color: '#fff', type: 'unstarted' } },
            { ...issue, id: 'i2', identifier: 'ENG-2' },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    }))
    try {
      const rows = (await tool('linear_list_issues').handler({ teamId: 't1', limit: 1 }, ctx())) as Array<Record<string, unknown>>
      assert.equal(rows.length, 1)
      assert.deepEqual(rows[0].labels, ['bug'])
      assert.equal(rows[0].state, 'Todo')
    } finally {
      globalThis.fetch = realFetch
    }
  })

  test('gets one issue with comments', async () => {
    mockLinear(() => ({ data: { issue: { ...issue, comments: { nodes: [{ body: 'hi', createdAt: 'c', user: { name: 'Sam' } }] } } } }))
    try {
      const result = (await tool('linear_get_issue').handler({ id: 'ENG-1' }, ctx())) as Record<string, unknown>
      assert.equal(result.identifier, 'ENG-1')
      assert.deepEqual(result.labels, ['bug'])
      assert.equal((result.comments as unknown[]).length, 1)
    } finally {
      globalThis.fetch = realFetch
    }
    mockLinear(() => ({ data: { issue: null } }))
    try {
      await assert.rejects(tool('linear_get_issue').handler({ id: 'NOPE-1' }, ctx()), /not found/)
    } finally {
      globalThis.fetch = realFetch
    }
  })

  test('creates, updates and comments, sending only provided fields', async () => {
    calls.length = 0
    mockLinear((query) => {
      if (query.includes('issueCreate')) return { data: { issueCreate: { success: true, issue } } }
      if (query.includes('issueUpdate')) return { data: { issueUpdate: { success: true, issue } } }
      return { data: { commentCreate: { success: true, comment: { id: 'c1', url: 'u' } } } }
    })
    try {
      const created = (await tool('linear_create_issue').handler({ teamId: 't1', title: ' Bug ', priority: 2, labelIds: ['l'] }, ctx())) as Record<string, unknown>
      assert.equal(created.identifier, 'ENG-1')
      assert.deepEqual(calls[0].variables.input, { teamId: 't1', title: 'Bug', priority: 2, labelIds: ['l'] })

      await tool('linear_update_issue').handler({ id: 'ENG-1', stateId: 's2' }, ctx())
      assert.equal(calls[1].variables.id, 'ENG-1')

      await assert.rejects(tool('linear_update_issue').handler({ id: 'ENG-1' }, ctx()), /Nothing to update/)

      assert.deepEqual(await tool('linear_add_comment').handler({ issueId: 'i1', body: 'ok' }, ctx()), { id: 'c1', url: 'u' })
    } finally {
      globalThis.fetch = realFetch
    }
  })

  test('reports unsuccessful mutations', async () => {
    mockLinear(() => ({ data: { issueCreate: { success: false, issue: null }, issueUpdate: { success: false, issue: null }, commentCreate: { success: false, comment: null } } }))
    try {
      await assert.rejects(tool('linear_create_issue').handler({ teamId: 't', title: 'x' }, ctx()), /did not create the issue/)
      await assert.rejects(tool('linear_update_issue').handler({ id: 'i', title: 'x' }, ctx()), /did not update the issue/)
      await assert.rejects(tool('linear_add_comment').handler({ issueId: 'i', body: 'x' }, ctx()), /did not create the comment/)
    } finally {
      globalThis.fetch = realFetch
    }
  })

  test('maps Linear failures to readable tool errors', async () => {
    mockLinear(() => ({}), 401)
    try {
      await assert.rejects(tool('linear_list_teams').handler({}, ctx()), /rejected the stored API token/)
    } finally {
      globalThis.fetch = realFetch
    }
    mockLinear(() => ({ errors: [{ message: 'Boom' }] }))
    try {
      await assert.rejects(tool('linear_list_teams').handler({}, ctx()), /Linear API error: Boom/)
    } finally {
      globalThis.fetch = realFetch
    }
    globalThis.fetch = (async () => {
      throw new Error('offline')
    }) as typeof fetch
    try {
      await assert.rejects(tool('linear_list_teams').handler({}, ctx()), /Could not reach the Linear API/)
    } finally {
      globalThis.fetch = realFetch
    }
  })

  test('forms, views and roadmaps expose public URLs', async () => {
    const rows = [{ slug: 'abc', name: 'N' }]
    const c = ctx({ listOrgRows: async () => rows })
    assert.deepEqual(await tool('list_request_forms').handler({}, c), [{ slug: 'abc', name: 'N', url: 'https://feedback.example.com/form/abc' }])
    assert.deepEqual(await tool('list_public_views').handler({}, c), [{ slug: 'abc', name: 'N', url: 'https://feedback.example.com/view/abc' }])
  })
})
