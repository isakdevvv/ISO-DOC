import { getSession } from "next-auth/react";

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

export interface Document {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    projectId?: string | null;
    reviewData?: ReviewDraft | null;
    remediationForm?: RemediationForm | null;
}

export interface ProjectTask {
    id: string;
    title: string;
    description?: string | null;
    flowType: string;
    status: string;
    dueAt?: string | null;
    documentId?: string | null;
    metadata?: Record<string, any> | null;
    document?: Document | null;
}

export interface Project {
    id: string;
    name: string;
    clientName?: string | null;
    description?: string | null;
    status: string;
    flowKey: string;
    createdAt: string;
    updatedAt: string;
    documents: Document[];
    tasks: ProjectTask[];
}

export interface ProjectFlowTemplate {
    key: string;
    name: string;
    description?: string;
    tasks: { key?: string; title: string; flowType?: string }[];
}

export interface CreateProjectPayload {
    name: string;
    clientName?: string;
    description?: string;
    flowKey?: string;
}

export interface CreateProjectTaskPayload {
    title: string;
    description?: string;
    flowType?: string;
    status?: string;
    dueAt?: string;
    documentId?: string;
}

export interface UpdateProjectTaskPayload {
    status?: string;
    dueAt?: string | null;
    documentId?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const session = await getSession();
    const headers = {
        ...options.headers,
        ...(session && (session as any).accessToken ? { 'Authorization': `Bearer ${(session as any).accessToken}` } : {}),
    };
    return fetch(url, { ...options, headers });
}

export async function fetchDocuments(): Promise<Document[]> {
    const res = await fetchWithAuth(`${API_URL}/documents`);
    if (!res.ok) {
        throw new Error('Failed to fetch documents');
    }
    return res.json();
}

export async function fetchDocument(id: string): Promise<Document> {
    const res = await fetchWithAuth(`${API_URL}/documents/${id}`);
    if (!res.ok) {
        throw new Error('Failed to fetch document');
    }
    return res.json();
}

export async function fetchDocumentContent(id: string): Promise<Blob> {
    const res = await fetchWithAuth(`${API_URL}/documents/${id}/content`);
    if (!res.ok) {
        throw new Error('Failed to fetch document content');
    }
    return res.blob();
}

export async function uploadDocuments(files: FileList | File[], options: { projectId?: string } = {}): Promise<{ batchId: string, documents: Document[] }> {
    const formData = new FormData();
    const list = Array.isArray(files) ? files : Array.from(files);
    for (let i = 0; i < list.length; i++) {
        formData.append('files', list[i]);
    }
    if (options.projectId) {
        formData.append('projectId', options.projectId);
    }

    const res = await fetchWithAuth(`${API_URL}/documents`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        throw new Error('Failed to upload documents');
    }
    return res.json();
}

export async function uploadDocument(file: File, options: { projectId?: string } = {}) {
    return uploadDocuments([file], options);
}

export async function commitDocuments(documentIds: string[]): Promise<any[]> {
    const res = await fetchWithAuth(`${API_URL}/documents/commit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentIds }),
    });

    if (!res.ok) {
        throw new Error('Failed to commit documents');
    }
    return res.json();
}

export async function saveReviewDraft(id: string, draft: ReviewDraft): Promise<Document> {
    const res = await fetchWithAuth(`${API_URL}/documents/${id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
    });
    if (!res.ok) {
        throw new Error('Failed to save review draft');
    }
    return res.json();
}

export async function saveRemediationForm(id: string, form: RemediationForm): Promise<Document> {
    const res = await fetchWithAuth(`${API_URL}/documents/${id}/remediation-form`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
    });
    if (!res.ok) {
        throw new Error('Failed to save remediation form');
    }
    return res.json();
}

export async function fetchComplianceReport(id: string): Promise<any> {
    const res = await fetchWithAuth(`${API_URL}/compliance/reports/${id}`);
    if (!res.ok) {
        throw new Error('Failed to fetch compliance report');
    }
    return res.json();
}

export async function fetchIsoStandards(): Promise<any[]> {
    const res = await fetchWithAuth(`${API_URL}/iso-standards`);
    if (!res.ok) {
        throw new Error('Failed to fetch ISO standards');
    }
    return res.json();
}

