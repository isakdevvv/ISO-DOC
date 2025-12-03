import { getSession, signOut } from "next-auth/react";

export interface ReviewDraft {
    title?: string;
    owner?: string;
    notes?: string;
}

export interface RemediationForm {
    owner?: string;
    dueDate?: string;
    status?: string;
    summary?: string;
    nextSteps?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class AuthenticationError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
    return error instanceof AuthenticationError;
}

let signingOut = false;
let unauthorized = false;

async function handleUnauthorized() {
    unauthorized = true;

    if (typeof window === 'undefined') {
        return;
    }

    if (signingOut) return;
    signingOut = true;
    try {
        await signOut({ callbackUrl: '/login', redirect: true });
    } catch (error) {
        console.error('Automatic sign-out failed', error);
        window.location.href = '/login';
    } finally {
        signingOut = false;
    }
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
    if (!headers) return {};
    if (headers instanceof Headers) {
        return Object.fromEntries(headers.entries());
    }
    if (Array.isArray(headers)) {
        return Object.fromEntries(headers);
    }
    return headers;
}

function resolveApiPath(path: string) {
    if (!path) return API_URL;
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
    if (unauthorized && typeof window !== 'undefined') {
        throw new AuthenticationError('Authentication required');
    }

    const session = await getSession();
    const token = (session as any)?.accessToken;

    if (!token) {
        if (typeof window !== 'undefined') {
            await handleUnauthorized();
        }
        throw new AuthenticationError('Authentication required');
    }

    const headers: HeadersInit = {
        ...normalizeHeaders(options.headers),
        'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        if (typeof window !== 'undefined') {
            await handleUnauthorized();
        }
        throw new AuthenticationError('Session expired');
    }

    return response;
}

export interface Node {
    id: string;
    tenantId: string;
    projectId: string;
    type: string;
    title: string;
    status: string;
    templateCode?: string | null;
    templateVersion?: string | null;
    data?: Record<string, any> | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
    component?: {
        id: string;
        componentType?: {
            code: string;
            name: string;
        } | null;
    } | null;
    files?: NodeFile[];
    currentRevision?: {
        id: string;
        revisionNumber: number;
        summary?: string;
        snapshot?: {
            id: string;
            segments: {
                id: string;
                content: string;
                segmentType: string;
                provenance: {
                    sourceType: string;
                    sourceId?: string;
                    score?: number;
                    metadata?: any;
                }[];
            }[];
        };
    };
}

export interface NodeFile {
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    storageKey: string;
    status: string;
    createdAt: string;
    variants?: FileVariant[];
}

export interface FileVariant {
    id: string;
    variantType: string;
    mimeType: string;
    storageKey: string;
}

export interface MaintenanceEvent {
    id: string;
    eventType?: string;
    status?: string;
    performedAt?: string;
    performedBy?: string;
    nodeId?: string;
}

export interface Project {
    id: string;
    tenantId?: string;
    name: string;
    clientName?: string;
    address?: string;
    medium?: string;
    psValue?: number | null;
    tsValue?: number | null;
    volume?: number | null;
    status?: string;
    commissionedAt?: string;
    metadata?: Record<string, unknown>;
    tasks: Task[];
    maintenance?: MaintenanceEvent[];
    nodes?: Node[];
    documents?: any[];
    createdAt: string;
    updatedAt: string;
}

export interface AuditChecklistItem {
    id: string;
    clause?: string | null;
    title: string;
    owner?: string | null;
    status: string;
    notes?: string | null;
    orderIndex: number;
}

export interface AuditFinding {
    id: string;
    title: string;
    severity: string;
    owner?: string | null;
    dueDate?: string | null;
    status: string;
    description?: string | null;
}

export interface AuditAction {
    id: string;
    title: string;
    owner?: string | null;
    status: string;
    dueDate?: string | null;
    description?: string | null;
}

