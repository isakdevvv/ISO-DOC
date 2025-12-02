# Ingestion Architecture (Sprint 1 Stub)

## Storage layout
- **Supabase buckets** (service-key access from backend):
  - `original-files` – hot storage for råopplastede filer. Objektstruktur: `<tenant>/<project|unassigned>/<uuid>-<slug>.<ext>`.
  - `normalized-variants` – reserveres til OCR/PDF/A/tekst-varianter når pipeline kobles på i Sprint 2.
- `STORAGE_DRIVER` kan settes til `local` for dev; produksjon bruker `supabase` + `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

## API flow
1. **Init** – `POST /api/ingestion/upload` lager `files` + `ingestion_jobs` rad (`status=PENDING`) og returnerer `uploadUrl`, `fileId`, `jobId`, checksum.
2. **Transfer** – klient laster opp `multipart/form-data` til `PUT /api/ingestion/upload/:fileId/content`. Backend streamer direkte til Supabase og validerer checksum.
3. **Queue stub** – etter transfer settes jobben til `RUNNING` og liggende in-memory kø (`IngestionQueueService`) skriver placeholder-varianter (ORIGINAL + NORMALIZED_PDF/PLAIN_TEXT/STRUCTURED_JSON med `metadata.status=PENDING`). Jobben avsluttes `COMPLETED` når stubben er ferdig.
4. **Future OCR** – TODO Sprint 2: erstatt stubben med BullMQ worker som henter originalfil fra `original-files`, gjør OCR + parsing og legger ferdige varianter i `normalized-variants` + pgvector.

## Observability
- `ingestion_jobs` felt brukt nå: `status`, `attempts`, `lastError`, `metadata.phase` (inkl. uploadUrl).
- Logging skjer via Nest logger + job status. Neste iterasjon bør kobles til grafana/logtail.

## TODO / Open items
- Koble faktisk BullMQ + Redis når infrastruktur er klar (nåværende in-memory kø står på plass som adapter).
- Supabase bucket policy-script + IaC (currently manual instructions).
- OCR/Text extraction service kobles inn i `IngestionQueueService` når DocumentProcessing er klar.
- Webhook/polling for frontend (nå returnerer `file` direkte, men UI bør evt. vise job state fra `ingestion_jobs`).
