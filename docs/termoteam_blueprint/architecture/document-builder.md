# Phase 3 – Document Builder & Snapshots

Denne filen beskriver hvordan fase 3 i implementasjonsplanen leveres: RAG-tjeneste, Document Builder-agenten, Node Editor-APIet og eksportfunksjonen ut til kunde.

## 1. Komponentoversikt
| Komponent | Ansvar | Kilde |
|-----------|--------|-------|
| **RAG Retrieval Service** | Vector-søk over `document_segments`, regeltekst og kundedata. Må støtte filtrering per prosjekt/tenant. Returnerer chunk-id, dokumenttittel, side, kilde-type, similarity-score. | Supabase (pgvector) + `DocumentSegmentProvenance`. |
| **Template Registry** | Last inn `DocumentTemplate` JSON (seksjoner, felt, metadata). Holder minor/patch-versjoner og checksum slik at snapshot kan referere eksakt struktur. | `templates/document.md` |
| **Document Builder Agent** | Kombinerer facts + requirements + RAG-context for å fylle noder. Lager snapshots, segments og node-revisjon med `change_type=AI_GENERATION`. | `agents/document-builder.md`, `agent_handbook/document-builder.md` |
| **Node Editor API** | Server-side API som lar UI hente node, diff’e revisjoner, oppdatere felt, approvere/avvise. Innebygde låser (status) og logg (`task_runs`). | Frontend `ui/node-editor` (kommer), backend `nodes`-modul. |
| **Export Pipeline** | Tar godkjente noder (typisk `CUSTOMER_FOLDER`) + relaterte filer og produserer PDF/ZIP med segment/provenans data. | `templates/document.md`, `workflows/revision-trace.md`. |

## 2. RAG Retrieval Service
1. **Input**: prosjekt-id, liste med felt (label, felt-id, ønsket kilde), optional `requirements_model`.
2. **Prosess**:
   - Generer embeddings for feltlabel + kravtekst.
   - Søke først i prosjektets egne `document_segments` (filtrert på `node_id` ∈ prosjekt).
   - Hvis utilstrekkelig confidence → slå opp i globale regelkilder (`rules/library.md` referanser) eller kundedokumenter.
   - Returner maks `k` chunks per felt (inkluderer `segment_id`, `chunk_text`, `source_type`, `document_title`, `similarity`).
3. **Output**: JSON per felt: `{"field_id":"ps","chunks":[{"segment_id":"...","content":"...", "source_type":"manual","source_id":"doc-123","similarity":0.83}]}`.
4. **Caching**: Lagre embeddings og resultat i Redis 5 min for å unngå duplikate kall når Document Builder streamer felt.

## 3. Document Builder Pipeline
1. **Trigger**: Task Orchestrator (fase 4) eller manuelt UI-kall til `/nodes/:id/generate`.
2. **Steg**:
   1. Hent `Node` + `DocumentTemplate`.
   2. Lås node (`status = IN_PROGRESS`) slik at andre tasks blokkeres.
   3. Kjør RAG for hvert `autoFilled` felt og bygg en prompt:
      ```
      Facts: {...}
      Requirements: {...}
      Template: [{sectionId, fields:[{fieldId, label, required, autoFilled}]}]
      Context[fieldId]: [{chunkId, text, source}]
      ```
   4. LLM svar skal være ren JSON med:
      - `sections` → `fields` {`fieldId`, `value`, `status`: `"AUTO"` \| `"NEEDS_INPUT"`, `notes`, `source_chunk_ids`: []}
      - `summary`, `auto_filled_fields`, `fields_needing_user_input`, `notes_for_user`.
   5. Valider JSON mot template (kravfelt må ha verdi eller `NEEDS_INPUT`).
   6. Skriv `generation_snapshot`:
      - `payload`: hele svaret.
      - `ruleSetHash`: hash av aktive regelsett versjoner sendes inn.
      - `facts`, `requirements`, `ragChunks` (felt → chunk-id).
      - `prompt_hash` (SHA256 av system+user prompt).
   7. Lag `document_segments` for hvert felt + `DocumentSegmentProvenance` per chunk-id.
   8. Opprett `node_revision` (`change_type=AI_GENERATION`, `severity=NOTE` hvis `fields_needing_user_input` > 0 ellers `NONE`). Sett `node.currentRevisionId`.
   9. Oppdater node:
      - `data.sections` = generert struktur
      - `status = PENDING_REVIEW`
      - `metadata.last_builder_run` (modell, tid, snapshot_id).
