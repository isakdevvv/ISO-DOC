# Team Lead Guide

- **Prioritering og oppgavesetting**
  - Avklar aktiv oppgave i `task.md`/`plan` før arbeid starter; unngå overlapp.
  - Del opp arbeid i små, verifiserbare leveranser med tydelig eier og tidsramme.

- **Arkitektur og dokumentasjon**
  - Hold `docs/Overview.md` oppdatert når API-er, dataflyt eller infrastruktur endres.
  - Sørg for at onboarding-info i `README.md` og testinstrukser i `TESTING.md` er riktige.

- **Kvalitet og sikkerhet**
  - Krev relevante tester (enhet/E2E) før merge; respekter kjente flakies.
  - Koordiner Prisma-endringer: én ansvarlig pr. migrasjon, unngå parallelle schema-oppdateringer.
  - Sikre nøkler/hemmeligheter (OpenRouter, DB) via `.env`/secrets, aldri i repo.

- **Samarbeid**
  - Følg rollene i `agents/AgentPlaybook.md`; klargjør handoffs mellom ingestion/compliance/gap-rapportering.
  - Kommuniser blokkere tidlig (DB nede, rate limits, modellvalg) og foreslå omveier.

- **Operasjonelt**
  - Overvåk basishelse: Postgres/pgvector opp via Docker, backend på `4000`, frontend på `4001`.
  - Planlegg og annonser deploy-vinduer; verifiser røyktester etter prod/endringer.
