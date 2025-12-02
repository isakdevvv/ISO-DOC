# System Architecture

## Layered View
1. **Ingestion Service** – tar imot filer/API payloads, lagrer original + metadata.
2. **Normalization Engine** – OCR, PDF/A, tekst/JSON-varianter, dokumentklassifisering.
3. **Node Engine (DAG)** – noder pr dokument/prosess, relasjoner (`DEPENDS_ON`, `GENERATES`, ...).
4. **Rule Engine** – evaluerer facts vs. EU/TEK17/TermoTeam/kunde regler, håndterer konflikter.
5. **RAG Retrieval** – semantisk søk over lovverk, manualer, kundedokumenter.
6. **Document Builder** – fyller templates via RAG + facts, lager snapshots & provenance.
7. **Maintenance Engine** – lagrer events, knytter til noder, trigger tasks.
8. **Task Orchestrator** – flertrinns arbeidsflyt m. menneskegodkjenning.
9. **Snapshot & Trace Service** – fanger rule-versjoner, chunk IDs, facts, modell, segments.
10. **API Gateway** – autoriserer brukere og node-spesifikke API-nøkler, rate limits, audit log.
11. **CopilotKit Layer** – kontekstbevisste assistenter i UI (dashboard, node, maintenance, admin).

## Deployment Hints
- Monorepo (frontend, api, worker) + delt `packages/` for db, core, ai-agents.
- Async jobber (queue) for OCR, embeddings, doc generator.
- Storage: S3 for filer, Postgres (Supabase) for metadata, pgvector for embeddings.
- Snapshots & provenance må aldri slettes før arkivpolicy utløper (hot→cold migrering).
