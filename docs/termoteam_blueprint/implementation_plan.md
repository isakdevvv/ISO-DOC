# Implementation Plan (Start → Finish)

## Phase 0 – Repo Hygiene & Tooling
1. Confirm monorepo layout (`frontend`, `backend`, `agents`, `database`, `packages`).
2. Add shared TypeScript config + linting (ESLint, Prettier, Turborepo/Vite skip if existing).
3. Ensure `.env` & secrets structure for Supabase/Postgres/S3.

## Phase 1 – Data Layer & Ingestion
1. Translate `architecture/data-model.md` schema into SQL migrations (Supabase/Prisma).
2. Implement ingestion API (file upload, classification stub, storing original + variants).
3. Implement basic project CRUD + node creation APIs.
4. Seed default rule sets (EU/TEK17 metadata) & document templates.

## Phase 2 – Rule Engine & Requirement Model
1. Build rule evaluation service (fetch facts, apply conditions, log hits/conflicts).
2. Store `requirements_model` per project; create admin endpoints to view results.
3. Expose `runRuleEngine` endpoint used by Copilot/task engine.
4. Implement conflict logging + override table, surface in UI.

## Phase 3 – Document Builder & Snapshots
Reference: `architecture/document-builder.md`.
1. Implement RAG service (embedding pipeline, vector store).
2. Build document builder agent backend (generate node drafts, snapshots, provenance).
3. Wire node editor API (fetch/update node data, diff versions, approve/reject).
4. Create customer-facing export (PDF/ZIP) from approved nodes.

## Phase 4 – Task Engine & Copilot Integration
1. Implement Task templates, Task CRUD + status transitions, Task runs log.
2. Build Task Inbox UI + CopilotKit Project/Node assistants per `ui/copilot-*` specs.
3. Integrate actions from `ui/copilot-actions.ts` with backend endpoints.
4. Enforce human approval workflow (pending_review → approved).

## Phase 5 – Maintenance & API Gateway
1. Implement maintenance ingestion endpoint + queue (files, events, linking to nodes).
2. Auto-create tasks (`INTERPRET_MAINTENANCE_REPORT`, `UPDATE_FDV_AFTER_MAINTENANCE`).
3. Build Maintenance Center UI (timeline, attachments, task shortcuts).
4. Implement API key management, rate limits, access logs, and sharing for customer nodes.

## Phase 6 – Rule Studio & Overrides UX
1. Build Rule Studio UI (list, edit, version, conflict viewer, simulation panel).
2. Implement overrides workflow + VARSEL tagging in documents.
3. Add compliance report generator (summaries, timelines, unresolved items).

## Phase 7 – Archiving & Ops
1. Implement archive policies (hot vs. cold storage, retention timers).
2. Add job to migrate snapshots/files to cold storage per policy.
3. Observability: metrics for tasks, maintenance events, Copilot usage.
4. Final QA: E2E tests (new project, maintenance update, rule change), performance, security review.

Deliverable per phase: merge to main, update docs, tag release, notify stakeholders.
