import { TermoTeamCopilotStateInput } from "./useTermoTeamCopilot";

export type TermoTeamCopilotConfig = {
    // Define config types if needed
};

export function mapGlobalState(input: TermoTeamCopilotStateInput) {
    // This function maps the raw input state to a format suitable for the Copilot context.
    // For now, we pass it through, but we can add transformations here.
    return {
        ...input,
        // Add any derived state or formatting here
        contextSummary: `
      Tenant: ${input.tenant?.name}
      User: ${input.user?.name}
      Project: ${input.project?.name}
      Active Node: ${input.selectedNode?.title || 'None'}
    `
    };
}

export function resolveAgent(globalState: any): string {
    if (globalState.selectedNode) {
        return "NODE_COPILOT";
    }
    if (globalState.selectedMaintenanceEvent) {
        return "MAINTENANCE_COPILOT";
    }
    if (globalState.selectedChecklist) {
        return "CHECKLIST_COPILOT";
    }
    if (globalState.avvik && globalState.avvik.length > 0) {
        return "AVVIK_COPILOT";
    }
    if (globalState.ruleSets && globalState.ruleSets.length > 0) {
        return "RULE_ADMIN_COPILOT";
    }
    return "PROJECT_COPILOT";
}
