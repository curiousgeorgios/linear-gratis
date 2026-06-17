# Feedback Webhooks

`linear.gratis` can accept signed feedback payloads and create Linear issues through any public view that has issue creation enabled.

## Endpoint

```txt
POST /api/public-view/:slug/feedback
```

The `:slug` is the public view slug. The view controls the Linear destination, allowed labels, triage state, and project/team routing.

## Authentication

Set `FEEDBACK_WEBHOOK_SECRET` on the `linear.gratis` server. Producers must sign the exact JSON body with HMAC SHA-256 and send one of these headers:

```txt
X-Linear-Gratis-Signature: sha256=<hex digest>
X-Feedback-Signature: sha256=<hex digest>
```

Example:

```ts
import { createHmac } from "node:crypto";

const body = JSON.stringify(payload);
const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

await fetch("https://linear.gratis/api/public-view/my-view/feedback", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Feedback-Signature": signature,
  },
  body,
});
```

## Payload

The schema is intentionally tool-agnostic. Use `items` for generic tools, or `annotations` plus `output` for Agentation-compatible data.

```json
{
  "version": 1,
  "title": "Feedback from Budget app",
  "summary": "Optional short summary",
  "source": {
    "tool": "agentation",
    "app": "usual-suspects-budget-estimate",
    "environment": "production",
    "url": "https://example.com/projects/123",
    "submittedAt": "2026-06-15T00:00:00.000Z"
  },
  "reporter": {
    "name": "Reviewer Name",
    "email": "reviewer@example.com"
  },
  "context": {
    "browser": {
      "viewport": { "width": 1440, "height": 900 }
    }
  },
  "items": [
    {
      "id": "annotation-1",
      "comment": "This total is hard to scan",
      "selector": "main table td.total",
      "url": "https://example.com/projects/123",
      "severity": "important",
      "metadata": {
        "x": 734,
        "y": 412,
        "boundingBox": { "left": 700, "top": 390, "width": 120, "height": 40 }
      },
      "attachments": [
        {
          "fileName": "feedback-screenshot.png",
          "contentType": "image/png",
          "dataBase64": "iVBORw0KGgoAAA...",
          "caption": "Screenshot with annotation marker",
          "annotationId": "annotation-1"
        }
      ]
    }
  ],
  "attachments": [
    {
      "fileName": "feedback-screenshot.png",
      "contentType": "image/png",
      "dataBase64": "iVBORw0KGgoAAA...",
      "caption": "Viewport screenshot captured at feedback submission."
    }
  ],
  "output": "Optional structured markdown from a feedback tool"
}
```

## Behavior

- The request is rejected before acknowledgement if the body is too large or the signature is missing or invalid.
- The public view must exist, be active, be unexpired, and have issue creation enabled.
- Password protection on the public view is not required for signed server-to-server webhooks.
- Signed requests return `202 Accepted` after size and signature checks, then payload validation, view lookup, Linear uploads, and issue creation continue in the background.
- Add `?sync=1` to the endpoint when you need the response to wait for payload/view validation, Linear processing, and created issue IDs.
- One Linear issue is created per submitted item or annotation.
- Item titles use `item.title`, then `item.comment`. Agentation annotation titles use the annotation comment.
- Top-level `attachments` are uploaded to Linear and appended to every created issue. `item.attachments` are appended only to that item issue.
- Item `metadata.x`, `metadata.y`, and `metadata.boundingBox` are shown as marker details in Linear issue descriptions.
- Attachments with `annotationId`, or attachments nested on an item, include the marker details in the Linear attachment caption. If the producer draws the marker into the screenshot before sending it, that marked image is preserved.
- Attachment payloads are JSON base64 and are validated with the same file-type and 10 MB limit as public-view issue uploads.
- Existing public-view routing rules are reused: labels are validated, project-backed views derive a team, and triage/unstarted state is enforced.
