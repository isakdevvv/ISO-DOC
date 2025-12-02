# Copilot Chat Panel Integration (Next.js + CopilotKit)

## Basic Setup
```tsx
import { CopilotProvider, useCopilotChatPanel } from "@copilotkit/react-ui";
import { copilotActions } from "@/lib/copilot/actions";
import { useProjectCopilotState } from "@/lib/useProjectCopilotState";
import { PROJECT_ORCHESTRATOR_PROMPT } from "@/lib/copilot/prompts/project-orchestrator";

export default function ProjectPage() {
  const state = useProjectCopilotState(...);
  const ChatPanel = useCopilotChatPanel();

  return (
    <CopilotProvider config={{ systemMessage: PROJECT_ORCHESTRATOR_PROMPT, actions: copilotActions, state }}>
      <ProjectLayout ... />
      <ChatPanel className="fixed right-4 bottom-4 w-96" />
    </CopilotProvider>
  );
}
```

## Per-View Customization
- Project overview → `PROJECT_ORCHESTRATOR_PROMPT`
- Node editor → `NODE_PROMPT`
- Maintenance view → `MAINTENANCE_PROMPT`
- Rule studio → `RULE_ADMIN_PROMPT`

Wrap hver side i egen `CopilotProvider` slik at staten er spesifikk for konteksten.

## UX Tips
- Vis “Suggested actions” som knapper i chat-panelet (CopilotKit støtter structured response rendering).
- Når agent foreslår `openNode`, kall `router.push` med `navigateTo`.
- Logg Copilot-svar i analytics for å se hvilke flows som brukes mest.
