# Sprint 1 – Foundations (Multi-Agent Playbook)

Sprint 1 bygger hele fundamentet til TermoTeams dokumentmotor. Denne filen deler arbeidet mellom **tre samtidige AI-agenter** slik at de kan levere side om side uten å trå hverandre på tærne. Alle aktiviteter må logges i Task Inbox (ref. `tasks/inbox-flow.md`) og følge blueprint-kildene.

## Sprintmål
- Prod-datamodellen (tenants, prosjekter, noder, filer, tasks, rules) finnes som SQL/Prisma migrasjoner og kjøres i Supabase/Postgres uten feil.
- Fil- og variantlagring er klar: buckets, livssykluser og upload-endepunkt fungerer.
- Prosjekt- og komponent-UI lar TermoTeam legge inn reelle anlegg og koble komponenter i DAG.
- CopilotKit Project Assistant har skeleton state/actions klar for videre logikk i Sprint 2.

## Agent-lag & handshake
| Agent | Mandat | Primæroppgaver | Kritiske håndtrykk |
| --- | --- | --- | --- |
| **Agent A – Data & Access** | Eie datamodell, seeds og API-er som andre bygger på. | `A1_SCHEMA`, `A2_SEED`, `A3_PROJECT_API`. | Publiser Prisma schema/DTO-kontrakter tidlig så andre kan jobbe async. |
| **Agent B – Storage & Ingestion** | Drift av filer/buckets og jobb-pipeline for normalisering. | `B1_STORAGE`, `B2_INGEST_STUB`. | Avklar bucket-navn + upload response format med Agent C. |
| **Agent C – Experience & Copilot** | Frontend for prosjekt/komponenter, DAG-view og Copilot skeleton. | `C1_PROJECT_UI`, `C2_DAG_VIEW`, `C3_COPILOT_BOOT`. | Krever stabile API-er fra Agent A og upload-hook fra Agent B. |

**Koordinering**
- Daglig “schema/payload standup” (15 min) mot slutten av dagen der hver agent poster diff + sample payload i Slack/Notion.
- Kontrakter som endres må først oppdateres i `api-gateway.md` og sign-off av berørte agenter før merge.

## Arbeidsrekkefølge (uten blokkering)
1. **Dag 1–2**: Agent A ferdigstiller Prisma schema og deler genererte TypeScript-typer. Agent B setter opp buckets (ingen API-avhengighet). Agent C starter UI med mock data (JSON fixtures).
2. **Dag 3**: Agent A ferdig med seeds; Agent B eksponerer upload endpoint; Agent C bytter fra mocks til ekte API.
3. **Dag 4–5**: Agent A leverer Project API; Agent B får ingestion-stub inn i queue; Agent C ferdigstiller DAG-view og Copilot skeleton.

## Taskdetaljer per agent

### Agent A – Data & Access

#### `A1_SCHEMA` – Datamodell til migrasjoner
- **Mål**: Implementere alle tabeller fra `architecture/data-model.md` (tenants, projects, nodes, node_edges, files, file_variants, document_segments, tasks, rule_sets m.m.) i Prisma migrasjoner.
- **Input**: `architecture/data-model.md`, eksisterende `backend/prisma/schema.prisma`.
- **Steg**:
  1. Oppdatere Prisma schema med manglende modeller/relasjoner (uuid PK, timestamps, enums).
  2. Generere migrasjon (`npx prisma migrate dev --name init_termoteam_schema`).
  3. Verifisere migrasjon lokalt + mot Supabase (dersom miljø finnes).
  4. Dokumentere spesielle constraints i `docs/termoteam_blueprint/architecture/data-model.md`.
- **Output**: Migrasjon i `backend/prisma/migrations/...` + oppdatert `schema.prisma`.
- **Accept**: `prisma migrate deploy` kjører uten error; `npx prisma db pull` reflekterer samme struktur.

#### `A2_SEED` – Referansedata
- **Mål**: Legge inn seeds for komponenttyper, standard nodes og rule-set placeholders.
- **Input**: `templates`, `rules`, `architecture`-mapper.
- **Steg**:
  1. Opprette/utvide `backend/prisma/seed.ts` med komponenttyper (kompressor, fordamper, ventiler, sikkerhet).
  2. Seed et demo-prosjekt + nodes for lokal testing.
  3. Legge inn default `rule_sets` (TEK17, PED, NS-EN 378, TermoTeam).
  4. Oppdatere `package.json` script `prisma db seed`.
- **Output**: Kjørbar seed-script dokumentert i README.
- **Accept**: `npx prisma db seed` lykkes og viser data i DB.

#### `A3_PROJECT_API` – Prosjekt & Node API
- **Mål**: CRUD for projects, nodes og node_edges inkl. komponentmetadata.
- **Steg**:
  1. Endepunkter: `POST /projects`, `GET /projects/:id`, `POST /projects/:id/nodes`, `PATCH /nodes/:id`.
  2. DTO-er: `create-project.dto.ts`, `create-node.dto.ts`, `update-project.dto.ts`.
  3. Validering (class-validator), RBAC (tenant scope), OpenAPI annotations.
  4. Tests (unit + e2e stub).
- **Accept**: Frontend kan registrere prosjekt og få tilbake node-id-er; Postman collection oppdatert.

### Agent B – Storage & Ingestion

#### `B1_STORAGE` – Supabase buckets + upload API
- **Mål**: Etablere fil-lagring med original + variant buckets og API-endepunkt for opplasting.
- **Input**: `architecture/ingestion.md`, Supabase config.
- **Steg**:
  1. Opprette buckets `original-files`, `normalized-variants` (+ policies for hot→cold).
  2. Implementere `/ingestion/upload` endpoint (NestJS) som lager metadata i `files`.
  3. Returnere upload URL + fileId + checksum til frontend.
  4. Logge hendelser i `ingestion_jobs`.
