# ISO Doc Platform

LLM-drevet plattform for opplasting, analyse og ISO-compliance av dokumenter.

## Hva den gjør
- Tar imot dokumenter og ISO-standarder, ekstraherer tekst/metadata, chunker og embedder i Postgres/pgvector.
- Kjør compliance- og gap-analyser med LLM-basert vurdering per ISO-krav.
- Leverer dashboard/rapport-visning via Next.js-frontend.

## Stakk og mappeoversikt
- Frontend: Next.js (App Router) i `frontend/`.
- Backend: NestJS + Prisma i `backend/`; Postgres/pgvector via Docker Compose.
- Docs: `docs/Overview.md` (arkitektur), `docs/VercelPostgres.md` (Vercel Postgres + hybrid RAG), `docs/LEGAL_STANDARDS_POLICY.md` (IP/licenspolicy), `TESTING.md`.
- Andre: `agents/AgentPlaybook.md`, `team/TeamLead_Guide.md`, `configs/`, `scripts/`.

## Kom i gang (lokalt)

> Kjapp vei: Kjør `npm run dev` fra rotmappen. Scriptet stanser gamle dev-prosesser, starter Postgres via Docker Compose, kjører `prisma migrate deploy` + `prisma db seed` og spinner både backend (port `4000`) og frontend (port `4001`). Sett `SKIP_DEV_DB_BOOTSTRAP=1` om du heller vil bruke en allerede kjørende database.

1) Start databasen (hvis du hopper over automatikken)  
   - `docker compose up -d postgres` (bruker/pass: `user`/`password`, DB `iso_doc_platform`).
2) Sett miljøvariabler  
   - Backend: `DATABASE_URL=postgresql://user:password@localhost:5432/iso_doc_platform`  
   - OpenRouter (påkrevd for ingestion/compliance): `OPENROUTER_API_KEY=...`
3) Backend  
  - `cd backend && npm install`
  - `npx prisma migrate deploy` (eller `prisma migrate dev` for lokal utvikling)
  - `npm run db:seed` for å fylle inn demo-prosjekt, komponenttyper og regelsett
  - `npm run start:dev` (lytter på `4000`, CORS på).
4) Frontend  
   - `cd frontend && npm install && npm run dev -- -p 4001` (Next.js på `4001`).

## Testing
Se `TESTING.md` for backend Jest/E2E og frontend Vitest/Playwright-oppsett (egen test-DB på port `5433`).

Mer detaljer om komponenter og flyter: `docs/Overview.md`.

## Termoteam dokumentgenerator

- API-endepunkter ligger under `/api/projects/:projectId/*` og lar deg laste opp vedlegg, trigge generering (`POST /projects/:id/generate`), hente mappe-treet (`GET /projects/:id/tree`) og regenerere internkontroll (`POST /projects/:id/regenerate/internkontroll`).
- Malstruktur og standardfiler styres av `backend/src/modules/project-docs/templates/folder-template.json` – endre denne for å oppdatere mappeoppsettet.
- Genererte filer og opplastede vedlegg lagres på filsystemet under `uploads/project-docs/[PROSJEKTNR - KUNDE - ANLEGG]/...`. Sett `PROJECT_DOC_STORAGE` for å styre rotmappe.
- AI-tekst (forside, risikovurdering, internkontroll m.m.) bruker OpenRouter via `AiClientFactory`. Sørg for at `OPENROUTER_API_KEY` er satt.
