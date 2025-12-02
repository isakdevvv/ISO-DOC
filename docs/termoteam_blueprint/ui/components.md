# UI Components (Shadcn + Custom)

## Core Primitives
- `Card`, `Badge`, `Tabs`, `Popover`, `Command`, `Dialog`, `Sheet` – fra shadcn/ui.
- `DataTable` – for nodes/tasks/maintenance listing.
- `Timeline` – custom list med ikoner/status.

## Custom Components
- `ProjectSummaryCard`
- `NodeStatusBadge`
- `NodeFormSection`
- `ProvenancePanel` (liste av rules/chunks per setning)
- `TaskStepList`
- `MaintenanceEventCard`
- `ComplianceHealthIndicator`
- `DagCanvas` (React Flow wrapper)
- `CopilotSuggestionList` (knapper fra agentens `suggestedActions`)

## Editor Widgets
- Template-driven `Field` komponenter (text, number, select, rich text, attachments)
- `DiffViewer` (viser forrige vs. ny verdi)
- `VarSelBanner` – vises når severity=VARSEL

Bruk shadcn theme tokens for konsistens og dark/light mode.
