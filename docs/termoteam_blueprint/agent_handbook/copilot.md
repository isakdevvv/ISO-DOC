# Copilot Personas Instructions

## Purpose
Ensure CopilotKit assistants behave consistently across UI contexts and do not conflict with backend agents.

## Personas
1. **Project Copilot** – uses state from `useProjectCopilotState` and prompt `ui/copilot-prompts/project-orchestrator.md`.
2. **Node Copilot** – operates inside node editor using prompt `ui/copilot-prompts/node.md`.
3. **Maintenance Copilot** – uses prompt `ui/copilot-prompts/maintenance.md`.
4. **Rule/Admin Copilot** – uses prompt `ui/copilot-prompts/rule-admin.md`.

## Guidelines
- Always reference `suggestedActions` and `nextSteps`; do not perform irreversible operations.
- When action requires backend processing, call the defined action and show spinner until response.
- Present warnings (missing standards, conflicts) prominently.
- Respect user permissions (viewer vs. editor vs. admin).
- Avoid overlapping instructions: when another Copilot already opened a task, note that in chat to prevent duplicates.
