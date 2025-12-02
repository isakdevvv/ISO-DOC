# Roadmap (Suggested Sprints)

## Sprint 1 – Foundations
- Set up monorepo, DB schema (tenants/projects/nodes/files/tasks/rules).
- Basic ingestion (file upload, classification, normalization pipeline stub).
- Project dashboard + CopilotKit skeleton.

## Sprint 2 – Rule Engine & Templates
- Implement rule evaluation pipeline (global + tenant rules, requirement model storage).
- Build template studio (basic version) + FDV/CE/Risk templates.
- Task engine MVP (generate FDV/CE/Risk tasks, manual approvals).

## Sprint 3 – Document Builder & DAG UI
- RAG service + embeddings.
- Document builder agent + snapshots/provenance storage.
- Node editor UI, DAG viewer, timeline.

## Sprint 4 – Maintenance & API Gateway
- Maintenance API ingestion + auto tasks.
- Maintenance center UI + service history nodes.
- API key management, rate limiting, external sharing.

## Sprint 5 – Copilot Expansion & Compliance Reporting
- CopilotKit deep integration (per view prompts, actions wired).
- Compliance report generation + export.
- Archive policy management + hot/cold storage automation.

## Sprint 6 – Rule Studio & Overrides
- Full rule editing/testing UI.
- Conflict detection/resolution workflow.
- Automatic re-evaluation when rules change.
