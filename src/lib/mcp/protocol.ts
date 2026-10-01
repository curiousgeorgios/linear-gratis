// Minimal stateless MCP (Model Context Protocol) server core.
//
// Implements the Streamable HTTP transport's JSON-RPC surface that Claude Code
// and other MCP clients need: initialize, ping, tools/list and tools/call. It
// is framework-free so it can be unit-tested and reused from any route.

export const MCP_LATEST_PROTOCOL_VERSION = '2025-06-18'
export const MCP_SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']

export type JsonRpcId = string | number | null

export type JsonRpcRequest = {
  jsonrpc: '2.0'
  id?: JsonRpcId
  method: string
  params?: Record<string, unknown>
}

export type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: JsonRpcId; result: unknown }
  | { jsonrpc: '2.0'; id: JsonRpcId; error: { code: number; message: string; data?: unknown } }

export const JSON_RPC_ERRORS = {
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internal: -32603,
} as const

export type McpToolResult = {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

export type McpTool<Ctx> = {
  name: string
  title: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  annotations?: {
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
  handler: (args: Record<string, unknown>, ctx: Ctx) => Promise<unknown>
}

export type McpServerInfo = { name: string; version: string; instructions?: string }

export class McpToolError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result }
}

function fail(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

function toToolResult(value: unknown): McpToolResult {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return { content: [{ type: 'text', text }] }
}

function missingRequired(tool: McpTool<unknown>, args: Record<string, unknown>): string[] {
  return (tool.inputSchema.required ?? []).filter((key) => {
    const value = args[key]
    return value === undefined || value === null || value === ''
  })
}

/**
 * Handle one JSON-RPC message. Returns null for notifications (no id), which
 * the transport answers with HTTP 202 and an empty body.
 */
export async function handleMcpMessage<Ctx>(
  message: unknown,
  server: McpServerInfo,
  tools: ReadonlyArray<McpTool<Ctx>>,
  ctx: Ctx,
): Promise<JsonRpcResponse | null> {
  if (!isRecord(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return fail(
      isRecord(message) && 'id' in message ? (message.id as JsonRpcId) : null,
      JSON_RPC_ERRORS.invalidRequest,
      'Invalid JSON-RPC request',
    )
  }

  const isNotification = !('id' in message) || message.id === undefined
  const id = (isNotification ? null : message.id) as JsonRpcId
  const params = isRecord(message.params) ? message.params : {}

  if (isNotification) return null

  switch (message.method) {
    case 'initialize': {
      const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : ''
      const protocolVersion = MCP_SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
        ? requested
        : MCP_LATEST_PROTOCOL_VERSION
      return ok(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: server.name, version: server.version },
        ...(server.instructions ? { instructions: server.instructions } : {}),
      })
    }

    case 'ping':
      return ok(id, {})

    case 'tools/list':
      return ok(id, {
        tools: tools.map(({ name, title, description, inputSchema, annotations }) => ({
          name,
          title,
          description,
          inputSchema,
          ...(annotations ? { annotations } : {}),
        })),
      })

    case 'tools/call': {
      const name = params.name
      const tool = typeof name === 'string' ? tools.find((candidate) => candidate.name === name) : undefined
      if (!tool) return fail(id, JSON_RPC_ERRORS.invalidParams, `Unknown tool: ${String(name)}`)

      const args = isRecord(params.arguments) ? params.arguments : {}
      const missing = missingRequired(tool as McpTool<unknown>, args)
      if (missing.length > 0) {
        return fail(id, JSON_RPC_ERRORS.invalidParams, `Missing required argument(s): ${missing.join(', ')}`)
      }

      try {
        return ok(id, toToolResult(await tool.handler(args, ctx)))
      } catch (error) {
        // Tool failures are reported in-band so the model can read and react.
        const text = error instanceof McpToolError ? error.message : 'The tool failed unexpectedly.'
        if (!(error instanceof McpToolError)) console.error('[mcp] tool failure:', tool.name, error)
        return ok(id, { content: [{ type: 'text', text }], isError: true } satisfies McpToolResult)
      }
    }

    default:
      return fail(id, JSON_RPC_ERRORS.methodNotFound, `Method not found: ${message.method}`)
  }
}

/** Handle a single message or a JSON-RPC batch. Null means "nothing to send". */
export async function handleMcpPayload<Ctx>(
  payload: unknown,
  server: McpServerInfo,
  tools: ReadonlyArray<McpTool<Ctx>>,
  ctx: Ctx,
): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return fail(null, JSON_RPC_ERRORS.invalidRequest, 'Empty batch')
    }
    const responses = (
      await Promise.all(payload.map((message) => handleMcpMessage(message, server, tools, ctx)))
    ).filter((response): response is JsonRpcResponse => response !== null)
    return responses.length > 0 ? responses : null
  }
  return handleMcpMessage(payload, server, tools, ctx)
}
