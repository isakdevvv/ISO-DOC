# Overview

## System
- **Frontend**: Next.js (App Router) in `frontend/app/app/*` with pages for dashboard, documents, ISO standards, reports and gap analysis.
- **Backend**: NestJS in `backend/src` exposing REST controllers for documents, ISO standards, compliance, ingestion and dashboard data.
- **Storage**: PostgreSQL with `pgvector` for embeddings. Prisma models include `Document`, `DocumentChunk`, `IsoStandard`, `IsoStandardChunk`, `ComplianceReport`, `ComplianceResult`.
- **Compute**: OpenRouter-hosted models for embeddings (`text-embedding-3-small`) and LLM analysis (GPT-4o-mini, Claude 3.5 Sonnet).
- **Infra**: Docker Compose brings up Postgres (+ pgAdmin). Optional Redis client is wired but not required by default.
- **Artifacts**: Uploaded source files stored under `backend/uploads/` before/after processing.

```
[Next.js UI] → [NestJS API] → [Prisma] → [Postgres+pgvector]
                  |               |
                  |               └─ Stores chunks, metadata, compliance results
                  └─ OpenRouter (LLM + embeddings)
```

## Data flows
- **Document ingestion**
  1) User uploads file to `/documents` (multer writes to `uploads/`).
  2) `DocumentsService` persists metadata (`PENDING`).
  3) `IngestionService` extracts text (pdf-parse/mammoth/utf-8), calls LLM for metadata, splits into chunks (1000/200 overlap), embeds via OpenRouter, inserts `DocumentChunk` rows and updates `Document` to `ANALYZED` with extracted JSON.
- **ISO standard ingestion**
  1) Upload to `/iso-standards` with `standardId`.
  2) `IsoIngestionService` extracts text (PDF), chunks with clause-aware separators, embeds chunks into `IsoStandardChunk`.
  3) Extracts required documents via LLM and marks `IsoStandard` as `ANALYZED`.
- **Compliance check**
  1) `ComplianceService.checkCompliance` pulls ISO chunks (up to 50), converts embeddings, finds similar document chunks via `pgvector <=>`.
  2) LLM evaluates each requirement vs evidence, producing `ComplianceResult` rows and `ComplianceReport` with `overallScore`.
- **Gap analysis**
  - Uses `IsoStandard.requiredDocuments` plus user documents to identify missing/partial coverage (see `ComplianceService.runGapAnalysis`).
- **RAG retrieval**
  - `RagService` now blends pgvector similarity with PostgreSQL full-text search to surface both semantic and exact matches (see `docs/VercelPostgres.md` for tuning).

## Runtime
- Backend listens on `PORT` (default `4000`); CORS enabled; Vercel handler exported for serverless.
- Frontend dev server runs on `4001`.
- Postgres from `docker-compose.yml` on `5432`; test DB from `docker-compose.test.yml` on `5433`.
