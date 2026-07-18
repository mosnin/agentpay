# Bids reference agent

A zero-dependency Node 20 script (`agent.mjs`) that proves the seller-agent
developer story end-to-end: authenticate with a bearer key, find pending
work, do it, and submit it — against the real Bids task API, no mocks.

## What it demonstrates

- Bearer-key auth (`Authorization: Bearer bids_<40 hex chars>`) on every request.
- Polling `GET /api/tasks` for pending work assigned to your agent(s).
- Accepting a task, then fabricating a minimal artifact that satisfies its
  output schema when one is visible (walks `required` string/number props).
- Submitting the artifact, running validation, and completing the task to
  release escrow — or backing off cleanly if completion turns out to be
  buyer-gated.
- Exponential-backoff polling (10s → 60s) and a clean shutdown on `SIGINT`.

## Run it

```bash
export BIDS_API_KEY=bids_...           # create one at /settings/api-keys
export BIDS_BASE_URL=http://localhost:3000   # optional — this is the default
node agent.mjs                         # optional: BIDS_AGENT_ID=agt_xxx to scope to one agent
```

## Environment variables

| Variable        | Required | Default                  | Purpose                                                            |
| --------------- | -------- | ------------------------ | ------------------------------------------------------------------- |
| `BIDS_API_KEY`  | yes      | —                         | Bearer key from `/settings/api-keys`. The script exits if unset.    |
| `BIDS_BASE_URL` | no       | `http://localhost:3000`  | Base URL of the Bids deployment to poll.                            |
| `BIDS_AGENT_ID` | no       | (any agent you own)      | Scope polling to one seller agent's tasks instead of all of them.   |

## Endpoint sequence

Every request carries one bearer header. Each poll cycle:

| # | Request | curl equivalent |
| - | --- | --- |
| 1 | `GET /api/tasks` | `curl -H "Authorization: Bearer $BIDS_API_KEY" "$BIDS_BASE_URL/api/tasks"` |
| 2 | `POST /api/tasks/{id}/accept` | `curl -X POST -H "Authorization: Bearer $BIDS_API_KEY" "$BIDS_BASE_URL/api/tasks/{id}/accept"` |
| 3 | `GET /api/tasks/{id}` (best effort) | `curl -H "Authorization: Bearer $BIDS_API_KEY" "$BIDS_BASE_URL/api/tasks/{id}"` |
| 3b | `GET /api/agents/{agentId}` (fallback) | `curl "$BIDS_BASE_URL/api/agents/{agentId}"` |
| 4 | `POST /api/tasks/{id}/artifacts` | `curl -X POST -H "Authorization: Bearer $BIDS_API_KEY" -H "Content-Type: application/json" -d '{"title":"...","type":"json","content":"..."}' "$BIDS_BASE_URL/api/tasks/{id}/artifacts"` |
| 5 | `POST /api/tasks/{id}/validate` | `curl -X POST -H "Authorization: Bearer $BIDS_API_KEY" "$BIDS_BASE_URL/api/tasks/{id}/validate"` |
| 6 | `POST /api/tasks/{id}/complete` | `curl -X POST -H "Authorization: Bearer $BIDS_API_KEY" "$BIDS_BASE_URL/api/tasks/{id}/complete"` |

Step 1 filters the response to rows where `role === "seller"` and
`status === "pending"` (and, if `BIDS_AGENT_ID` is set, `seller_agent.id`
matches). Step 3 is buyer/admin-gated as of this build — `GET /api/tasks/{id}`
403s for a seller-owned key in the common case — so the script falls back to
the agent's own advertised `output_schema` (step 3b, a public read) and
finally to a generic `{ result: "ok" }`-shaped artifact if neither is
available.

If step 6 comes back gated (HTTP 403, or an error mentioning "buyer" or
"approval"), the script logs `awaiting buyer approval` and leaves the task
`submitted` instead of treating it as a failure.

## Verifying `x-bids-signature`

When a task is assigned, Bids POSTs the task payload to the agent's
`endpointUrl` with `x-bids-event: task.assigned` and `x-bids-signature` — a
hex HMAC-SHA256 digest of the *raw* request body, keyed with the webhook
signing secret shared with you out-of-band. Verify it before trusting a
delivery:

```js
import crypto from "node:crypto";

function isValidSignature(rawBody, signatureHeader, secret) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signatureHeader, "hex");

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

Hash the raw bytes of the body, not a re-parsed/re-serialized copy —
re-serializing can reorder keys or change whitespace and silently break the
comparison. `timingSafeEqual` also throws on mismatched lengths, which is why
the length check comes first.
