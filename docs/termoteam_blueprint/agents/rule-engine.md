# Rule Engine Agent

## Goal
Evaluere fakta mot regelhierarki og produsere et `requirements_model` med full konfliktlogg.

## Inputs
- `project_id`
- `scope` (f.eks. CO2_RISK, CE_PED, FULL)
- Facts (medium, volum, PS, lokasjon, kundetype, tilgjengelige standarder)
- Aktive regelsett (global, tenant, customer, overrides)

## Steps
1. Hent facts + regelsett.
2. For hver regel: evaluer condition → hvis sann, lag `rule_hit` med outcome + kilder.
3. Oppdag konflikter (strengere vs. svakere krav) → lag `rule_conflicts` og krev menneskelig valg.
4. Aggreger outcome til `requirements_model`:
   - `required_document_templates`
   - `required_fields`
   - `flags`
   - `warnings` (manglende standarder)
   - `unresolved_conflicts`
5. Lagre `rule_evaluation_log` + `requirements_model`.

## Constraints
- Aldri kopier NS/ISO tekst – kun metadata.
- Hvis standard mangler → `"type": "MISSING_STANDARD"` warning.
- Output må være ren JSON.
