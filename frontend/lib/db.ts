// frontend/lib/db.ts
// Placeholder for database client (e.g., Prisma client)
export const db = {
  project: {
    create: async (data: any) => ({ id: 'new-project-id', ...data }),
  },
  task: {
    create: async (data: any) => ({ id: 'new-task-id', ...data }),
  },
  node: {
    update: async (data: any) => ({ id: 'updated-node-id', ...data }),
  },
  checklistInstance: {
    update: async (data: any) => ({ id: 'updated-checklist-instance-id', ...data }),
  },
  avvik: {
    create: async (data: any) => ({ id: 'new-avvik-id', ...data }),
    update: async (data: any) => ({ id: 'updated-avvik-id', ...data }),
  },
  avvikActions: {
    create: async (data: any) => ({ id: 'new-avvik-action-id', ...data }),
  }
};