- **Output**: Buckets, env-vars, backend endpoint med tests (`ingestion.service.spec.ts`).
- **Accept**: Fil kan lastes opp via HTTP call og metadata ligger i DB; response format dokumentert.

#### `B2_INGEST_STUB` – Ingestion service skeleton
- **Mål**: Klargjøre pipeline for OCR/variantgenerering (selve OCR kommer Sprint 2+).
- **Steg**:
  1. Opprette queue-worker (BullMQ/Cloud Tasks) med job type `NORMALIZE_FILE`.
  2. Implementere stub som skriver `file_variants` rad med status `PENDING`.
  3. Legge til retry/backoff + logging.
  4. Dokumentere TODO for OCR-tilkobling i `docs/termoteam_blueprint/architecture/ingestion.md`.
- **Accept**: Nyopplastede filer får pending variant-jobb i loggen; dashboard viser job status.

### Agent C – Experience & Copilot

#### `C1_PROJECT_UI` – Opprette prosjekt og komponentregister
- **Mål**: Side i frontend for å opprette prosjekt og fylle ut komponenter (CO₂-anlegg).
- **Steg**:
  1. Form med felt: kunde, lokasjon, PS, TS, volum, medium, beskrivelser.
  2. Komponenttabell (legge til kompressor, fordamper, ventiler etc.) med autoseed fra `A2_SEED`.
  3. Kall API fra `A3_PROJECT_API`.
  4. Validation + progress-state (stepper).
- **Accept**: Demo-prosjekt kan bygges ende-til-ende uten manuell DB; Storybook/Playwright-scenario oppdatert.

#### `C2_DAG_VIEW` – Enkel DAG-oversikt
- **Mål**: Vise parent/child-relasjoner for noder slik at man ser struktur før document builder kommer.
- **Steg**:
  1. Bruke `/projects/:id/nodes` API til å hente edges.
  2. Visualisere som liste/tre (enkelt) med lenker til node-detaljer.
  3. Vise placeholders for fremtidige dokumentnoder (FDV/CE/Risk).
- **Accept**: Bruker forstår hva som er prosjekt, komponenter, dokument-noder; screenshot lagres i `ui/`.

#### `C3_COPILOT_BOOT` – Project Copilot skeleton
- **Mål**: Opprette CopilotKit state/actions slik at Sprint 2 kan fylle logikk.
- **Steg**:
  1. State: project metadata, missing data summary, tasks queue (tom).
  2. Actions: `createProject`, `checkProjectReadiness`, `openUpload`, `openComponentEditor`.
  3. Systemprompt: fokus på TermoTeam kontekst; instruer agent til å undersøke før svar.
  4. Integrer i `app/app/projects/[id]/page.tsx` eller tilsvarende.
- **Accept**: Copilot-panelet gir TODO-liste (selv med stubbed backend); prompt + state dokumentert i `ui/copilot-project.md`.

### Cross-agent avhengigheter
1. Agent A sitt schema må merges før Agent B kan skrive til `files` og før Agent C kan hente nodes.
2. Agent B eksponerer upload response JSON via `api-gateway.md`; Agent C konsumerer kun denne kontrakten.
3. Ingen agent skriver direkte i andres filer uten PR-review; bruk `schema.prisma`, `ingestion.service.ts`, `projects.controller.ts`, `frontend/app/app/projects/...`.

## Leveringskrav pr. uke
- **Uke 1**  
  - Agent A: `A1_SCHEMA`, `A2_SEED` i `DONE`.  
  - Agent B: `B1_STORAGE` i `DONE`.  
  - Agent C: UI prototyper basert på mock data ferdig (kan merges bak feature flagg).
- **Uke 2**  
  - Agent A: `A3_PROJECT_API`.  
  - Agent B: `B2_INGEST_STUB`.  
  - Agent C: `C1_PROJECT_UI`, `C2_DAG_VIEW`, `C3_COPILOT_BOOT` koblet mot ekte API-er.
- Alle tasks logges i Task Inbox med lenker til GitHub PR, Supabase logs og demo/video der det gir mening.

## QA-sjekkliste
- `npm run lint && npm run test` grønt i både backend og frontend.
- E2E sanity (kan være manuell): opprett prosjekt → legg inn komponent → last opp fil → se node i DAG.
- Observability: ingestion job logger correlation-id, API logg viser tenant + project-id.

## Risiko & mitigasjon
- **Schema drift**: Hvis migrasjon feiler i Supabase → dokumenter rollback (`prisma migrate resolve --applied`) og ping Agent B/C.
- **Bucket/policy issues**: Lag script for `supabase storage create-bucket` + policy JSON; kjør i CI.
- **Copilot-kit endringer**: Lås versjon i `package.json` og dokumenter upgrade-prosess.
- **API contract churn**: Endringer må først gjennom minidesign, ellers stoppes PR i review.

## Handoff
Ved sprintslutt skal følgende være oppdatert:
- `docs/termoteam_blueprint/architecture/*.md` (node-relasjoner + ingest).
- `docs/termoteam_blueprint/api-gateway.md` (endpoints/protokoller).
- `docs/termoteam_blueprint/ui/copilot-project.md` (prompt/state/actions).

Hver agent legger kort status i denne filen (egen underseksjon eller appendiks) før Sprint 2 planlegging starter. Dette hindrer at neste agentbølge må grave i commit-historikk.
