"use client";

import React from "react";
import { TermoTeamCopilotProvider } from "@/lib/copilot/useTermoTeamCopilot";
import { ProjectLayout } from "@/components/project/ProjectLayout";
import { useTenant, useCurrentUser, useProject, useProjectNodes, useProjectTasks, useMaintenanceEvents, useComplianceSummary, useProjectAvvik, useRuleSetsForTenant, useProjectNodeEdges } from "@/lib/hooks/project"; // Import mock hooks

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  // These hooks are just pseudo – here you fetch from Supabase/React Query/etc.
  const tenant = useTenant();
  const user = useCurrentUser();
  const project = useProject(projectId);
  const nodes = useProjectNodes(projectId);
  const tasks = useProjectTasks(projectId);
  const maintenanceEvents = useMaintenanceEvents(projectId);
  const compliance = useComplianceSummary(projectId);
  const avvik = useProjectAvvik(projectId);
  const ruleSets = useRuleSetsForTenant(tenant?.id);

  // UI-state – e.g. selected node in node-list
  const [selectedNode, setSelectedNode] = React.useState<any | undefined>();

  return (
    <TermoTeamCopilotProvider
      state={{
        tenant,
        user,
        project,
        nodes,
        tasks,
        maintenanceEvents,
        compliance,
        avvik,
        ruleSets,
        selectedNode,
      }}
    >
      <ProjectLayout
        project={project}
        nodes={nodes}
        tasks={tasks}
        maintenanceEvents={maintenanceEvents}
        compliance={compliance}
        avvik={avvik}
        onSelectNode={setSelectedNode}
      />
      {/* Chatpanel renders automatically inside provider */}
    </TermoTeamCopilotProvider>
  );
}
