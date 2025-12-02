export const copilotActions = {
  createProjectDraft: async (meta: any) =>
    fetch("/api/projects/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meta),
    }).then((r) => r.json()),

  runRuleEngine: async ({ projectId }: { projectId: string }) =>
    fetch(`/api/rules/run?projectId=${projectId}`, { method: "POST" }).then((r) =>
      r.json()
    ),

  createDefaultNodes: async ({ projectId }: { projectId: string }) =>
    fetch(`/api/nodes/create-default?projectId=${projectId}`, {
      method: "POST",
    }).then((r) => r.json()),

  createTasksForProject: async ({
    projectId,
    taskCodes,
  }: {
    projectId: string;
    taskCodes: string[];
  }) =>
    fetch(`/api/tasks/bulk-create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, taskCodes }),
    }).then((r) => r.json()),

  openNode: ({ nodeId }: { nodeId: string }) => ({
    navigateTo: `/projects/nodes/${nodeId}`,
  }),

  openTask: ({ taskId }: { taskId: string }) => ({
    navigateTo: `/projects/tasks/${taskId}`,
  }),

  regenerateField: async ({ nodeId, fieldPath }: { nodeId: string; fieldPath: string }) =>
    fetch(`/api/nodes/${nodeId}/regenerate-field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldPath }),
    }).then((r) => r.json()),

  markFieldNeedsInput: async ({
    nodeId,
    fieldPath,
  }: {
    nodeId: string;
    fieldPath: string;
  }) =>
    fetch(`/api/nodes/${nodeId}/mark-needs-input`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldPath }),
    }).then((r) => r.json()),

  createMaintenanceTasks: async ({
    eventId,
    taskCodes,
  }: {
    eventId: string;
    taskCodes: string[];
  }) =>
    fetch(`/api/maintenance/${eventId}/create-tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskCodes }),
    }).then((r) => r.json()),

  createRule: async ({
    ruleSetId,
    ruleDefinition,
  }: {
    ruleSetId: string;
    ruleDefinition: any;
  }) =>
    fetch(`/api/rules/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleSetId, ruleDefinition }),
    }).then((r) => r.json()),

  updateRule: async ({
    ruleId,
    ruleDefinition,
  }: {
    ruleId: string;
    ruleDefinition: any;
  }) =>
    fetch(`/api/rules/${ruleId}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleDefinition }),
    }).then((r) => r.json()),
};