export interface Audit {
    id: string;
    tenantId: string;
    projectId?: string | null;
    name: string;
    standard: string;
    type: string;
    scope?: string | null;
    owner?: string | null;
    status: string;
    startDate: string;
    endDate: string;
    metadata?: Record<string, unknown> | null;
    checklist: AuditChecklistItem[];
    findings: AuditFinding[];
    actions: AuditAction[];
    project?: {
        id: string;
        name: string | null;
    } | null;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectFlowTemplate {
    key: string;
    name: string;
    description: string;
    tasks: {
        key: string;
        title: string;
        description?: string;
        flowType: string;
    }[];
}

export async function fetchProjects(): Promise<Project[]> {
    const res = await fetchWithAuth(`${API_URL}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
}

export async function createProject(data: Partial<Project>): Promise<Project> {
    const res = await fetchWithAuth(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorBody = await res.text();
        console.error('Create project failed:', res.status, errorBody);
        throw new Error(`Failed to create project: ${res.status}`);
    }
    return res.json();
}

export async function createProjectTask(projectId: string, data: { title: string, description?: string, tenantId?: string }): Promise<Task> {
    const payload = {
        projectId,
        tenantId: data.tenantId,
        title: data.title,
        description: data.description,
        type: 'TASK',
        status: 'PENDING'
    };

    const res = await fetchWithAuth(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
}


export async function fetchProject(id: string): Promise<Project> {
    const res = await fetchWithAuth(`${API_URL}/projects/${id}`);
    if (!res.ok) throw new Error('Failed to fetch project');
    return res.json();
}

export interface CreateAuditPayload {
    tenantId?: string;
    projectId?: string;
    name: string;
    standard: string;
    type: string;
    scope?: string;
    owner?: string;
    status?: string;
    startDate: string;
    endDate: string;
    metadata?: Record<string, unknown>;
    checklist?: Array<{
        title: string;
        clause?: string;
        owner?: string;
        status?: string;
        notes?: string;
    }>;
    findings?: Array<{
        title: string;
        severity?: string;
        owner?: string;
        dueDate?: string;
        status?: string;
        description?: string;
    }>;
    actions?: Array<{
        title: string;
        owner?: string;
        dueDate?: string;
        status?: string;
        description?: string;
    }>;
}

export async function fetchAudits(): Promise<Audit[]> {
    const res = await fetchWithAuth(`${API_URL}/audits`);
    if (!res.ok) throw new Error('Failed to fetch audits');
    return res.json();
}

export async function fetchAudit(id: string): Promise<Audit> {
    const res = await fetchWithAuth(`${API_URL}/audits/${id}`);
    if (!res.ok) throw new Error('Failed to fetch audit');
    return res.json();
}

export async function createAudit(data: CreateAuditPayload): Promise<Audit> {
    const res = await fetchWithAuth(`${API_URL}/audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create audit');
    return res.json();
}

export async function fetchProjectFlows(): Promise<ProjectFlowTemplate[]> {
    // Mock flows for now since backend endpoint might not exist yet
    // In a real app, this would come from /projects/flows or similar
    return [
        {
            key: 'iso-9001',
            name: 'ISO 9001:2015 Implementation',
            description: 'Standard flow for implementing Quality Management System',
            tasks: [
                { key: 'scope', title: 'Define Scope', flowType: 'DOCUMENT' },
                { key: 'policy', title: 'Quality Policy', flowType: 'DOCUMENT' },
                { key: 'objectives', title: 'Quality Objectives', flowType: 'DOCUMENT' },
                { key: 'audit', title: 'Internal Audit', flowType: 'TASK' },
            ]
        },
        {
            key: 'iso-27001',
            name: 'ISO 27001:2022 Implementation',
            description: 'Information Security Management System implementation',
            tasks: [
                { key: 'soa', title: 'Statement of Applicability', flowType: 'DOCUMENT' },
                { key: 'risk-assessment', title: 'Risk Assessment', flowType: 'DOCUMENT' },
                { key: 'policy', title: 'InfoSec Policy', flowType: 'DOCUMENT' },
            ]
        },
        {
            key: 'default',
            name: 'General Project',
            description: 'Basic project structure',
            tasks: [
                { key: 'kickoff', title: 'Project Kickoff', flowType: 'TASK' },
                { key: 'planning', title: 'Project Planning', flowType: 'DOCUMENT' },
            ]
        }
    ];
}

export async function fetchNodes(projectId: string): Promise<Node[]> {
    const res = await fetchWithAuth(`${API_URL}/nodes?projectId=${projectId}`);
    if (!res.ok) {
        throw new Error('Failed to fetch nodes');
    }
    return res.json();
}

export async function fetchNode(id: string): Promise<Node> {
    const res = await fetchWithAuth(`${API_URL}/nodes/${id}`);
    if (!res.ok) {
        throw new Error('Failed to fetch node');
    }
    return res.json();
}

export async function createNode(data: Partial<Node>): Promise<Node> {
    const res = await fetchWithAuth(`${API_URL}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        throw new Error('Failed to create node');
    }
    return res.json();
}

export async function updateNode(id: string, data: Partial<Node>): Promise<Node> {
    const res = await fetchWithAuth(`${API_URL}/nodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        throw new Error('Failed to update node');
    }
    return res.json();
}

export async function deleteNode(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_URL}/nodes/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        throw new Error('Failed to delete node');
    }
}

