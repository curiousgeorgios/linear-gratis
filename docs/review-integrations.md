# Signed reviews and answers

Team-backed public views can receive decisions and client answers from a trusted server.
The producer authenticates its users and signs the exact JSON body with HMAC
SHA-256. Browser clients must never receive the signing secret.

```
POST /api/public-view/:slug/showcase-review
POST /api/public-view/:slug/showcase-answer
X-Linear-Gratis-Signature: sha256=<hex digest>
```

`X-Feedback-Signature` is also accepted. The existing endpoint paths remain
available to producers. Payload timestamps must be within five minutes of the
server clock. Requests are processed synchronously.

## Private configuration

Set `REVIEW_INTEGRATIONS_JSON` on the server. It is a JSON object keyed by public
view slug. Keep real teams, assignees, releases and scopes in private source
control or deployment secrets. These values are never returned by the public API.

```json
{
  "example-view": {
    "secretEnv": "EXAMPLE_REVIEW_SECRET",
    "teamId": "11111111-1111-4111-8111-111111111111",
    "cycleId": "22222222-2222-4222-8222-222222222222",
    "assigneeIds": ["33333333-3333-4333-8333-333333333333"],
    "review": {
      "fromState": "In Review",
      "transitions": {
        "accept": "Done",
        "changes": "In Progress",
        "reject": "Canceled",
        "no-longer-needed": "Canceled"
      },
      "issues": [
        {
          "id": "44444444-4444-4444-8444-444444444444",
          "identifier": "DEMO-42",
          "assigneeIds": ["33333333-3333-4333-8333-333333333333"],
          "release": {
            "version": "example-release",
            "commit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "scope": "Show the project number.",
            "sourceItems": ["ITEM-1"]
          }
        }
      ]
    },
    "answers": {
      "fromState": "With client",
      "toState": "In Progress",
      "questionHeading": "Questions for client"
    }
  }
}
```

Set `EXAMPLE_REVIEW_SECRET` separately. Use a different secret for each producer
so a producer cannot authorize writes through another configured view. The
secret variable name is selected by server configuration, never by the payload.

For policies exceeding Cloudflare's [5 KB variable limit](https://developers.cloudflare.com/workers/platform/limits/#environment-variables),
gzip the JSON and base64-encode it into `REVIEW_INTEGRATIONS_GZIP_BASE64` instead.
Configure exactly one of the two variables; setting both disables the integration.
Decompressed configuration is capped at 1 MB.

```sh
bun scripts/validate-review-config.ts /private/path/review-policy.json
gzip -c /private/path/review-policy.json | base64 | tr -d '\n' > /tmp/review-policy.gz.b64
bunx wrangler secret put REVIEW_INTEGRATIONS_GZIP_BASE64 < /tmp/review-policy.gz.b64
```

`cycleId` is optional; omit it to allow any cycle within the configured team and
assignees. Omit `review` or `answers` to disable that operation. `{}` enables an
operation with the workflow defaults shown above. State names can be changed to
match the team's workflow.

The base assignees are eligible within the configured team and cycle. Review
issue rules override the assignees for an exact identifier and UUID pair, and
require the supplied release version and commit to match configuration. The
current Linear description must contain the configured scope. A partial identity
match is rejected. Rules apply to reviews; answers use the base assignees.

Unknown slugs and disabled operations return `404`. Missing or invalid
configuration or a missing signing secret returns `503`. There is no default
client, team or secret. The public view must be active, unexpired and match the
configured team; its organisation-owned connection supplies the Linear token.

## Review payload

```json
{
  "issueId": "DEMO-42",
  "action": "accept",
  "comment": "",
  "reviewer": { "name": "Alex" },
  "submittedAt": "2026-10-01T00:00:00.000Z",
  "release": {
    "version": "example-release",
    "commit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  }
}
```

An explanation is required for changes or cancellations. `release` is required
for issues with a configured rule. Comments include the reviewer name and, when
configured, the reviewed scope and release provenance. Email remains accepted
for compatibility but is optional and is never written to the Linear comment.

## Answer payload

```json
{
  "issueId": "DEMO-43",
  "answers": [{ "question": "Who approves this?", "answer": "The project lead." }],
  "respondent": { "name": "Alex" },
  "submittedAt": "2026-10-01T00:00:00.000Z"
}
```

Questions come from the configured Markdown heading in the current Linear
description, or the existing `**Remaining question:**` format. All questions must
be answered in the current order. Stale questions or workflow states return
`409` before a write.

Both endpoints save the attributed comment before updating the issue status.
Success is returned only after Linear confirms the target state. If the comment
saves but the status update fails, check Linear before retrying; a retry can
duplicate the comment. Timestamp validation limits replay age but does not
provide exactly-once delivery.
