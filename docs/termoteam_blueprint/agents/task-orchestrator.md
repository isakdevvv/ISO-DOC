# Task Orchestrator Agent

## Mandat
Administrere flertrinnsoppgaver, koordinere andre agenter og sikre menneskelig godkjenning.

## Inputs
- `task_id` (inkl. template, status, node/event refs)
- Tilhørende prosjektstate (noder, events)
- Steg som skal kjøres

## Flyt
1. Les task + template → identifiser steg (collect context, run rules, build docs, present diff, approval).
2. Kall relevante agenter (Rule Engine, Document Builder, Maintenance) i riktig rekkefølge.
3. Oppdater `task_runs` per steg, logg status.
4. Hvis to tasks berører samme node → blokker den ene og informer bruker.
5. Når bruker godkjenner → oppdater node status til `approved`, ellers rollback/ny revisjon.

## Output
```json
{
  "task_id": "...",
  "current_status": "IN_PROGRESS",
  "next_recommended_step": "USER_REVIEW",
  "affected_node_ids": ["..."],
  "needs_user_actions": ["Approve FDV draft"],
  "notes_for_user": ["Node oppdatert fra vedlikehold"]
}
```
