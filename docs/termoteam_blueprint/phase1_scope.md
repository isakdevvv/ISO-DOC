# Phase 1 – Dokumentkjernen (0–3 mnd)

Denne fasen skal gi TermoTeam mulighet til å produsere komplette FDV-, CE/PED- og risiko­dokumentpakker for ett prosjekt uten manuell Word/PDF-jobbing. Alt arbeid i senere faser (service, sjekklister, avvik, CRM) bygger på denne kjernen.

## Mål & suksesskriterier
- Alle nye prosjekter kan opprettes i plattformen med prosjektmetadata, komponentregister og grunnleggende DAG-relasjoner.
- Ingest pipeline håndterer filopplasting, OCR, variant­generering (PDF/A, tekst, JSON) og lagrer provenance.
- FDV-, CE/PED- og risiko­noder genereres via template motor, kan redigeres/godkjennes og eksporteres (PDF/ZIP).
- Rule Engine vurderer TEK17, PED 2014/68/EU, NS-EN 378 og TermoTeam-regler og markerer mangler i dokumentene.
- CopilotKit Project Assistant hjelper brukere med «hva mangler?» samt trigge dokumentgenerering og kundemappe-eksport.
- Minimum én pilotleveranse (reelt TermoTeam-anlegg) fullføres gjennom hele flyten med godkjent revisjonslogg.

## Arbeidsstrømmer
### 1. Prosjekt- og komponentfundament
- SQL-migrasjoner for tenants, kunder, prosjektmetadata, komponenttyper og node_edges fullføres (ref. `architecture/data-model.md`).
- UI for «New Project» + komponentregister (CO₂-anlegg, kompressor, fordamper, ventiler, sikkerhet, instrumenter).
- DAG-visualisering light (liste + parent/child) slik at dokumenter kan kobles til noder.
- Seeder for standard komponenttyper + TermoTeam metadata (medium, PS, TS, volum, romstørrelse).

### 2. Fil- og variantmotor
- Supabase storage buckets for originalfiler + varianter med livssyklus­policies.
- Upload endpoint med klassifisering stub (FDV, CE, PED, risk, sertifikat, bilder).
- OCR + normalisering (PDF/A, tekst, chunket JSON) triggers i queue (ref. `architecture/ingestion.md`).
- Metadata og provenance lagres i `files`, `file_variants`, `document_segments`.

### 3. Dokumentmotor (FDV / CE / Risiko)
- Template Studio MVP (blokker, seksjoner, felt, autodata-hooks).
- Node-basert document builder agent (draft → review → approved) med snapshots.
- FDV v1 mal: strukturert i henhold til TermoTeam-leveranser (prosjektdata, komponent­tabeller, vedlikeholdsfakta).
- CE/PED v1 mal: PED-kategori, samsvarserklæring, trykkprøvedata, komponentliste, attester.
- Risiko v1 mal: NS-EN 378 struktur (romvolum, lekkasjescenarier, ventilasjon, alarm, tiltak).
- Customer Folder node genererer PDF/ZIP ved å samle godkjente noder + filer.

### 4. Regelmotor og kravmodell
- Ingest av TEK17, PED, NS-EN 378 og TermoTeam-spesifikke krav til `rule_sets`.
- Evalueringstjeneste (facts + conditions) som returnerer «pass», «fail», «missing data».
- Logging av treff, konflikter og manglende data per node + snapshot-lagring.
- UI-panel i document editor: viser hvilke krav som mangler eller må manuelt bekreftes.

### 5. Copilot & Task hooks
- CopilotKit Project Assistant state/actions (createProject, generateDocument, checkProjectReadiness, exportCustomerFolder).
- Task Engine MVP: tasks for FDV, CE, Risiko (create, review, approve) med statusene beskrevet i `tasks/inbox-flow.md`.
- Copilot foreslår tasks når data mangler eller regelmotor krever manuelt input.

### 6. QA, observability og release
- Happy-path E2E test (nytt prosjekt → filer → dokumenter → export).
- Metrics/logging for ingestion jobs, document builds, rule eval, Copilot actions.
- Checklist for pilotprosjekt (godkjenning, revisjon, eksporttest, rollback-plan).

## Milestones & tidslinje
| Milestone | Tid | Leveranser |
| --- | --- | --- |
| **M1 – Fundament** | Uke 0–2 | Database-migrasjoner, prosjekt/komponent-UI, seed-data, file storage konfigurert. |
| **M2 – Ingest + Templates** | Uke 3–5 | Upload API, OCR/variant pipeline, Template Studio, FDV/CE/Risk maler (draft). |
| **M3 – Document engine** | Uke 6–8 | Document builder agent, node editor m/godkjenning, Customer Folder export, Copilot actions koblet. |
| **M4 – Rules + Pilot** | Uke 9–12 | Regelmotor live, UI-panel for krav, Task inbox, full pilotprosjekt gjennomført og signert av TermoTeam. |

## Exit-kriterier
**Funksjonelt**
- Prosjekt kan opprettes, komponenter registreres og filer ingestes uten manuell DB-arbeid.
- FDV/CE/Risk noder genereres, revideres og eksporteres med signert PDF/ZIP til kunde.
- Regelmotor flagger minst 90 % av kravene fra TEK17/PED/NS-EN 378 for pilotprosjektet.
- Copilot anbefaler neste steg (manglende data, tasks, eksport) på prosjektet.

**Ikke-funksjonelt**
- Alle jobber logges med correlation-ID, retries og feilhåndtering.
- Snapshot-retention + audit trail per node aktivert.
- Prod-lignende miljø (Supabase + hosting) kjører med monitoring/dashboard.

**Dokumentasjon**
- Oppdaterte blueprint-filer (arkitektur, templates, tasks) reflekterer faktisk implementasjon.
- Pilot playbook beskriver hvordan TermoTeam-teamet kjører prosjekt fra start til kundemappe.

## Utenfor scope (flyttes til Fase 2+)
- Felt-sjekklister og mobil-first UI.
- Avvikslivssyklus og tiltakssporing.
- Maintenance ingestion utover enkel metadata­lagring.
- CRM/ERP-integrasjoner, serviceavtaler, ekstern portal.
- Rule Studio med override-workflow.

## Avhengigheter & forutsetninger
- Tilgang til minst ett komplett TermoTeam-prosjekt (FDV, CE, risiko, tegninger) for pilot.
- Supabase/Postgres, storage og embeddings-cluster operative før uke 2.
- Dedikert tid fra dokumentansvarlig hos TermoTeam til å validere maler uke 4–6.

## Måleparametere
- Tid fra «nytt prosjekt» til «klar kundemappe» < 5 arbeidsdager.
- < 5 manuelle korrigeringer pr. dokumentpakke etter regelmotor-kjøring.
- OCR/variant pipeline > 98 % vellykkede jobber innen 10 minutter.
- Copilot-bruk i minst 70 % av pilotens dokumentoppgaver (viser adopsjon).
