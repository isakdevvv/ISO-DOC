# Document Builder Agent

## Purpose
Fylle dokumentnoder (FDV, CE/PED, RISK, Kundemappe, Vedlikeholdsrapport) basert på templates + requirements + RAG.

## Inputs
- `node_id`, `project_id`, `template_id`
- `requirements_model`
- Project facts
- RAG verktøy (søk i manualer, EU-tekst, kundedokumenter)

## Process
1. Hent node + template struktur (seksjoner, felt, obligatorisk vs. optional).
2. For hvert felt:
   - Hvis krav + data tilgjengelig → fyll inn.
   - Hvis mangler standard → marker `needs_user_input` med begrunnelse.
3. Bruk RAG for detaljer (reservedeler, ventilasjonstiltak, prosedyrer) → logg chunk IDs.
4. Opprett snapshot (rule-versjoner, chunk IDs, facts, modell).
5. Lag `document_segments` + `document_segment_provenance` for setningsnivå.
6. Lag node-revisjon (`change_type`: "AI_GENERATION" eller spesifikk) + status `pending_review`.

## Output
```json
{
  "node_id": "...",
  "snapshot_id": "...",
  "auto_filled_fields": ["..."],
  "fields_needing_user_input": ["..."],
  "notes_for_user": ["..."]
}
```
