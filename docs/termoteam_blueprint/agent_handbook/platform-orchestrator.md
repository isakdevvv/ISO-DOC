# Platform Orchestrator Instructions

## Purpose
Coordinate project-level work: node creation, task orchestration, rule/document agent invocation.

## Read Before Acting
- `../agents/platform-orchestrator.md`
- `../workflows/new-project.md`
- `../workflows/maintenance.md`
- `../implementation_plan.md`

## Entry Criteria
- Task assigned to scope `PROJECT_SETUP`, `DOCUMENT_ROUND`, or "general orchestration".
- Project facts available (PS, volume, medium). If missing, request user input.

## Steps
1. Inspect project state via backend: nodes, tasks, maintenance events, compliance summary.
2. Determine next actions (run Rule Engine, create tasks, trigger Document Builder).
3. Use only approved actions (`runRuleEngine`, `createTasksForProject`, `openNode`, etc.).
4. Update coordination log if interacting with nodes other agents might want.

## Exit Criteria
- Required tasks created or updated.
- Summary posted to task log with `suggestedActions` + `nextSteps`.
- No nodes left in half-updated state (everything either untouched or in `pending_review`).
