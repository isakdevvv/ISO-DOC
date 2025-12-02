import { useMemo } from "react";

export function useProjectCopilotState({
  tenant,
  project,
  nodes,
  tasks,
  maintenanceEvents,
  compliance,
}: {
  tenant: any;
  project: any;
  nodes: any[];
  tasks: any[];
  maintenanceEvents: any[];
  compliance: any;
}) {
  return useMemo(() => ({
    tenantId: tenant?.id,
    projectId: project?.id,
    projectMeta: {
      name: project?.name,
      address: project?.address,
      customerType: project?.customerType,
      medium: project?.medium,
      ps: project?.ps,
      volume: project?.volume,
      commissionedAt: project?.commissionedAt,
      status: project?.status,
    },
    nodesSummary: nodes?.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      status: n.status,
      templateId: n.templateId,
    })),
    tasksSummary: tasks?.map((t) => ({
      id: t.id,
      code: t.code,
      status: t.status,
      nodeId: t.nodeId,
      maintenanceEventId: t.maintenanceEventId,
    })),
    maintenanceSummary: maintenanceEvents?.map((m) => ({
      id: m.id,
      performedAt: m.performedAt,
      performedBy: m.performedBy,
      eventType: m.eventType,
      status: m.status,
      nodeId: m.nodeId,
    })),
    complianceSummary: {
      health: compliance?.health ?? "unknown",
      missingDocuments: compliance?.missingDocuments ?? [],
      unresolvedConflicts: compliance?.unresolvedConflicts ?? [],
    },
  }), [tenant, project, nodes, tasks, maintenanceEvents, compliance]);
}
