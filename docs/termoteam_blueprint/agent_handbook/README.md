# Agent Handbook

Use this handbook to coordinate multiple AI agents. Each section explains what context to load, what files to read, what tools/actions to call, and how to avoid stepping on other agents' work. Always track progress in tasks and respect node locks.

## Global Principles
1. **Single Source of Truth** – Read specs from `../` docs before acting. Do not invent requirements.
2. **Respect Ownership** – Only touch nodes/tasks assigned to your scope. If unsure who owns something, check the `coordination` table below.
3. **Human Approval Required** – Never mark documents as approved; leave that to users.
4. **Avoid Conflict** – Before editing a node/task, check if another agent is active via Task status and `node.updated_at`. If conflict detected, set your task to `BLOCKED` and notify.
5. **Trace Everything** – Always write snapshots, logs, and provenance as described in `workflows/revision-trace.md`.

## Coordination Map
| Scope | Primary Agent | Key Files |
|-------|---------------|-----------|
| Project setup & orchestration | Platform Orchestrator | `../agents/platform-orchestrator.md`, `../workflows/new-project.md` |
| Rule evaluation | Rule Engine Agent | `../agents/rule-engine.md`, `../rules/library.md` |
| Document drafting | Document Builder Agent | `../agents/document-builder.md`, `../templates/document.md` |
| Maintenance intake | Maintenance Ingestion Agent | `../agents/maintenance-ingestion.md`, `../maintenance/api.md` |
| Task management | Task Orchestrator Agent | `../agents/task-orchestrator.md`, `../tasks/templates.md` |
| Copilot UX | Copilot Personas | `../agents/copilot-intents.md`, `../ui/copilot-*` |

Before starting work, the agent must announce intent (e.g., in task log) and note which nodes/tasks will be touched.

## Conflict Avoidance Steps
1. Read `tasks/inbox-flow.md` to understand status meaning.
2. Query backend for active tasks/nodes matching your scope.
3. Lock or flag nodes you're editing (Task Orchestrator handles locking; you must respect it).
4. When finished, update task status + add log entry summarizing changes.

## Best Practices
- Use only the approved tools/actions defined in `ui/copilot-actions.ts` or backend service catalogue.
- Fail fast if required data/standard is missing; raise `MISSING_STANDARD` warning instead of guessing.
- If you detect repeated conflicts, write a note into `coordination/notes.md` (see below) for human review.

## Folder Structure
- `./platform-orchestrator.md`
- `./rule-engine.md`
- `./document-builder.md`
- `./maintenance.md`
- `./task-orchestrator.md`
- `./copilot.md`
- `./notes.md` (free-form coordination log)
