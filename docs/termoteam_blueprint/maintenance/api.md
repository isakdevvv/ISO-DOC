# Maintenance API Contract

## Endpoint
`POST /api/maintenance/event`

### Headers
- `X-API-Key`: node eller prosjektspesifikk nøkkel.

### Payload
```json
{
  "project_external_id": "REMA_FANTOFT_CO2",
  "component_id": "COMP-EVAP-01",
  "performed_at": "2026-05-12T10:30:00Z",
  "performed_by": "Montør Hansen",
  "event_type": "PERIODIC_SERVICE",
  "report": {
    "summary": "Skiftet filter, testet alarm",
    "actions": ["Filter byttet", "Alarm testet"],
    "issues": [],
    "attachments": [
      {"type": "photo", "url": "https://..."},
      {"type": "pdf", "url": "https://..."}
    ]
  }
}
```

## Response
- `201 Created` + `{ maintenance_event_id, task_ids }`
- Rate limit: soft warning ved 80% kvote, hard cut med 429 + admin varsel når grense passeres.

## Behavior
- Originalfiler lastes ned av ingestion service.
- Event logges selv om data er ufullstendig (`status=NEEDS_REVIEW`).
- API-nøkler kan suspenders automatisk (set `is_active=false`), admin reopen via UI.
