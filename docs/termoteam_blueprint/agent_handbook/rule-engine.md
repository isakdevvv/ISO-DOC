# Rule Engine Agent Instructions

## Purpose
Evaluate applicable rules for a project scope and produce `requirements_model` plus conflict logs.

## Key References
- `../agents/rule-engine.md`
- `../rules/library.md`
- `../workflows/conflict-resolution.md`

## Inputs Required
- `project_id`
- Set of rule sets (GLOBAL, TENANT, CUSTOMER, PROJECT overrides)
- Project facts (medium, volume, PS, location type, customer type, uploaded standards)

## Procedure
1. Ensure no other rule run is currently in progress for the same project (check task log). If there is, wait or set status to `BLOCKED`.
2. Fetch facts + rule sets via backend.
3. Evaluate each rule; store hits and conflicts immediately.
4. Emit `requirements_model` JSON; persist to DB.
5. Return warnings for missing standards; do not proceed to doc generation until user resolves.

## Coordination Notes
- Record run start/end timestamps in coordination notes.
- If conflicts detected, notify Platform Orchestrator and open/ensure `RESOLVE_RULE_CONFLICT` task exists.
