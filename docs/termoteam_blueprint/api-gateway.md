# API Gateway & Key Management

## Scopes
- `read` – hente node-data/kundemappe.
- `append` – laste opp filer/maintenance events.
- `write` – oppdatere noder (kun interne tjenester).

## Key Structure
- Genereres per node eller prosjekt.
- Lagres hash-et i `node_api_keys` (id, node_id, tenant_id, scope, rate limits, expires_at).
- Kan deaktiveres (`is_active=false`).

## Rate Limiting
- Felt: `rate_limit_per_minute`, `max_calls_per_day`.
- Soft warn ved 80% (logg + varsle admin via UI/Slack).
- Hard cut: sett `is_active=false`, registrer `api_access_log` med reason `RATE_LIMIT_EXCEEDED`, send alert.

## Auditing
- `api_access_log` lagrer: key, project, node, endpoint, status code, meta (IP, user-agent).
- UI viser grafer pr nøkkel.

## External Sharing
- Kundemappe-node kan få read-only nøkkel med utløpsdato.
- Maintenance vendors får append-nøkler begrenset til MAINTENANCE_HISTORY node.

## Ingestion Upload Flow
1. **Initiering** – `POST /api/ingestion/upload`
   - Body: `{ "projectId": "...", "nodeId": "...", "fileName": "report.pdf", "mimeType": "application/pdf", "size": 123456, "checksum": "sha256" }`
   - Response: `{ fileId, jobId, checksum, uploadUrl, uploadMethod: "PUT", formField: "file" }`
   - API returnerer relative `uploadUrl`-stier (eks. `/ingestion/upload/<fileId>/content`). Frontend legger på `NEXT_PUBLIC_API_URL` og sender auth header som vanlig.
2. **Opplasting** – `PUT /api/ingestion/upload/:fileId/content`
   - Body: `multipart/form-data` med felt `file`.
   - Response: `{ file: { ... }, jobId, status }` hvor filobjektet inkluderer eksisterende `file_variants` (original + pending placeholders).
3. **Job status** – `ingestion_jobs` oppdateres til `RUNNING` når fila er mottatt og `COMPLETED` når stubben har skrevet placeholder-varianter.

Supabase buckets (server→Supabase) ligger fast:
- `original-files` for råopptaket.
- `normalized-variants` for senere OCR/variantinnhold (noteres i metadata, men fylles Sprint 2+).
