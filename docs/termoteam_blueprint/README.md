# TermoTeam Compliance Platform Blueprint

This blueprint aggregates every decision from the discovery conversation so an AI agent (or human team) can implement the TermoTeam documentation platform end-to-end. Treat each file in this folder tree as a contract: it encodes scope, architecture, workflows, prompts, UI plans, and guardrails.

## Contents
- `vision.md` – business goals, phased rollout, archiving policies.
- `use-cases.md` – detailed workflows for TermoTeam and their customers.
- `architecture/` – system, data, and document-builder diagrams/specs.
- `agents/` – prompts + responsibilities for every agent (or Copilot persona).
- `workflows/` – operational procedures (new project, maintenance, conflicts, traceability).
- `ui/` – screens, CopilotKit state/actions/prompts, and key components.
- `tasks/` – reusable task templates and inbox behavior.
- `rules/` – licensing + rule hierarchy and override logic.
- `templates/` – document template schema & versioning.
- `maintenance/` – API contracts + history node spec.
- `api-gateway.md` – API key scopes, rate limits, auditing.
- `roadmap.md` – suggested build order.
- `tests/strategy.md` – verification approach.

Use this package as the single source of truth when building agents, backend services, and UI flows.
