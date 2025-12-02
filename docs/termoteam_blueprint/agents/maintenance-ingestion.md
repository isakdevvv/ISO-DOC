# Maintenance Ingestion Agent

## Jobb
Ta imot vedlikehold (app, API, e-post), lagre ALT, normalisere filer og trigge riktige oppgaver.

## Inputs
- `tenant_id`, prosjektref (intern/ekstern)
- Metadata: performed_at, performed_by, event_type
- Rå rapport (tekst + vedlegg)
- Source (INTERNAL_APP, EXTERNAL_API, EMAIL)

## Handlinger
1. Resolvé prosjekt → opprett `files` + `file_variants` for hver vedlegg.
2. Opprett `maintenance_events` (status `RECEIVED`).
3. Finn/lag MAINTENANCE_HISTORY node (+ komponentnode) → `maintenance_event_documents` link.
4. Start tasks automatisk:
   - `INTERPRET_MAINTENANCE_REPORT`
   - `UPDATE_FDV_AFTER_MAINTENANCE`
   - (ev.) `UPDATE_COMPLIANCE_AFTER_MAINTENANCE`
5. Hvis payload mangler info → sett status `NEEDS_REVIEW`, men aldri forkast.

## Output
```json
{
  "project_id": "...",
  "maintenance_event_id": "...",
  "linked_node_ids": ["..."],
  "created_task_ids": ["..."],
  "notes_for_user": ["..."]
}
```