export async function runComplianceCheck(documentId: string, isoStandardId: string): Promise<any> {
    const res = await fetchWithAuth(`${API_URL}/compliance/check/${documentId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isoStandardId }),
    });
    if (!res.ok) {
        throw new Error('Failed to run compliance check');
    }
    return res.json();
}

export async function exportDocument(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_URL}/documents/${id}/export`);
    if (!res.ok) {
        throw new Error('Failed to export document');
    }

    // Trigger download
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document_${id}_extracted.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

export async function runGapAnalysis(isoStandardId: string): Promise<any> {
    const res = await fetchWithAuth(`${API_URL}/compliance/gap-analysis/${isoStandardId}`);
    if (!res.ok) {
        throw new Error('Failed to run gap analysis');
    }
    return res.json();
}

export async function generateGapReport(isoStandardId: string): Promise<any> {
    const res = await fetchWithAuth(`${API_URL}/compliance/gap-report/${isoStandardId}`, {
        method: 'POST',
    });
    if (!res.ok) {
        throw new Error('Failed to generate gap report');
    }
    return res.json();
}

export async function fetchDashboardStats(): Promise<any> {
    const res = await fetchWithAuth(`${API_URL}/dashboard/stats`);
    if (!res.ok) {
        throw new Error('Failed to fetch dashboard stats');
    }
    return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_URL}/documents/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        throw new Error('Failed to delete document');
    }
}

export async function searchDocuments(query: string): Promise<any> {
    const res = await fetchWithAuth(`${API_URL}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
        throw new Error('Failed to search documents');
    }
    return res.json();
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    read: boolean;
    createdAt: string;
}

export async function fetchNotifications(): Promise<Notification[]> {
    const res = await fetchWithAuth(`${API_URL}/notifications`);
    if (!res.ok) {
        throw new Error('Failed to fetch notifications');
    }
    return res.json();
}

export async function markNotificationRead(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
    });
    if (!res.ok) {
        throw new Error('Failed to mark notification as read');
    }
}

export async function markAllNotificationsRead(): Promise<void> {
    const res = await fetchWithAuth(`${API_URL}/notifications/mark-all-read`, {
        method: 'POST',
    });
    if (!res.ok) {
        throw new Error('Failed to mark all notifications as read');
    }
}

export async function fetchBatchProgress(batchId: string): Promise<{ total: number, processed: number, failed: number, pending: number }> {
    const res = await fetchWithAuth(`${API_URL}/documents/batch/${batchId}/progress`);
    if (!res.ok) {
        throw new Error('Failed to fetch batch progress');
    }
    return res.json();
}

export async function fetchProjects(): Promise<Project[]> {
    const res = await fetchWithAuth(`${API_URL}/projects`);
    if (!res.ok) {
        throw new Error('Failed to fetch projects');
    }
    return res.json();
}

export async function fetchProject(id: string): Promise<Project> {
    const res = await fetchWithAuth(`${API_URL}/projects/${id}`);
    if (!res.ok) {
        throw new Error('Failed to fetch project');
    }
    return res.json();
}

export async function fetchProjectFlows(): Promise<ProjectFlowTemplate[]> {
    const res = await fetchWithAuth(`${API_URL}/projects/flows`);
    if (!res.ok) {
        throw new Error('Failed to fetch project flows');
    }
    return res.json();
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
    const res = await fetchWithAuth(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        throw new Error('Failed to create project');
    }
    return res.json();
}

export async function createProjectTask(projectId: string, payload: CreateProjectTaskPayload): Promise<ProjectTask> {
    const res = await fetchWithAuth(`${API_URL}/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        throw new Error('Failed to create project task');
    }
    return res.json();
}

export async function updateProjectTask(projectId: string, taskId: string, payload: UpdateProjectTaskPayload): Promise<ProjectTask> {
    const res = await fetchWithAuth(`${API_URL}/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        throw new Error('Failed to update project task');
    }
    return res.json();
}

export interface Template {
    id: string;
    name: string;
    description?: string;
    category: string;
    content: any;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export async function fetchTemplates(): Promise<Template[]> {
    const res = await fetchWithAuth(`${API_URL}/templates`);
    if (!res.ok) {
        throw new Error('Failed to fetch templates');
    }
    return res.json();
}

export async function fetchTemplate(id: string): Promise<Template> {
    const res = await fetchWithAuth(`${API_URL}/templates/${id}`);
    if (!res.ok) {
        throw new Error('Failed to fetch template');
    }
    return res.json();
}

export async function createTemplate(payload: { name: string; category: string; content: any; description?: string }): Promise<Template> {
    const res = await fetchWithAuth(`${API_URL}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        throw new Error('Failed to create template');
    }
    return res.json();
}

export async function updateTemplate(id: string, payload: Partial<{ name: string; category: string; content: any; description?: string }>): Promise<Template> {
    const res = await fetchWithAuth(`${API_URL}/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        throw new Error('Failed to update template');
    }
    return res.json();
}

export async function deleteTemplate(id: string): Promise<void> {
    const res = await fetchWithAuth(`${API_URL}/templates/${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) {
        throw new Error('Failed to delete template');
    }
}
