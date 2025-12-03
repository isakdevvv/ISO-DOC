# TermoTeam End-to-End Demo Script
## Scenario: Maintenance Event triggers FDV Update & Customer Folder Generation

### Actors
- **Montør (Mobile App/API):** Performs service.
- **Kontrollør (Web Portal):** Reviews and approves documentation.
- **Copilot (AI):** Interprets data, updates nodes, generates text.

### Step 1: Maintenance Event (API)
**Action:** Montør submits a service report via API.
**Payload:**
```json
POST /api/maintenance/event
{
  "projectExternalId": "REMA_FANTOFT_CO2",
  "eventType": "PERIODIC_SERVICE",
  "performedBy": "Hansen",
  "report": { "summary": "Årlig service. Byttet filter F-101." },
  "attachments": [{ "url": "photo_filter.jpg" }]
}
```
**System Reaction:**
- `maintenance_events` record created.
- `MAINTENANCE_HISTORY` node updated.
- Task `INTERPRET_MAINTENANCE` created.

### Step 2: AI Interpretation (Copilot)
**Action:** Kontrollør opens the project and sees the new task.
**Copilot Action:**
- Reads the event and attachment.
- Identifies "Filter F-101" as a component.
- Updates `MAINTENANCE_REPORT` node with structured data.
- Flags `FDV` node as "Needs Revision" because a component was changed/serviced.

### Step 3: FDV Update (Node Copilot)
**Action:** Kontrollør clicks "Update FDV" task.
**Copilot Action:**
- Generates a new revision of the FDV document.
- Updates the "Service History" section.
- Updates the "Consumables" list if the filter type changed.
**User Action:** Kontrollør reviews the diff and clicks "Approve".

### Step 4: Customer Folder Generation (Project Copilot)
**Action:** Project Copilot suggests: "FDV is updated. Generate new Customer Folder?"
**User Action:** Click "Generate".
**System Reaction:**
- Compiles latest FDV, Service Report, and Certificates.
- Creates a `CUSTOMER_FOLDER` node (ZIP/PDF).
- Logs the export in `node_revisions`.

### Outcome
- Full traceability from the API call to the final customer PDF.
- No manual copy-pasting.
- Compliance ensured.