export async function generateNode(id: string) {
    const res = await fetchWithAuth(`${API_URL}/nodes/${id}/generate`, {
        method: 'POST',
    });
    if (!res.ok) {
        throw new Error('Failed to generate node');
    }
    return res.json();
}

export interface CreateProjectNodeInput {
    type: string;
    title: string;
    status?: string;
    templateCode?: string;
    templateVersion?: string;
    data?: Record<string, unknown>;
    facts?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    componentId?: string;
    component?: {
        componentTypeCode: string;
        name?: string;
        tag?: string;
        serialNumber?: string;
        manufacturer?: string;
        facts?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
    };
}

export async function fetchProjectNodes(projectId: string): Promise<Node[]> {
    const res = await fetchWithAuth(`${API_URL}/projects/${projectId}/nodes`);
    if (!res.ok) {
        throw new Error('Failed to fetch project nodes');
    }
    return res.json();
}

export async function createProjectNode(projectId: string, data: CreateProjectNodeInput): Promise<Node> {
    const res = await fetchWithAuth(`${API_URL}/projects/${projectId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        throw new Error('Failed to create node for project');
    }
    return res.json();
}

export async function uploadFiles(files: FileList | File[], options: { projectId?: string, nodeId?: string } = {}): Promise<{ files: NodeFile[] }> {
    const formData = new FormData();
    const list = Array.isArray(files) ? files : Array.from(files);
    for (let i = 0; i < list.length; i++) {
        formData.append('files', list[i]);
    }
    if (options.projectId) {
        formData.append('projectId', options.projectId);
    }
    if (options.nodeId) {
        formData.append('nodeId', options.nodeId);
    }

    const uploaded: NodeFile[] = [];
    for (const file of list) {
        const checksum = await computeFileChecksum(file);
        const initResponse = await fetchWithAuth(`${API_URL}/ingestion/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: options.projectId,
                nodeId: options.nodeId,
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                size: file.size,
                checksum,
            }),
        });

        if (!initResponse.ok) {
            throw new Error('Failed to initialize upload');
        }

        const initPayload = await initResponse.json();
        const uploadUrl = resolveApiPath(initPayload.uploadUrl);
        const uploadForm = new FormData();
        uploadForm.append('file', file);

        const transferResponse = await fetchWithAuth(uploadUrl, {
            method: initPayload.uploadMethod ?? 'PUT',
            body: uploadForm,
        });

        if (!transferResponse.ok) {
            throw new Error('Failed to transfer file');
        }

        const transferPayload = await transferResponse.json();
        if (transferPayload?.file) {
            uploaded.push(transferPayload.file);
        }
    }

    return { files: uploaded };
}

async function computeFileChecksum(file: Blob): Promise<string> {
    const buffer = await file.arrayBuffer();
    const runtimeCrypto = (typeof globalThis !== 'undefined' && globalThis.crypto)
        ? globalThis.crypto
        : (await import('crypto')).webcrypto;

    if (!runtimeCrypto?.subtle) {
        throw new Error('Crypto module unavailable');
    }

    const hashBuffer = await runtimeCrypto.subtle.digest('SHA-256', buffer);
    return bufferToHex(hashBuffer);
}

function bufferToHex(buffer: ArrayBuffer) {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function fetchFileContent(fileId: string): Promise<Blob> {
    const res = await fetchWithAuth(`${API_URL}/ingestion/files/${fileId}/content`);
    if (!res.ok) {
        throw new Error('Failed to fetch file content');
    }
    return res.blob();
}

export interface Template {
    id: string;
    code: string;
    title: string;
    description?: string;
    version: string;
    schema: any;
    metadata?: any;
    createdAt: string;
    updatedAt: string;
}

export async function fetchTemplates(): Promise<Template[]> {
    const res = await fetchWithAuth(`${API_URL}/templates`);
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
}

export async function createTemplate(data: Partial<Template>): Promise<Template> {
    const res = await fetchWithAuth(`${API_URL}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create template');
    return res.json();
}

export async function updateTemplate(id: string, data: Partial<Template>): Promise<Template> {
    const res = await fetchWithAuth(`${API_URL}/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update template');
    return res.json();
}

export async function deleteTemplate(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_URL}/templates/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete template');
}

export interface RuleSet {
    id: string;
    code: string;
    title: string;
    description?: string;
    version: string;
    scope: string;
    isActive: boolean;
}

export async function fetchRuleSets(projectId?: string): Promise<RuleSet[]> {
    const query = projectId ? `?projectId=${projectId}` : '';
    const res = await fetchWithAuth(`${API_URL}/rule-engine/rule-sets${query}`);
    if (!res.ok) throw new Error('Failed to fetch rule sets');
    return res.json();
}

export interface RunRuleEnginePayload {
    scope?: string;
    ruleSetIds?: string[];
    facts?: Record<string, any>;
    metadata?: Record<string, any>;
}

export async function runRuleEngine(projectId: string, payload?: RunRuleEnginePayload): Promise<any> {
    const res = await fetchWithAuth(`${API_URL}/rule-engine/projects/${projectId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
    });
    if (!res.ok) throw new Error('Failed to run rule engine');
    return res.json();
}



export async function searchDocuments(query: string, projectId?: string): Promise<{ vectorResults: any[], keywordResults: any[] }> {
    if (!projectId) {
        // Fallback to first project if not specified
        try {
            const projects = await fetchProjects();
            if (projects.length > 0) {
                projectId = projects[0].id;
            }
        } catch (e) {
            console.error('Failed to fetch projects for search context', e);
        }
    }

    if (!projectId) {
        return { vectorResults: [], keywordResults: [] };
    }

    const res = await fetchWithAuth(`${API_URL}/rag/project/${projectId}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query }),
    });
    if (!res.ok) throw new Error('Failed to search documents');
    return res.json();
}

