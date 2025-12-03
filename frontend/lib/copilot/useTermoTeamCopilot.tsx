"use client";

import React, { PropsWithChildren, useMemo } from "react";
import { CopilotProvider, useCopilotChatPanel } from "@copilotkit/react-ui";
import { TermoTeamCopilotConfig, mapGlobalState, resolveAgent } from "./termoteam-copilot-config";
import {
  projectActions,
  documentActions,
  maintenanceActions,
  checklistActions,
  avvikActions,
  ruleAdminActions,
  navigationActions,
} from "./actions";
import {
  PROJECT_ORCHESTRATOR_PROMPT,
  NODE_COPILOT_PROMPT,
  MAINTENANCE_COPILOT_PROMPT,
  CHECKLIST_COPILOT_PROMPT,
  AVVIK_COPILOT_PROMPT,
  RULE_ADMIN_PROMPT,
} from "./prompts";

/**
 * Typen på all state vi gir til Copilot.
 * Du kan utvide denne etter hvert som du får mer felt.
 */
export type TermoTeamCopilotStateInput = {
  tenant: any;
  user: any;
  project?: any;
  nodes?: any[];
  tasks?: any[];
  maintenanceEvents?: any[];
  compliance?: any;
  checklist?: any[]; // hvis du har global oversikt
  avvik?: any[];
  ruleSets?: any[];
  selectedNode?: any;
  selectedChecklist?: any;
  selectedMaintenanceEvent?: any;
};

/**
 * Hook som samler state → globalState, bestemmer agent,
 * og gir deg alt du trenger for å mate CopilotProvider.
 */
export function useTermoTeamCopilot(stateInput: TermoTeamCopilotStateInput) {
  const globalState = useMemo(
    () =>
      mapGlobalState({
        tenant: stateInput.tenant,
        user: stateInput.user,
        project: stateInput.project,
        nodes: stateInput.nodes,
        tasks: stateInput.tasks,
        maintenanceEvents: stateInput.maintenanceEvents,
        compliance: stateInput.compliance,
        checklist: stateInput.checklist,
        avvik: stateInput.avvik,
        ruleSets: stateInput.ruleSets,
        selectedNode: stateInput.selectedNode,
        selectedChecklist: stateInput.selectedChecklist,
        selectedMaintenanceEvent: stateInput.selectedMaintenanceEvent,
      }),
    [stateInput]
  );

  const agentId = resolveAgent(globalState);

  // Velg riktig prompt + actions basert på agentId
  const { systemMessage, actions } = useMemo(() => {
    switch (agentId) {
      case "NODE_COPILOT":
        return {
          systemMessage: NODE_COPILOT_PROMPT,
          actions: {
            ...documentActions,
            ...navigationActions,
          },
        };
      case "MAINTENANCE_COPILOT":
        return {
          systemMessage: MAINTENANCE_COPILOT_PROMPT,
          actions: {
            ...maintenanceActions,
            ...projectActions,
          },
        };
      case "CHECKLIST_COPILOT":
        return {
          systemMessage: CHECKLIST_COPILOT_PROMPT,
          actions: {
            ...checklistActions,
            ...avvikActions,
          },
        };
      case "AVVIK_COPILOT":
        return {
          systemMessage: AVVIK_COPILOT_PROMPT,
          actions: {
            ...avvikActions,
            ...navigationActions,
          },
        };
      case "RULE_ADMIN_COPILOT":
        return {
          systemMessage: RULE_ADMIN_PROMPT,
          actions: {
            ...ruleAdminActions,
          },
        };
      case "PROJECT_COPILOT":
      default:
        return {
          systemMessage: PROJECT_ORCHESTRATOR_PROMPT,
          actions: {
            ...projectActions,
            ...navigationActions,
          },
        };
    }
  }, [agentId]);

  return {
    globalState,
    systemMessage,
    actions,
    agentId,
  };
}

/**
 * Hoved-provider du kan bruke rundt side-layouts.
 * Denne binder sammen:
 *  - state (fra props)
 *  - agent-resolving
 *  - rett systemprompt + actions
 */
export function TermoTeamCopilotProvider(
  props: PropsWithChildren<{ state: TermoTeamCopilotStateInput }>
) {
  const { globalState, systemMessage, actions } = useTermoTeamCopilot(props.state);
  const ChatPanel = useCopilotChatPanel();

  return (
    <CopilotProvider
      config={{
        systemMessage,
        state: globalState,
        actions,
      }}
    >
      {props.children}
      {/* Fast docket chatpanel til høyre */}
      <div className="fixed top-16 right-4 bottom-4 w-[360px] z-40">
        <ChatPanel />
      </div>
    </CopilotProvider>
  );
}

/**
 * Enkel komponent hvis du vil rendre chatpanelet manuelt andre steder.
 */
export function TermoTeamCopilotChatPanel() {
  const ChatPanel = useCopilotChatPanel();
  return (
    <div className="fixed top-16 right-4 bottom-4 w-[360px] z-40">
      <ChatPanel />
    </div>
  );
}