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
