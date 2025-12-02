# Data Model Summary

## Core Tables
- `tenants` – selskap, lisens, arkivpolicy defaults.
- `users` – rolle (ADMIN, PROJECT_LEAD, VIEWER), tenant scope.
- `projects` – metadata (kunde, adresse, medium, PS, volum, commissioned/decommissioned, archive_policy_id).
- `component_types` – bibliotek med standardtyper (code, kategori, default facts/metadata, feltspecs).
- `components` – konkrete komponenter per prosjekt/tenant knyttet til `component_types` + nodereferanse.
- `nodes` – type, status, template, data JSON, snapshot_id.
- `node_edges` – DAG relasjoner mellom noder.
- `node_revisions` – historikk med `change_type` + `severity` (VARSEL).
- `files` – originalfil metadata.
- `file_variants` – NORMALIZED_PDF, PLAIN_TEXT, STRUCTURED_JSON, lenket til `files`.
- `maintenance_events` – performed_at/by, event_type, status, raw_payload.
- `maintenance_event_documents` – kobling mellom event og noder.
- `tasks` – arbeidsoppgaver, status, kobling til node/event.
- `task_runs` – logg per steg.
- `rule_sets`, `rules`, `rule_sources`, `rule_overrides` – regelhierarki.
- `generation_snapshots` – brukt i dokumentgenerering.
- `document_segments`, `document_segment_provenance` – seksjon/setning + kilde.
- `node_api_keys`, `api_access_log` – tilgangsstyring og rate limit logging.
- `ingestion_jobs` – logg for fil-normalisering (type, status, attempts, correlation-id, metadata).

## Facts & Requirements
- `project_facts` view/materialized view samler PS, TS, volum, medium, lokasjon, kundetype.
- `requirements_model` tabell/JSON per prosjekt (lagres av Rule Engine).

## Indexer & Constraints
- Unike `node_id + revision_number`.
- `node_edges` bør hindre sykluser (applikasjonslogikk + DB constraint på `from_node_id != to_node_id`).
- `nodes.component_id` peker på `components` slik at flere noder kan gjenbruke samme komponentfakta.
- `maintenance_events.component_id` relateres til `components` for historikkfiltrering.
- `ingestion_jobs` bruker enums (`job_type`, `status`) og beholder correlation-id + metadata per forsøk.
- `maintenance_events` triggere for auto-task når status = RECEIVED.
- `generation_snapshots` må inkludere hash av rule-set versjoner for re-spillbarhet.
