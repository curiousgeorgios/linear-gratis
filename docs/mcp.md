# MCP server for Claude Code

linear.gratis exposes a [Model Context Protocol](https://modelcontextprotocol.io)
server so Claude Code (or any MCP client) can work with the Linear workspace
connected to your organisation. It is part of the application, so it works the
same on linear.gratis and on a self-hosted installation, with nothing extra to
run.

- **Endpoint:** `https://<your-host>/api/mcp`
- **Transport:** Streamable HTTP (stateless, JSON responses)
- **Authentication:** `Authorization: Bearer lgk_…` organisation API token

## 1. Create a token

Sign in, open **Profile → MCP access for Claude Code**, name the token and
create it. The secret is shown once; only its SHA-256 hash is stored. Revoke a
token from the same card at any time.

## 2. Connect Claude Code

```bash
claude mcp add --transport http linear-gratis https://feedback.example.com/api/mcp \
  --header "Authorization: Bearer lgk_your_token"
```

Or commit a project-scoped `.mcp.json` (keep the token in an environment
variable rather than in git):

```json
{
  "mcpServers": {
    "linear-gratis": {
      "type": "http",
      "url": "https://feedback.example.com/api/mcp",
      "headers": { "Authorization": "Bearer ${LINEAR_GRATIS_TOKEN}" }
    }
  }
}
```

For a local Docker install use `http://localhost:3000/api/mcp`.

## Tools

| Tool | Description |
| --- | --- |
| `linear_list_teams` | Teams in the connected workspace. |
| `linear_list_projects` | Projects in the connected workspace. |
| `linear_list_issues` | Issues for a team or project, optionally filtered by status. |
| `linear_get_issue` | One issue with description and recent comments (id or `ENG-123`). |
| `linear_create_issue` | Create an issue (title, description, priority, project, labels). |
| `linear_update_issue` | Change title, description, state, priority or assignee. |
| `linear_add_comment` | Comment on an issue. |
| `list_request_forms` | The organisation's customer request forms and their public URLs. |
| `list_public_views` | Shared public views and their URLs. |
| `list_roadmaps` | Public roadmaps and their URLs. |

Tools use the Linear token already saved in the profile settings; the token is
decrypted server-side and never sent to the client. Tool failures are returned
in-band (`isError: true`) so the model can react to them.

## Security notes

- Tokens are scoped to one organisation and grant the same Linear access as the
  connection saved for it. Create one token per client and revoke what you no
  longer use.
- Requests are rate limited per token (120 per minute).
- API tokens cannot create or revoke API tokens; that needs a browser session.

## Smoke test

```bash
curl -s https://feedback.example.com/api/mcp \
  -H "Authorization: Bearer lgk_your_token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```