3. **Feilhåndtering**: Hvis LLM feiler → markér task som `BLOCKED` og lag logg med error. Node beholder tidligere status.

## 4. Node Editor API
| Endpoint | Beskrivelse |
|----------|-------------|
| `GET /nodes?projectId=` | Liste over noder (status, template, siste revisjon). |
| `GET /nodes/:id` | Returnerer node + aktiv revisjon + snapshot referanse. |
| `POST /nodes/:id/generate` | Trigger Document Builder; body kan overstyre `facts`, `requirements_model`, `template_version`. |
| `PATCH /nodes/:id` | Manuelle endringer på `data.sections`. Lager `node_revision` (`change_type=EDIT`) og resetter `status` → `PENDING_REVIEW`. |
| `POST /nodes/:id/approve` | Setter status `APPROVED`, loggfører hvem og hvorfor. |
| `POST /nodes/:id/reject` | Setter status `DRAFT`/`CHANGES_REQUESTED` + begrunnelse. |
| `GET /nodes/:id/revisions` | Paginert historikk. |
| `GET /nodes/:id/diff?from=rev&to=rev` | JSON diff mellom to revisjoner (seksjon/felt-nivå). |
| `GET /nodes/:id/snapshot/:snapshotId` | Rå snapshot for "replay". |

**Locking**: Node kan markeres `locks` i metadata (`{taskId, expiresAt}`). API sjekker før skriver.

## 5. Exporter (PDF/ZIP)
1. **Krav**:
   - Kun `APPROVED` noder, ellers returner 409.
   - Støtte to formater:
     - **ZIP**: `node.json` (metadata + data), `snapshot.json`, `segments.csv`, `provenance.json`, `files/` (tilknyttede attachments).
     - **PDF**: server-side render (Puppeteer/React PDF) basert på template + `data.sections`. Obligatorisk innholdsfortegnelse + VARSEL/notes markert.
2. **API**: `GET /nodes/:id/export?format=zip|pdf`.
3. **Sikkerhet**: Når ekstern kunde laster ned via API-key, bruk `node_api_keys` + `api_access_log`.
4. **Arkivering**: Etter eksport trigges jobb som kopierer snapshot + segment + filer til "customer bundle" S3-bucket (hot). Arkivpolicy tar seg av cold storage i fase 7.

## 6. Observability & QA
- **Metrics**: antall builder-runs, snitt auto-filled vs. needs-input, tid brukt per felt/RAG, eksport-success.
- **Logs**: `task_runs` må inneholde RAG queries, chunk ids, snapshot id.
- **Testing**:
  - Mock facts/templates → assert at snapshot inneholder alle felt.
  - Contract test for diff-endpoint (manuelle edits vs. builder).
  - Export tests (ZIP-innhold og PDF med varsel-banner).

## 7. Leveranse sjekkliste
- [ ] RAG service deployet (API + retry + caching).
- [ ] Document Builder agent + prompt i kodebasen.
- [ ] Nodes API (CRUD, diff, locks, approvals) med auth.
- [ ] Snapshot + provenance skrives i DB og eksponeres via API.
- [ ] Eksport (ZIP/PDF) med audit logging.
- [ ] Dokumentasjon oppdatert (`agent_handbook`, `ui/node-editor`, `tests/strategy.md`).
