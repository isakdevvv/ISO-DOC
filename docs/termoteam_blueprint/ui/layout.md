# UI Layout & Screens

## Global Shell
- Sidebar nav: Dashboard, Projects, Tasks, Maintenance, Rules, Templates, Admin.
- Topbar: prosjektvelger + CopilotKit quick input + user menu.
- Right panel: Copilot chat (toggleable) viser kontekstsensitive forslag.

## Screens
1. **Dashboard** – cards for prosjekter, tasks, maintenance alerts, compliance status.
2. **Project Workspace**
   - Tabs: Overview, Nodes, DAG, Files, Maintenance, Timeline.
   - Overview: project meta, quick actions, compliance health, Copilot suggestions.
3. **Node Editor**
   - Left: metadata + actions (approve/reject, open snapshot).
   - Center: template-driven form (seksjoner, felt, status chips).
   - Right: provenance panel + field suggestions.
4. **DAG View**
   - React Flow canvas. Node colors by status. Click → open node.
5. **Task Inbox**
   - List + filters. Inspector panel viser steps, affected nodes, approvals needed.
6. **Maintenance Center**
   - Timeline, event inbox, attachments viewer, quick tasks for updates.
7. **Rule Studio**
   - Rule list + editor, conflict viewer, simulation tool.
8. **Template Studio**
   - Drag/drop sections/fields, versioning timeline, preview.
9. **Admin Control Tower**
   - API keys, archive policies, tenant stats, node-sharing overview.
