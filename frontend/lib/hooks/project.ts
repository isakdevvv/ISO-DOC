// frontend/lib/hooks/project.ts
// Placeholder hooks for demonstration purposes

export const useTenant = () => ({ id: 'tenant123', name: 'Demo Tenant' });
export const useCurrentUser = () => ({ id: 'user456', name: 'John Doe' });
export const useProject = (projectId: string) => ({ id: projectId, name: `Project ${projectId}`, customerType: 'B2B', medium: 'CO2', ps: 10, volume: 1000, commissionedAt: '2023-01-01' });
export const useProjectNodes = (projectId: string) => [
  { id: 'node1', type: 'FDV', title: 'FDV Node 1', status: 'approved' },
  { id: 'node2', type: 'CE', title: 'CE Node 1', status: 'pending_review' },
];
export const useProjectTasks = (projectId: string) => [{ id: 'task1', title: 'Task 1' }];
export const useMaintenanceEvents = (projectId: string) => [{ id: 'event1', title: 'Event 1' }];
export const useComplianceSummary = (projectId: string) => ({ status: 'compliant' });
export const useProjectAvvik = (projectId: string) => [{ id: 'avvik1', title: 'Avvik 1' }];
export const useRuleSetsForTenant = (tenantId: string) => [{ id: 'ruleset1', name: 'Default Rules' }];
export const useProjectNodeEdges = (projectId: string) => [
    { id: 'edge1', fromNodeId: 'node1', toNodeId: 'node2', relationType: 'DEPENDS_ON' }
];
