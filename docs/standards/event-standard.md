# Event Standard

## Naming

Format:

domain.entity.action.v1

Examples:
- feed.post.created.v1
- media.video.processed.v1

---

## Rules

- immutable
- append-only
- versioned
- idempotent consumer

---

## Payload

Must include:
- event_id
- trace_id
- occurred_at
- producer