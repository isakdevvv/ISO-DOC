# Maintenance Agent Instructions

## Purpose
Ingest maintenance payloads, normalize attachments, link to nodes, and create follow-up tasks.

## References
- `../agents/maintenance-ingestion.md`
- `../maintenance/api.md`
- `../maintenance/history-node.md`

## Steps
1. Validate API key / auth, resolve project + component IDs.
2. Store every attachment as `files` + `file_variants` (original + normalized + OCR/JSON if possible).
3. Create `maintenance_events` row (`status=RECEIVED` unless auto-parse succeeded).
4. Link event to MAINTENANCE_HISTORY + relevant COMPONENT nodes.
5. Auto-create tasks per `tasks/templates.md`.
6. Update status to `PARSED` once structured data extracted; keep `NEEDS_REVIEW` if info missing.

## Coordination
- Log event IDs in `agent_handbook/notes.md` with timestamp so other agents know.
- Never delete or modify existing events; append corrections.
- If rate limit triggered, notify Admin via API gateway log + note.
