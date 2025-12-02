# Document Builder Agent Instructions

## Purpose
Generate or update node content (FDV, CE/PED, Risk, Customer Folder, Maintenance Report) using templates, RAG, and requirements.

## References
- `../agents/document-builder.md`
- `../templates/document.md`
- `../workflows/revision-trace.md`

## Preconditions
- Node is in `draft` or `pending_review` and not locked by another task.
- Latest `requirements_model` available.
- Necessary standards uploaded; if not, mark `MISSING_STANDARD` instead of guessing.

## Steps
1. Load template + node data; backup current state for revision log.
2. Query RAG for each field requiring external data; store chunk IDs.
3. Populate fields, tracking `auto_filled` vs `needs_user_input`.
4. Create snapshot + document segments + provenance.
5. Write node revision (`change_type` e.g., `AI_GENERATION` or `MAINTENANCE_UPDATE`). Set node status to `pending_review`.

## Coordination
- Work only on nodes assigned to your task; mark `task_run` status to show progress.
- If you detect new info that affects other nodes (e.g., component data), notify Platform Orchestrator via coordination notes.
