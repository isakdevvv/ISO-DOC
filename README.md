# ISO Doc Platform

LLM-drevet plattform for opplasting, analyse og ISO-compliance av dokumenter.

## Hva den gjør
- Tar imot dokumenter og ISO-standarder, ekstraherer tekst/metadata, chunker og embedder i Postgres/pgvector.
- Kjør compliance- og gap-analyser med LLM-basert vurdering per ISO-krav.
- Leverer dashboard/rapport-visning via Next.js-frontend.

## Stakk og mappeoversikt
- Frontend: Next.js (App Router) i `frontend/`.
- Backend: NestJS + Prisma i `backend/`; Postgres/pgvector via Docker Compose.
- Docs: `docs/Overview.md` (arkitektur), `docs/VercelPostgres.md` (Vercel Postgres + hybrid RAG), `TESTING.md`.
- Andre: `agents/AgentPlaybook.md`, `team/TeamLead_Guide.md`, `configs/`, `scripts/`.

## Kom i gang (lokalt)
1) Start databasen  
   - `docker-compose up -d postgres` (bruker/pass: `user`/`password`, DB `iso_doc_platform`).
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
