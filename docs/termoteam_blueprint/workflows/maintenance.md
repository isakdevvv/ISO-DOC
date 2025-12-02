# Workflow: Maintenance Intake & Documentation Update

1. **Event mottak**
   - API/Web/Mobil sender payload + vedlegg.
   - Maintenance Ingestion logger event (`status=RECEIVED`) + filer (original + varianter).

2. **Node linking**
   - Finn komponentnode/MAINTENANCE_HISTORY → `maintenance_event_documents`.

3. **Auto tasks**
   - Opprett `INTERPRET_MAINTENANCE_REPORT` + `UPDATE_FDV_AFTER_MAINTENANCE` (+ ev. compliance task).

4. **Tolking**
   - Task Orchestrator kaller Document Builder for vedlikeholdsrapport → node `MAINTENANCE_REPORT` i `pending_review`.

5. **FDV/CE oppdatering**
   - Hvis event påvirker tekniske data → Document Builder lager ny revisjon med `change_type=MAINTENANCE_UPDATE`.

6. **Godkjenning**
   - Bruker går gjennom tasks → approver, eller flagger for mer info.

7. **Timeline & varsel**
   - Timeline får nye entries: “maintenance event”, “FDV revision”.
   - Hvis info mangler → event holdes i `NEEDS_REVIEW` og vises i maintenance inbox.
