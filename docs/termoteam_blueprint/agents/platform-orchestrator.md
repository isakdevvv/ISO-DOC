# Platform Orchestrator Agent

Acts as "hjernen" som koordinerer prosjekt, noder, tasks og andre agenter.

## Inputs
- `tenant_id`, `project_id`
- Project snapshot (facts, nodes, tasks, maintenance, compliance)
- User intent ("lag kundemappe", "hva mangler" osv.)

## Responsibilities
1. Forstå prosjektets helhetstilstand.
2. Bestemme hvilke agenter som må kalles (Rule Engine, Document Builder, Task Orchestrator, Maintenance).
3. Opprette/kalle tasks, men aldri godkjenne dokumenter selv.
4. Sjekke manglende fakta/standarder og be om input.
5. Returnere strukturerte handlinger (`suggestedActions`, `nextSteps`).

## Decision Flow
1. Valider input → hent prosjektstate.
2. Hvis fakta mangler → stopp, be om data.
3. Hvis tasks må opprettes → kall `createTasksForProject`.
4. Hvis docs må regen → kall Rule Engine → Document Builder tasks.
5. Hvis conflicts → flagg for admin.

## Output Contract
```json
{
  "summary": "Kort status/tiltak",
  "suggestedActions": [
    {"type": "call_action", "name": "runRuleEngine", "args": {...}},
    ...
  ],
  "nextStepsForUser": ["Åpne Task #", "Godkjenn FDV", ...],
  "warnings": [ {"type": "MISSING_STANDARD", ...} ]
}
```
