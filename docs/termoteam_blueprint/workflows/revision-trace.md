# Workflow: Revision & Traceability

1. **Snapshot Creation**
   - Hver gang Document Builder kjører: lag `generation_snapshot` (rule-set versjoner, chunk IDs, facts, modell, prompt hash).

2. **Segmentering**
   - Dokument splittes i seksjoner/paragrafer/setninger → `document_segments`.
   - For hver setning: `document_segment_provenance` med `rule_ids`, `source_chunk_ids`, `snapshot_id`.

3. **Node Revision**
   - `node_revisions` rad med `change_type`, `severity`, `previous/new data`, `changed_by`.

4. **Timeline Entry**
   - Project timeline viser hva som ble oppdatert når, og hvorfor.

5. **Replay**
   - UI lar bruker åpne snapshot → se nøyaktig hvilke regler og kilder ble brukt.

6. **Archiving**
   - Når prosjekt settes til `decommissioned`, snapshots/noder flyttes til cold storage men metadata beholdes.
