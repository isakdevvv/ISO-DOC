export const projectActions = {
    createDraftProject: async (meta: any) => {
        const res = await fetch('/api/projects/draft', {
            method: 'POST',
            body: JSON.stringify(meta),
        });
        return res.json();
    },
    runRules: async (projectId: string) => {
        const res = await fetch(`/api/projects/${projectId}/run-rules`, {
            method: 'POST',
        });
        return res.json();
    },
    bulkCreateTasks: async (projectId: string, taskCodes: string[]) => {
        const res = await fetch(`/api/projects/${projectId}/tasks/bulk-create`, {
            method: 'POST',
            body: JSON.stringify({ projectId, taskCodes }),
        });
        return res.json();
    }
};

export const documentActions = {
    regenerateField: async (nodeId: string, fieldPath: string) => {
        const res = await fetch(`/api/nodes/${nodeId}/regenerate-field`, {
            method: 'POST',
            body: JSON.stringify({ fieldPath }),
        });
        return res.json();
    },
    markNeedsInput: async (nodeId: string, fieldPath: string) => {
        const res = await fetch(`/api/nodes/${nodeId}/mark-needs-input`, {
            method: 'POST',
            body: JSON.stringify({ fieldPath }),
        });
        return res.json();
    }
};

export const maintenanceActions = {
    interpretEvent: async (eventId: string) => {
        const res = await fetch(`/api/maintenance/${eventId}/interpret`, {
            method: 'POST',
        });
        return res.json();
    },
    createTasksFromEvent: async (eventId: string, taskCodes: string[]) => {
        const res = await fetch(`/api/maintenance/${eventId}/create-tasks`, {
            method: 'POST',
            body: JSON.stringify({ taskCodes }),
        });
        return res.json();
    }
};

export const checklistActions = {
    updateItem: async (instanceId: string, itemPath: string, value: any, comment?: string, photos?: string[]) => {
        const res = await fetch(`/api/checklists/${instanceId}/update-item`, {
            method: 'POST',
            body: JSON.stringify({ itemPath, value, comment, photos }),
        });
        return res.json();
    },
    submitChecklist: async (instanceId: string) => {
        const res = await fetch(`/api/checklists/${instanceId}/submit`, {
            method: 'POST',
        });
        return res.json();
    }
};

export const avvikActions = {
    createAvvik: async (data: any) => {
        const res = await fetch('/api/avvik/create', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return res.json();
    },
    updateAvvikStatus: async (avvikId: string, newStatus: string, comment?: string) => {
        const res = await fetch(`/api/avvik/${avvikId}/update-status`, {
            method: 'POST',
            body: JSON.stringify({ newStatus, comment }),
        });
        return res.json();
    }
};

export const ruleAdminActions = {
    // Placeholder for rule admin actions
};

export const navigationActions = {
    openNode: async ({ nodeId }: { nodeId: string }) => ({ navigateTo: `/projects/nodes/${nodeId}` }),
    openTask: async ({ taskId }: { taskId: string }) => ({ navigateTo: `/tasks/${taskId}` }),
    openProject: async ({ projectId }: { projectId: string }) => ({ navigateTo: `/projects/${projectId}` }),
};
