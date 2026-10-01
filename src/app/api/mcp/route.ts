import { NextRequest, NextResponse } from 'next/server'
import { readBearerToken } from '@/lib/api-tokens'
import { authenticateApiToken, getLinearTokenForPrincipal, listOrgRows } from '@/lib/mcp/auth'
import { handleMcpPayload, JSON_RPC_ERRORS, type McpServerInfo } from '@/lib/mcp/protocol'
import { mcpTools, type McpContext } from '@/lib/mcp/tools'
import { checkRateLimit, rateLimitResponse } from '@/lib/request-security'

// MCP over Streamable HTTP (stateless, JSON responses). Connect from Claude Code:
//   claude mcp add --transport http linear-gratis https://<host>/api/mcp \
//     --header "Authorization: Bearer lgk_..."

const MAX_BODY_BYTES = 256 * 1024

const SERVER: McpServerInfo = {
  name: 'linear-gratis',
  version: '1.0.0',
  instructions:
    'Tools for the Linear workspace connected to this linear.gratis organisation: browse teams, projects and issues, create/update issues, add comments, and list the public forms, views and roadmaps. Start with linear_list_teams to find team ids.',
}

function rpcError(status: number, code: number, message: string, headers?: HeadersInit) {
  return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code, message } }, { status, headers })
}

function publicBaseUrl(request: NextRequest): string {
  const configured = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '')
  return `${proto}://${host}`
}

export async function POST(request: NextRequest) {
  const principal = await authenticateApiToken(readBearerToken(request.headers.get('authorization')))
  if (!principal) {
    return rpcError(401, JSON_RPC_ERRORS.invalidRequest, 'Missing or invalid API token', {
      'WWW-Authenticate': 'Bearer realm="linear-gratis-mcp"',
    })
  }

  const limit = await checkRateLimit(`mcp:${principal.tokenId}`, { limit: 120, windowMs: 60_000 })
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSeconds)

  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return rpcError(413, JSON_RPC_ERRORS.invalidRequest, 'Request body too large')
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return rpcError(400, JSON_RPC_ERRORS.parse, 'Parse error')
  }

  let cachedLinearToken: Promise<string> | undefined
  const ctx: McpContext = {
    organisationId: principal.organisationId,
    baseUrl: publicBaseUrl(request),
    getLinearToken: () => (cachedLinearToken ??= getLinearTokenForPrincipal(principal)),
    listOrgRows: (table, columns) => listOrgRows(principal.organisationId, table, columns),
  }

  const result = await handleMcpPayload(payload, SERVER, mcpTools, ctx)
  if (result === null) return new NextResponse(null, { status: 202 })
  return NextResponse.json(result)
}

// Stateless server: no standalone SSE stream and no sessions to terminate.
export async function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } })
}

export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } })
}
