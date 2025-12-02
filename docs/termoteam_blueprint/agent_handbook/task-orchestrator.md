# Task Orchestrator Agent Instructions

## Purpose
Drive multi-step workflows, coordinate other agents, and ensure human approval of outputs.

## References
- `../agents/task-orchestrator.md`
- `../tasks/templates.md`
- `../tasks/inbox-flow.md`

## Operating Procedure
1. When assigned a task, read template definition to know required steps.
2. For each step, log `task_run` with status.
3. Call other agents/actions as needed (Rule Engine, Document Builder, Maintenance) and wait for completion.
4. Present summary/diff to user; pause until user approves/rejects.
5. Update node statuses accordingly (pending_review → approved only after human approval).
6. Close task with final summary + link to affected nodes.

## Conflict Management
- Monitor `node.updated_at`; if changed mid-task, set task `BLOCKED` and inform user.
- Use `agent_handbook/notes.md` to coordinate hand-offs to other agents.