export interface Task {
    id: string;
    tenantId: string;
    projectId: string;
    type: string;
    status: string;
    title: string;
    description?: string;
    priority: number;
    dueAt?: string;
    assigneeId?: string;
    nodeId?: string;
    maintenanceEventId?: string;
    createdAt: string;
    updatedAt: string;
    assignee?: { name: string; email: string };
    node?: { title: string; type: string };
}

export type ProjectTask = Task;

export async function fetchTasks(projectId: string, status?: string): Promise<Task[]> {
    const query = new URLSearchParams({ projectId });
    if (status) query.append('status', status);

    const res = await fetchWithAuth(`${API_URL}/tasks?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const res = await fetchWithAuth(`${API_URL}/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
}

export interface RuleConflict {
    id: string;
    ruleEvaluationId: string;
    ruleAId?: string;
    ruleACode: string;
    ruleBId?: string;
    ruleBCode: string;
    conflictType: string;
    status: 'OPEN' | 'RESOLVED' | 'IGNORED';
    message?: string;
    metadata?: any;
    resolvedByOverrideId?: string;
    resolvedAt?: string;
}

export async function resolveConflict(
    conflictId: string,
    resolution: 'OVERRIDE_A' | 'OVERRIDE_B' | 'IGNORE',
    notes?: string
): Promise<void> {
    const res = await fetchWithAuth(`${API_URL}/rule-engine/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, notes }),
    });
    if (!res.ok) throw new Error('Failed to resolve conflict');
}

export async function fetchRuleConflicts(projectId: string, status?: string): Promise<RuleConflict[]> {
    const query = new URLSearchParams({ projectId });
    if (status) query.append('status', status);
    const res = await fetchWithAuth(`${API_URL}/rule-engine/projects/${projectId}/conflicts?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch conflicts');
    return res.json();
}

export async function fetchLatestRequirements(projectId: string): Promise<RequirementsModel | null> {
    const res = await fetchWithAuth(`${API_URL}/rule-engine/projects/${projectId}/requirements/latest`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch requirements');
    return res.json();
}

export interface RequirementsModel {
    id: string;
    projectId: string;
    version: number;
    payload: any;
    warnings: any[];
    createdAt: string;
}

export async function fetchRevisions(nodeId: string): Promise<any[]> {
    const res = await fetchWithAuth(`${API_URL}/nodes/${nodeId}/revisions`);
    if (!res.ok) throw new Error('Failed to fetch revisions');
    return res.json();
}

export async function fetchRevision(nodeId: string, revisionId: string): Promise<any> {
    const res = await fetchWithAuth(`${API_URL}/nodes/${nodeId}/revisions/${revisionId}`);
    if (!res.ok) throw new Error('Failed to fetch revision');
    return res.json();
}

export async function updateProjectTask(projectId: string, taskId: string, data: Partial<Task>): Promise<Task> {
    return updateTask(taskId, data);
}

export async function uploadDocuments(files: FileList | File[], options: { projectId?: string, nodeId?: string } = {}): Promise<{ files: NodeFile[] }> {
    return uploadFiles(files, options);
}

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    agentSettings?: {
        systemPrompt?: string;
        [key: string]: any;
    };
}

export async function fetchTenant(id: string): Promise<Tenant> {
    const res = await fetchWithAuth(`${API_URL}/tenants/${id}`);
    if (!res.ok) throw new Error('Failed to fetch tenant');
    return res.json();
}

export async function updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
    const res = await fetchWithAuth(`${API_URL}/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update tenant');
    return res.json();
}
