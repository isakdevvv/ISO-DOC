# Workflow: Rule Conflict Resolution

1. **Detection**
   - Rule Engine registrerer at to regler gir motstridende outcome (strengere/løsere vs. baseline, eller kunderegel vs. EU).

2. **Logging**
   - Lag `rule_conflicts` rad med `rule_a`, `rule_b`, `conflict_type`, `requires_human_choice=true`.

3. **Notification**
   - Task opprettes for admin: `RESOLVE_RULE_CONFLICT`.
   - Copilot gir forslag: "bruk strengeste", "tillat kunderegel men flagg VARSEL", etc.

4. **Decision**
   - Admin velger via UI → genererer `rule_overrides` (scope: tenant eller prosjekt).

5. **Apply & Flag**
   - Task Orchestrator rerunner Rule Engine.
   - Dokumenter som bygger på override merkes med revisjon severity `VARSEL`.

6. **Audit**
   - Compliance report viser konflikter + valg.
   - Overrides kan rulles tilbake basert på historikk.
