import { useMemo } from 'react';

import type { Node, Project, Task } from '@/lib/api';

export const PROJECT_COPILOT_PROMPT = [
    'You are the Global Project Copilot for the TermoTeam documentation platform.',
    'Always explain the current project status, highlight missing documentation or data, ',
    'and trigger flows (project creation, component editor, uploads, rule engine) only when asked.',
    'Never approve documents on behalf of the user – guide them to the correct screen instead.',
].join(' ');

export interface ProjectComponentSummary {
    id: string;
    title: string;
    type: string;
    status: string;
    parentId?: string | null;
    templateId?: string | null;
}

export interface MaintenanceSummary {
    id: string;
    performedAt?: string;
    performedBy?: string;
    eventType?: string;
    status?: string;
    nodeId?: string;
}

interface NodeMetadata {
    tag?: string;
    componentType?: string;
    medium?: string;
    fluid?: string;
    ps?: string;
    pressure?: string;
    ts?: string;
    temperature?: string;
    location?: string;
    parentId?: string | null;
    [key: string]: unknown;
}

export interface ComplianceSnapshot {
    health?: string;
    missingDocuments?: string[];
    unresolvedConflicts?: unknown[];
}

export interface CopilotProjectState {
    tenantId?: string;
    projectId?: string;
    projectMeta: {
        name?: string;
        clientName?: string;
        address?: string;
        customerType?: string;
        medium?: string;
        ps?: string;
        ts?: string;
        volume?: string;
        commissionedAt?: string;
        status?: string;
        location?: string;
        description?: string;
    };
    nodesSummary: ProjectComponentSummary[];
    tasksSummary: Array<Pick<Task, 'id' | 'status' | 'nodeId' | 'maintenanceEventId' | 'title' | 'type'>>;
    maintenanceSummary: MaintenanceSummary[];
    complianceSummary: {
        health: string;
        missingDocuments: string[];
        unresolvedConflicts: unknown[];
    };
    missingFields?: string[];
}

export interface UseProjectCopilotStateParams {
    tenantId?: string;
    project?: Project | null;
    nodes?: Node[];
    tasks?: Task[];
    maintenanceEvents?: MaintenanceSummary[];
    compliance?: ComplianceSnapshot | null;
    missingFields?: string[];
}

export function useProjectCopilotState({
    tenantId,
    project,
    nodes = [],
    tasks = [],
    maintenanceEvents = [],
    compliance,
    missingFields = [],
}: UseProjectCopilotStateParams): CopilotProjectState {
    return useMemo(() => {
        const nodeSummary: ProjectComponentSummary[] = nodes.map((node) => {
            const metadata = (node.metadata as NodeMetadata | null) ?? null;
            const templateAware = node as Node & { templateId?: string | null };
            return {
                id: node.id,
                title: node.title || metadata?.tag || node.type,
                type: node.type,
                status: node.status,
                parentId: metadata?.parentId ?? null,
                templateId: templateAware.templateId ?? null,
            };
        });

        const taskSummary = tasks.map((task) => ({
            id: task.id,
            status: task.status,
            nodeId: task.nodeId,
            maintenanceEventId: task.maintenanceEventId,
            title: task.title,
            type: task.type,
        }));

        return {
            tenantId,
            projectId: project?.id,
            projectMeta: {
                name: project?.name,
                clientName: project?.clientName,
                address: (project as Project & { address?: string })?.address,
                customerType: (project as Project & { customerType?: string })?.customerType,
                medium: (project as Project & { medium?: string })?.medium,
                ps: (project as Project & { ps?: string })?.ps,
                ts: (project as Project & { ts?: string })?.ts,
                volume: (project as Project & { volume?: string })?.volume,
                commissionedAt: (project as Project & { commissionedAt?: string })?.commissionedAt,
                status: (project as Project & { status?: string })?.status,
                location: (project as Project & { location?: string })?.location,
                description: (project as Project & { description?: string })?.description,
            },
            nodesSummary: nodeSummary,
            tasksSummary: taskSummary,
            maintenanceSummary: maintenanceEvents,
            complianceSummary: {
                health: compliance?.health ?? 'unknown',
                missingDocuments: compliance?.missingDocuments ?? [],
                unresolvedConflicts: compliance?.unresolvedConflicts ?? [],
            },
            missingFields: missingFields.length ? missingFields : undefined,
        };
    }, [tenantId, project, nodes, tasks, maintenanceEvents, compliance, missingFields]);
}
