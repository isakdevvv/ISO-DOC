'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Header from '@/app/components/Header';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    createProjectNode,
    createProjectTask,
    fetchLatestRequirements,
    fetchProject,
    fetchProjectNodes,
    fetchRuleConflicts,
    CreateProjectNodeInput,
    Project,
    Task,
    RequirementsModel,
    RuleConflict,
    runRuleEngine,
    updateNode,
    updateTask,
    uploadFiles,
    Node,
} from '@/lib/api';
import { useCopilotAction, useCopilotContext, useCopilotReadable } from '@copilotkit/react-core';
import { PROJECT_COPILOT_PROMPT, useProjectCopilotState } from '@/lib/copilot/projectState';

const TASK_STATUSES = ['PENDING', 'READY', 'IN_PROGRESS', 'COMPLETED'];

type ComponentStatus = 'DRAFT' | 'IN_PROGRESS' | 'READY';

interface ComponentRow {
    id: string;
    tag: string;
    type: string;
    status: ComponentStatus;
    medium: string;
    ps: string;
    ts: string;
    location: string;
    parentId: string | null;
}

interface ProjectSpecs {
    location: string;
    medium: string;
    ps: string;
    ts: string;
    volume: string;
    description: string;
    owner: string;
    contact: string;
}

type ComponentNodeMetadata = {
    tag?: string;
    componentType?: string;
    componentTag?: string;
    parentId?: string | null;
    location?: string;
    medium?: string;
    fluid?: string;
    ps?: string;
    pressure?: string;
    ts?: string;
    temperature?: string;
};

const COMPONENT_TYPES = [
    { type: 'Kompressor', icon: '🌀', description: 'Hovedkompressor (CO₂)', nominalPs: '85 bar', nominalTs: '5 °C', componentTypeCode: 'CO2_COMPRESSOR' },
    { type: 'Fordamper', icon: '❄️', description: 'Fordamper i kjølerom', nominalPs: '50 bar', nominalTs: '-5 °C', componentTypeCode: 'CO2_EVAPORATOR' },
    { type: 'Ventil', icon: '🔧', description: 'Høytrykks- eller ekspansjonsventil', nominalPs: '90 bar', nominalTs: '10 °C', componentTypeCode: 'EXPANSION_VALVE' },
    { type: 'Sikkerhet', icon: '🛡️', description: 'Sikkerhetsventil / overvåkning', nominalPs: '100 bar', nominalTs: 'Ambient', componentTypeCode: 'SAFETY_VALVE' },
];

const DEFAULT_PROJECT_SPECS: ProjectSpecs = {
    location: 'Oslo, Norge',
    medium: 'CO₂',
    ps: '80 bar',
    ts: '5 °C',
    volume: '22 m³',
    description: 'CO₂-basert kuldeanlegg for dagligvare og tekniske rom.',
    owner: 'TermoTeam Drift',
    contact: 'prosjekt@termoteam.no',
};

const DEFAULT_COMPONENTS: ComponentRow[] = [
    {
        id: 'cmp-root',
        tag: 'K-101 Kompressor',
        type: 'Kompressor',
        status: 'READY',
        medium: 'CO₂',
        ps: '85 bar',
        ts: '5 °C',
        location: 'Maskinrom',
        parentId: null,
    },
    {
        id: 'cmp-cond',
        tag: 'CD-201 Kondensator',
        type: 'Fordamper',
        status: 'IN_PROGRESS',
        medium: 'CO₂',
        ps: '60 bar',
        ts: '10 °C',
        location: 'Tak',
        parentId: 'cmp-root',
    },
    {
        id: 'cmp-exp',
        tag: 'V-301 Ekspansjonsventil',
        type: 'Ventil',
        status: 'DRAFT',
        medium: 'CO₂',
        ps: '45 bar',
        ts: '-5 °C',
        location: 'Fordamper',
        parentId: 'cmp-cond',
    },
    {
        id: 'cmp-sv',
        tag: 'SV-901 Sikkerhetsventil',
        type: 'Sikkerhet',
        status: 'READY',
        medium: 'CO₂',
        ps: '100 bar',
        ts: 'Ambient',
        location: 'Tak',
        parentId: 'cmp-root',
    },
];

const DOCUMENT_PLACEHOLDERS = [
    { id: 'doc-fdv', title: 'FDV-dokument', status: 'PENDING', componentType: 'Kompressor' },
    { id: 'doc-ce', title: 'CE / PED Grunnlag', status: 'PENDING', componentType: 'Ventil' },
    { id: 'doc-risk', title: 'Risikovurdering', status: 'PENDING', componentType: 'Sikkerhet' },
];

const REQUIRED_SPEC_FIELDS: Array<keyof ProjectSpecs> = ['location', 'medium', 'ps', 'ts', 'volume'];

const componentStatusClasses = (status: ComponentStatus) => {
    if (status === 'READY') return 'bg-green-100 text-green-700';
    if (status === 'IN_PROGRESS') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
};

const componentStatusLabel = (status: ComponentStatus) => {
    if (status === 'READY') return 'Klar';
    if (status === 'IN_PROGRESS') return 'Pågår';
    return 'Planlagt';
};

const generateLocalId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `local-${Math.random().toString(36).slice(2, 10)}`;
};

const mapNodeToComponent = (node: Node): ComponentRow => {
    const metadata = (node.metadata as ComponentNodeMetadata | null) ?? null;
    return {
        id: node.id,
        tag: node.title || metadata?.componentType || node.type,
        type: metadata?.componentType || node.type || 'NODE',
        status: (node.status as ComponentStatus) || 'DRAFT',
        medium: metadata?.medium || 'CO₂',
        ps: metadata?.ps || 'N/A',
        ts: metadata?.ts || 'N/A',
        location: metadata?.location || 'Ukjent plassering',
        parentId: metadata?.parentId || null,
    };
};

export default function ProjectDetailPage() {
    const params = useParams();
    console.log('ProjectDetailPage params:', params);
    const projectId = params.id as string;
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [creatingTask, setCreatingTask] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '' });
    const [requirements, setRequirements] = useState<RequirementsModel | null>(null);
    const [conflicts, setConflicts] = useState<RuleConflict[]>([]);
    const [ruleEngineRunning, setRuleEngineRunning] = useState(false);
    const [projectSpecs, setProjectSpecs] = useState<ProjectSpecs>(DEFAULT_PROJECT_SPECS);
    const [components, setComponents] = useState<ComponentRow[]>(DEFAULT_COMPONENTS);
    const [projectNodes, setProjectNodes] = useState<Node[]>([]);
    const [nodesLoading, setNodesLoading] = useState(false);
    const [savingComponent, setSavingComponent] = useState(false);
    const componentsInitialized = useRef(false);
    const [componentForm, setComponentForm] = useState<{
        type: string;
        tag: string;
        location: string;
        medium: string;
        ps: string;
        ts: string;
        parentId: string;
    }>({
        type: COMPONENT_TYPES[0].type,
        tag: '',
        location: DEFAULT_PROJECT_SPECS.location,
        medium: DEFAULT_PROJECT_SPECS.medium,
        ps: DEFAULT_PROJECT_SPECS.ps,
        ts: DEFAULT_PROJECT_SPECS.ts,
        parentId: '',
    });
    const { setChatInstructions } = useCopilotContext();

    useEffect(() => {
        loadProject();
        loadRuleData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadProjectNodes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setChatInstructions(PROJECT_COPILOT_PROMPT);
    }, [setChatInstructions]);

    useEffect(() => {
        if (!project) return;
        setProjectSpecs((prev) => ({
            ...prev,
            medium: project.medium ?? prev.medium,
            ps: project.psValue != null ? String(project.psValue) : prev.ps,
            ts: project.tsValue != null ? String(project.tsValue) : prev.ts,
            volume: project.volume != null ? String(project.volume) : prev.volume,
            location: project.address ?? prev.location,
            description: typeof project.metadata?.description === 'string' ? project.metadata.description : prev.description,
        }));
    }, [project]);

    useEffect(() => {
        if (project?.nodes && project.nodes.length) {
            setProjectNodes(project.nodes as Node[]);
            setComponents((project.nodes as Node[]).map((node) => mapNodeToComponent(node)));
            componentsInitialized.current = true;
        } else if (!loading && !componentsInitialized.current) {
            setComponents(DEFAULT_COMPONENTS);
            componentsInitialized.current = true;
        }
    }, [project?.nodes, loading]);

    const loadProject = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchProject(projectId);
            setProject(data);
        } catch (err) {
            setError('Kunne ikke hente prosjektet');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const loadRuleData = useCallback(async () => {
        try {
            const [latestRequirements, conflictList] = await Promise.all([
                fetchLatestRequirements(projectId),
                fetchRuleConflicts(projectId, 'OPEN'),
            ]);
            setRequirements(latestRequirements);
            setConflicts(conflictList);
        } catch (err) {
            console.error(err);
        }
    }, [projectId]);

    const loadProjectNodes = useCallback(async () => {
        setNodesLoading(true);
        try {
            const remoteNodes = await fetchProjectNodes(projectId);
            setProjectNodes(remoteNodes);
            if (remoteNodes.length) {
                setComponents(remoteNodes.map((node) => mapNodeToComponent(node)));
                componentsInitialized.current = true;
            } else if (!componentsInitialized.current) {
                setComponents(DEFAULT_COMPONENTS);
            }
        } catch (err) {
            console.error('Kunne ikke hente komponenter', err);
            if (!componentsInitialized.current) {
                setComponents(DEFAULT_COMPONENTS);
            }
        } finally {
            setNodesLoading(false);
        }
    }, [projectId]);

    async function handleStatusChange(taskId: string, status: string) {
        try {
            await updateTask(taskId, { status });
            await loadProject();
        } catch (err) {
            console.error(err);
            setError('Klarte ikke å oppdatere status');
        }
    }

    async function handleDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
        if (!event.target.files?.length) return;
        setUploading(true);
        setError(null);
        try {
            await uploadFiles(event.target.files, { projectId });
            await loadProject();
        } catch (err) {
            console.error(err);
            setError('Opplasting feilet');
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    }

    async function handleCreateTask(e: FormEvent) {
        e.preventDefault();
        if (!newTask.title) {
            setError('Tittel må fylles inn');
            return;
        }
        setCreatingTask(true);
        try {
            await createProjectTask(projectId, {
                title: newTask.title,
                description: newTask.description,
            });
            setNewTask({ title: '', description: '' });
            await loadProject();
        } catch (err) {
            console.error(err);
            setError('Klarte ikke å opprette gjøremål');
        } finally {
            setCreatingTask(false);
        }
    }

    async function handleRunRuleEngine() {
        setRuleEngineRunning(true);
        setError(null);
        try {
            await runRuleEngine(projectId, { scope: 'FULL' });
            await loadRuleData();
        } catch (err) {
            console.error(err);
            setError('Klarte ikke å kjøre regelmotoren');
        } finally {
            setRuleEngineRunning(false);
        }
    }

    const projectDocuments = useMemo(() => {
        const source = projectNodes.length > 0
            ? projectNodes
            : (project?.nodes as Node[] | undefined) ?? [];
        return source.filter((node) => typeof node.type === 'string' && node.type.includes('DOCUMENT'));
    }, [projectNodes, project?.nodes]);

    // Note: Task type doesn't have flowType property, so we'll use all tasks
    const documentTasks = useMemo(() => project?.tasks || [], [project?.tasks]);
    const workflowTasks = useMemo(() => [], []);

    // Technician / Maintenance Logic
    const overdueTasks = useMemo(() => {
        if (!project?.tasks) return [];
        const now = new Date();
        return project.tasks.filter(t => t.dueAt && new Date(t.dueAt) < now && t.status !== 'COMPLETED');
    }, [project?.tasks]);

    const maintenanceEvents = useMemo(() => project?.maintenance ?? [], [project?.maintenance]);

    const hasMaintenanceWarnings = overdueTasks.length > 0;

    function formatStatus(status: string) {
        switch (status) {
            case 'READY':
                return 'Klar for innsending';
            case 'IN_PROGRESS':
                return 'Pågår';
            case 'COMPLETED':
                return 'Fullført';
            default:
                return 'Venter';
        }
    }

    function statusColor(status: string) {
        if (status === 'COMPLETED') return 'bg-green-100 text-green-700';
        if (status === 'READY') return 'bg-blue-100 text-blue-700';
        if (status === 'IN_PROGRESS') return 'bg-yellow-100 text-yellow-800';
        return 'bg-gray-100 text-gray-600';
    }

    const formatWarningMessage = (warning: unknown) => {
        if (typeof warning === 'string') {
            return warning;
        }
        if (typeof warning === 'object' && warning !== null && 'message' in warning) {
            const extracted = (warning as { message?: string }).message;
            if (typeof extracted === 'string') {
                return extracted;
            }
        }
        try {
            return JSON.stringify(warning);
        } catch {
            return 'Ukjent varsel';
        }
    };

    const handleSpecFieldChange = useCallback((field: keyof ProjectSpecs, value: string) => {
        setProjectSpecs((prev) => ({
            ...prev,
            [field]: value,
        }));
    }, []);

    const handleComponentStatusChange = useCallback(async (componentId: string, status: ComponentStatus) => {
        const previous = components.find((component) => component.id === componentId)?.status ?? 'DRAFT';
        setComponents((prev) =>
            prev.map((component) =>
                component.id === componentId ? { ...component, status } : component
            )
        );
        try {
            await updateNode(componentId, { status });
            setProjectNodes((prev) =>
                prev.map((node) => (node.id === componentId ? { ...node, status } : node))
            );
        } catch (err) {
            console.error('Klarte ikke å oppdatere komponentstatus', err);
            setError('Klarte ikke å oppdatere komponentstatus.');
            setComponents((prev) =>
                prev.map((component) =>
                    component.id === componentId ? { ...component, status: previous } : component
                )
            );
        }
    }, [components]);

    const handleComponentTypeSelect = useCallback((type: string) => {
        const preset = COMPONENT_TYPES.find((entry) => entry.type === type);
        setComponentForm((prev) => ({
            ...prev,
            type,
            ps: preset?.nominalPs ?? prev.ps,
            ts: preset?.nominalTs ?? prev.ts,
        }));
    }, []);

    const scrollToComponentForm = useCallback(() => {
        if (typeof document === 'undefined') return;
        document.getElementById('component-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    const handleAddComponent = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        const label = componentForm.tag.trim() || `${componentForm.type} ${components.length + 1}`;
        const metadata: ComponentNodeMetadata = {
            componentType: componentForm.type,
            parentId: componentForm.parentId || null,
            location: componentForm.location || projectSpecs.location,
            medium: componentForm.medium || projectSpecs.medium,
            ps: componentForm.ps || projectSpecs.ps,
            ts: componentForm.ts || projectSpecs.ts,
            componentTag: label,
        };
        const payload: CreateProjectNodeInput = {
            type: 'COMPONENT',
            title: label,
            status: 'DRAFT',
            metadata,
            data: {
                medium: metadata.medium,
                ps: metadata.ps,
                ts: metadata.ts,
            },
        };
        const selectedType = COMPONENT_TYPES.find((entry) => entry.type === componentForm.type);
        if (selectedType?.componentTypeCode) {
            payload.component = {
                componentTypeCode: selectedType.componentTypeCode,
                name: label,
                tag: label,
                metadata,
            };
        }
        setSavingComponent(true);
        try {
            await createProjectNode(projectId, payload);
            await Promise.all([loadProjectNodes(), loadProject()]);
            setComponentForm((prev) => ({
                ...prev,
                tag: '',
                parentId: '',
            }));
        } catch (err) {
            console.error('Klarte ikke å opprette komponentnode', err);
            setError('Klarte ikke å lagre komponent. Data er kun lokalt.');
            if (!componentsInitialized.current) {
                const fallbackComponent: ComponentRow = {
                    id: generateLocalId(),
                    tag: label,
                    type: componentForm.type,
                    status: 'DRAFT',
                    medium: metadata.medium || 'CO₂',
                    ps: metadata.ps || 'N/A',
                    ts: metadata.ts || 'N/A',
                    location: metadata.location || 'Ukjent plassering',
                    parentId: metadata.parentId || null,
                };
                setComponents((prev) => [...prev, fallbackComponent]);
            }
        } finally {
            setSavingComponent(false);
        }
    }, [componentForm, components.length, loadProject, loadProjectNodes, projectId, projectSpecs]);

    const parentOptions = useMemo(
        () => components.map((component) => ({ id: component.id, label: component.tag })),
        [components]
    );

    const missingFields = useMemo(
        () => REQUIRED_SPEC_FIELDS.filter((field) => !(projectSpecs[field] || '').trim()),
        [projectSpecs]
    );

    const componentStats = useMemo(() => {
        const ready = components.filter((component) => component.status === 'READY').length;
        const draft = components.filter((component) => component.status === 'DRAFT').length;
        const inProgress = components.filter((component) => component.status === 'IN_PROGRESS').length;
        return {
            total: components.length,
            ready,
            draft,
            inProgress,
        };
    }, [components]);

    const componentTree = useMemo(() => {
        const map = new Map<string | null, ComponentRow[]>();
        components.forEach((component) => {
            const parent = component.parentId || null;
            if (!map.has(parent)) {
                map.set(parent, []);
            }
            map.get(parent)!.push(component);
        });
        return map;
    }, [components]);

    const dagDocumentNodes = useMemo(() => {
        const realDocumentNodes = projectNodes.filter((node) => typeof node.type === 'string' && node.type.includes('DOCUMENT'));
        if (realDocumentNodes.length > 0) {
            return realDocumentNodes.map((node) => {
                const nodeMetadata = (node.metadata as Record<string, unknown> | null) ?? null;
                return {
                    id: node.id,
                    title: node.title,
                    status: node.status,
                    componentTag: typeof nodeMetadata?.componentTag === 'string' ? nodeMetadata.componentTag : 'Tilgjengelig',
                };
            });
        }
        return DOCUMENT_PLACEHOLDERS.map((doc) => {
            const match = components.find((component) => component.type === doc.componentType);
            return {
                ...doc,
                componentTag: match?.tag ?? 'Valgfri node',
            };
        });
    }, [components, projectNodes]);

    function renderTaskRow(task: Task) {
        return (
            <div key={task.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 py-3 last:border-b-0">
                <div>
                    <p className="font-medium text-gray-900">{task.title}</p>
                    {task.description && <p className="text-sm text-gray-500">{task.description}</p>}
                    {task.dueAt && (
                        <p className={`text-xs font-semibold mt-1 ${new Date(task.dueAt) < new Date() && task.status !== 'COMPLETED' ? 'text-red-600' : 'text-gray-500'}`}>
                            Frist: {new Date(task.dueAt).toLocaleDateString()}
                        </p>
                    )}
                    {task.nodeId && task.node && (
                        <Link href={`/app/documents/${task.nodeId}`} className="text-sm text-blue-600 hover:underline">
                            Åpne dokument
                        </Link>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(task.status)}`}>
                        {formatStatus(task.status)}
                    </span>
                    <select
                        className="border border-gray-200 rounded-lg px-3 py-1 text-sm"
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    >
                        {TASK_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }

    function renderComponentTree(parentId: string | null, depth = 0): React.ReactElement[] {
        const branch = componentTree.get(parentId) ?? [];
        return branch.map((component) => (
            <div key={component.id}>
                <div
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    style={{ marginLeft: depth * 16 }}
                >
                    <div>
                        <p className="text-sm font-medium text-gray-900">{component.tag}</p>
                        <p className="text-xs text-gray-500">{component.type} • {component.location}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${componentStatusClasses(component.status)}`}>
                        {componentStatusLabel(component.status)}
                    </span>
                </div>
                {renderComponentTree(component.id, depth + 1)}
            </div>
        ));
    }

    const requiredDocuments = useMemo(() => {
        const docs = requirements?.payload?.requiredDocuments;
        return Array.isArray(docs) ? (docs as Array<Record<string, unknown>>) : [];
    }, [requirements]);
    const requirementWarnings = useMemo(() => (
        Array.isArray(requirements?.warnings) ? requirements.warnings : []
    ), [requirements]);
    const componentsPending = useMemo(
        () => components.filter((component) => component.status !== 'READY').length,
        [components]
    );

    const projectSetupSteps = useMemo(() => [
        {
            key: 'meta',
            title: 'Prosjektdata',
            status: missingFields.length ? 'pending' : 'done',
            description: missingFields.length ? `${missingFields.length} felt mangler` : 'Alle metadata fylt ut',
        },
        {
            key: 'components',
            title: 'Komponenter',
            status: componentsPending ? 'progress' : 'done',
            description: `${components.length} registrert`,
        },
        {
            key: 'documents',
            title: 'Dokumenter',
            status: documentTasks.length ? 'progress' : 'pending',
            description: documentTasks.length ? `${documentTasks.length} dokumentoppgaver` : 'Ingen dokumenter tildelt',
        },
        {
            key: 'files',
            title: 'Filer',
            status: projectDocuments.length ? 'done' : 'pending',
            description: projectDocuments.length ? `${projectDocuments.length} noder` : 'Ingen opplastinger',
        },
    ], [missingFields.length, componentsPending, documentTasks.length, projectDocuments.length, components.length]);

    const nodeLikeComponents = useMemo<Node[]>(() => {
        if (projectNodes.length) {
            return projectNodes;
        }
        if (project?.nodes && project.nodes.length) {
            return project.nodes as Node[];
        }
        const now = new Date().toISOString();
        return components.map((component) => ({
            id: component.id,
            tenantId: project?.tenantId ?? 'local',
            projectId: project?.id ?? projectId,
            type: component.type,
            title: component.tag,
            status: component.status,
            createdAt: now,
            updatedAt: now,
            metadata: {
                parentId: component.parentId,
                componentType: component.type,
                componentTag: component.tag,
                location: component.location,
                medium: component.medium,
                ps: component.ps,
                ts: component.ts,
            },
        })) as Node[];
    }, [components, project?.nodes, project?.id, project?.tenantId, projectId, projectNodes]);

    const maintenanceSummary = useMemo(() => {
        return maintenanceEvents.map((event, index) => ({
            id: event.id || `maintenance-${index}`,
            performedAt: event.performedAt,
            performedBy: event.performedBy,
            eventType: event.eventType,
            status: event.status,
            nodeId: event.nodeId,
        }));
    }, [maintenanceEvents]);

    const complianceSnapshot = useMemo(() => ({
        health: requirementWarnings.length ? 'warning' : 'ok',
        missingDocuments: requiredDocuments.map((doc) => {
            const title = doc['title'];
            if (typeof title === 'string') return title;
            const code = doc['code'];
            if (typeof code === 'string') return code;
            return 'Ukjent dokument';
        }),
        unresolvedConflicts: conflicts,
    }), [requirementWarnings, requiredDocuments, conflicts]);

    const projectCopilotState = useProjectCopilotState({
        tenantId: project?.tenantId,
        project,
        nodes: nodeLikeComponents,
        tasks: project?.tasks ?? [],
        maintenanceEvents: maintenanceSummary,
        compliance: complianceSnapshot,
        missingFields,
    });

    useCopilotReadable({
        description: 'Prosjektstatus, komponentregister og dag-node status for prosjektvisning',
        value: projectCopilotState,
    }, [projectCopilotState]);

    useCopilotAction({
        name: 'checkProjectReadiness',
        description: 'Oppsummerer hvilke prosjektdata, komponenter og dokumenter som mangler.',
        handler: async () => ({
            missingFields,
            pendingComponents: components.filter((component) => component.status !== 'READY').map((component) => component.tag),
            missingDocuments: dagDocumentNodes.map((doc) => doc.title),
        }),
    }, [missingFields, components, dagDocumentNodes]);

    useCopilotAction({
        name: 'openUpload',
        description: 'Åpner filopplasting for prosjektet.',
        handler: async () => {
            if (typeof document !== 'undefined') {
                document.getElementById('project-upload')?.click();
            }
            return { status: 'upload_opened' };
        },
    }, []);

    useCopilotAction({
        name: 'openComponentEditor',
        description: 'Ruller til komponentregisteret og forhåndsvelger type eller forelder.',
        parameters: [
            { name: 'componentType', type: 'string', description: 'Komponenttype (Kompressor, Fordamper, Ventil, Sikkerhet)', required: false },
            { name: 'parentTag', type: 'string', description: 'Navn på forelderenhet', required: false },
        ],
        handler: async ({ componentType, parentTag }) => {
            if (componentType) {
                const match = COMPONENT_TYPES.find((entry) => entry.type.toLowerCase() === componentType.toLowerCase());
                if (match) {
                    handleComponentTypeSelect(match.type);
                }
            }
            if (parentTag) {
                const parent = components.find((component) => component.tag.toLowerCase() === parentTag.toLowerCase());
                if (parent) {
                    setComponentForm((prev) => ({
                        ...prev,
                        parentId: parent.id,
                    }));
                }
            }
            scrollToComponentForm();
            return { status: 'component_editor_focused' };
        },
    }, [components, handleComponentTypeSelect, scrollToComponentForm]);

    return (
        <div className="flex flex-col min-h-full bg-gray-50">
            <Header
                title={project?.name || 'Project workspace'}
                subtitle={project?.clientName ? `${project.clientName} • Implementation stream` : 'Implementation stream'}
            />
            <main className="flex-1 p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Error Display */}
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                            {error}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading ? (
                        <div className="text-sm text-gray-500">Laster prosjekt...</div>
                    ) : !project ? (
                        <div className="text-sm text-gray-500">Prosjektet finnes ikke.</div>
                    ) : (
                        <>
                            {/* Header Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                                        {project.clientName && <p className="text-sm text-gray-500">Kunde: {project.clientName}</p>}
                                    </div>
                                    <div className="flex gap-6">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Dokumenter</p>
                                            <p className="text-lg font-semibold text-gray-900">{projectDocuments.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Gjøremål</p>
                                            <p className="text-lg font-semibold text-gray-900">{project.tasks.length}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Maintenance / Overdue Warnings */}
                            {hasMaintenanceWarnings && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">⚠️</span>
                                        <div>
                                            <h3 className="text-lg font-semibold text-red-800">Vedlikehold / Fristvarsel</h3>
                                            <p className="text-sm text-red-700 mt-1">
                                                Dette prosjektet har {overdueTasks.length} gjøremål som har passert fristen. Tiltak kreves.
                                            </p>
                                            <ul className="mt-2 space-y-1">
                                                {overdueTasks.map(task => (
                                                    <li key={task.id} className="text-sm text-red-700 list-disc list-inside">
                                                        {task.title} (Frist: {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'Ukjent'})
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Setup Progress */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Oppsett fremdrift</h2>
                                        <p className="text-sm text-gray-500">Følg stegene for å gjøre prosjektet klart.</p>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        {componentsPending ? `${componentsPending} komponenter trenger info` : 'Komponentregisteret er klart'}
                                    </p>
                                </div>
                                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                                    {projectSetupSteps.map((step, index) => (
                                        <div key={step.key} className="flex items-center gap-3">
                                            <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${step.status === 'done'
                                                    ? 'bg-green-100 text-green-700'
                                                    : step.status === 'progress'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-gray-100 text-gray-500'
                                                    }`}
                                            >
                                                {step.status === 'done' ? '✓' : step.status === 'progress' ? '…' : index + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                                                <p className="text-xs text-gray-500">{step.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                <div className="xl:col-span-2 space-y-6">
                                    {/* Project Specs */}
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900">Prosjektdata</h2>
                                                <p className="text-sm text-gray-500">Fyll ut grunnlaget for CO₂-anlegget.</p>
                                            </div>
                                            {missingFields.length > 0 && (
                                                <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                                                    Mangler {missingFields.length}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Lokasjon</label>
                                                <input
                                                    type="text"
                                                    value={projectSpecs.location}
                                                    onChange={(e) => handleSpecFieldChange('location', e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Medium</label>
                                                <input
                                                    type="text"
                                                    value={projectSpecs.medium}
                                                    onChange={(e) => handleSpecFieldChange('medium', e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">PS (Designtrykk)</label>
                                                <input
                                                    type="text"
                                                    value={projectSpecs.ps}
                                                    onChange={(e) => handleSpecFieldChange('ps', e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">TS (Designtemp)</label>
                                                <input
                                                    type="text"
                                                    value={projectSpecs.ts}
                                                    onChange={(e) => handleSpecFieldChange('ts', e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Volum</label>
                                                <input
                                                    type="text"
                                                    value={projectSpecs.volume}
                                                    onChange={(e) => handleSpecFieldChange('volume', e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Kontaktperson</label>
                                                <input
                                                    type="text"
                                                    value={projectSpecs.contact}
                                                    onChange={(e) => handleSpecFieldChange('contact', e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Eier / Team</label>
                                                <input
                                                    type="text"
                                                    value={projectSpecs.owner}
                                                    onChange={(e) => handleSpecFieldChange('owner', e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-sm font-medium text-gray-700">Beskrivelse</label>
                                                <textarea
                                                    value={projectSpecs.description}
                                                    onChange={(e) => handleSpecFieldChange('description', e.target.value)}
                                                    rows={3}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Component Register */}
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900">Komponentregister</h2>
                                                <p className="text-sm text-gray-500">Auto-seed fra TEK/CO₂ biblioteket.</p>
                                            </div>
                                            <div className="flex gap-6 text-center">
                                                <div>
                                                    <p className="text-xs uppercase text-gray-500">Totalt</p>
                                                    <p className="text-lg font-semibold text-gray-900">{componentStats.total}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs uppercase text-gray-500">Klare</p>
                                                    <p className="text-lg font-semibold text-green-700">{componentStats.ready}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs uppercase text-gray-500">Planlagt</p>
                                                    <p className="text-lg font-semibold text-gray-900">{componentStats.draft + componentStats.inProgress}</p>
                                                </div>
                                            </div>
                                        </div>
                                        {nodesLoading && (
                                            <p className="text-xs text-gray-500 mt-2">Henter komponenter fra API…</p>
                                        )}
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {COMPONENT_TYPES.map((type) => (
                                                <button
                                                    key={type.type}
                                                    type="button"
                                                    onClick={() => {
                                                        handleComponentTypeSelect(type.type);
                                                        scrollToComponentForm();
                                                    }}
                                                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${componentForm.type === type.type ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-600'
                                                        }`}
                                                >
                                                    <span>{type.icon}</span>
                                                    {type.type}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-4 overflow-x-auto">
                                            <table className="min-w-full text-sm text-left">
                                                <thead>
                                                    <tr className="text-xs uppercase text-gray-500">
                                                        <th className="py-2 pr-4">Komponent</th>
                                                        <th className="py-2 pr-4">Medium / PS / TS</th>
                                                        <th className="py-2 pr-4">Plassering</th>
                                                        <th className="py-2 pr-4">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {components.map((component) => (
                                                        <tr key={component.id} className="border-t border-gray-100">
                                                            <td className="py-2 pr-4">
                                                                <p className="font-medium text-gray-900">{component.tag}</p>
                                                                <p className="text-xs text-gray-500">{component.type}</p>
                                                            </td>
                                                            <td className="py-2 pr-4 text-xs text-gray-500">
                                                                <div className="flex flex-col">
                                                                    <span>{component.medium}</span>
                                                                    <span>PS {component.ps}</span>
                                                                    <span>TS {component.ts}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2 pr-4 text-sm text-gray-500">{component.location}</td>
                                                            <td className="py-2 pr-4">
                                                                <select
                                                                    value={component.status}
                                                                    onChange={(e) => handleComponentStatusChange(component.id, e.target.value as ComponentStatus)}
                                                                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                                                >
                                                                    <option value="DRAFT">Planlagt</option>
                                                                    <option value="IN_PROGRESS">Pågår</option>
                                                                    <option value="READY">Klar</option>
                                                                </select>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <form id="component-form" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4" onSubmit={handleAddComponent}>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Type</label>
                                                <select
                                                    value={componentForm.type}
                                                    onChange={(e) => handleComponentTypeSelect(e.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                >
                                                    {COMPONENT_TYPES.map((type) => (
                                                        <option key={type.type} value={type.type}>{type.type}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Tag / Navn</label>
                                                <input
                                                    type="text"
                                                    value={componentForm.tag}
                                                    onChange={(e) => setComponentForm((prev) => ({ ...prev, tag: e.target.value }))}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                    placeholder="K-101, SV-901..."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Forelder</label>
                                                <select
                                                    value={componentForm.parentId}
                                                    onChange={(e) => setComponentForm((prev) => ({ ...prev, parentId: e.target.value }))}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                >
                                                    <option value="">Rotnode</option>
                                                    {parentOptions.map((option) => (
                                                        <option key={option.id} value={option.id}>{option.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Plassering</label>
                                                <input
                                                    type="text"
                                                    value={componentForm.location}
                                                    onChange={(e) => setComponentForm((prev) => ({ ...prev, location: e.target.value }))}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Medium</label>
                                                <input
                                                    type="text"
                                                    value={componentForm.medium}
                                                    onChange={(e) => setComponentForm((prev) => ({ ...prev, medium: e.target.value }))}
                                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                />
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-sm font-medium text-gray-700">PS</label>
                                                    <input
                                                        type="text"
                                                        value={componentForm.ps}
                                                        onChange={(e) => setComponentForm((prev) => ({ ...prev, ps: e.target.value }))}
                                                        className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-sm font-medium text-gray-700">TS</label>
                                                    <input
                                                        type="text"
                                                        value={componentForm.ts}
                                                        onChange={(e) => setComponentForm((prev) => ({ ...prev, ts: e.target.value }))}
                                                        className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="lg:col-span-2">
                                                <button
                                                    type="submit"
                                                    disabled={savingComponent}
                                                    className={`w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 transition ${savingComponent ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {savingComponent ? 'Lagrer...' : 'Legg til komponent'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Technician: Checklists */}
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900">Sjekklister & Oppgaver</h2>
                                                <p className="text-sm text-gray-500">Dine aktive oppgaver for dette prosjektet.</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (typeof document !== 'undefined') {
                                                        document.getElementById('new-task-form')?.scrollIntoView({ behavior: 'smooth' });
                                                    }
                                                }}
                                                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
                                            >
                                                <span>+</span> Ny oppgave
                                            </button>
                                        </div>
                                        {workflowTasks.length === 0 ? (
                                            <p className="text-sm text-gray-500">Ingen sjekklister aktive.</p>
                                        ) : (
                                            <div>
                                                {workflowTasks.map(renderTaskRow)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Technician: Document Tasks */}
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900">Dokumenter som krever handling</h2>
                                                <p className="text-sm text-gray-500">Dokumenter som må fylles ut.</p>
                                            </div>
                                        </div>
                                        {documentTasks.length === 0 ? (
                                            <p className="text-sm text-gray-500">Ingen dokumentoppgaver.</p>
                                        ) : (
                                            <div>
                                                {documentTasks.map(renderTaskRow)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Manual Task Creation */}
                                    <div id="new-task-form" className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Ny oppgave</h2>
                                        <form className="space-y-3" onSubmit={handleCreateTask}>
                                            <div>
                                                <input
                                                    type="text"
                                                    value={newTask.title}
                                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                                    className="w-full rounded-lg border border-gray-200 p-2 text-sm"
                                                    placeholder="Tittel..."
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={creatingTask}
                                                className={`w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 transition ${creatingTask ? 'opacity-50' : ''}`}
                                            >
                                                {creatingTask ? '...' : 'Opprett'}
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* DAG View */}
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                        <h2 className="text-lg font-semibold text-gray-900">DAG-oversikt</h2>
                                        <p className="text-sm text-gray-500">Parent/child-relasjoner mellom komponenter og dokumenter.</p>
                                        <div className="mt-4 space-y-2">
                                            {components.length === 0 ? (
                                                <p className="text-sm text-gray-500">Ingen komponenter registrert.</p>
                                            ) : (
                                                renderComponentTree(null)
                                            )}
                                        </div>
                                        <div className="mt-6 border-t border-gray-100 pt-4">
                                            <h3 className="text-sm font-semibold text-gray-900 mb-2">Dokumentnoder</h3>
                                            <ul className="space-y-2 text-sm text-gray-600">
                                                {dagDocumentNodes.map((node) => (
                                                    <li key={node.id} className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium text-gray-900">{node.title}</p>
                                                            <p className="text-xs text-gray-500">Komponent: {node.componentTag}</p>
                                                        </div>
                                                        <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{node.status}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Maintenance Overview */}
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Vedlikeholdslogg</h2>
                                        {maintenanceEvents.length === 0 ? (
                                            <p className="text-sm text-gray-500">Ingen vedlikeholdshendelser registrert.</p>
                                        ) : (
                                            <ul className="space-y-3">
                                                {maintenanceEvents.map((event) => (
                                                    <li key={event.id} className="border-b border-gray-100 pb-2 last:border-0">
                                                        <p className="font-medium text-gray-900">{event.eventType || 'Vedlikehold'}</p>
                                                        <p className="text-xs text-gray-500">Dato: {event.performedAt ? new Date(event.performedAt).toLocaleDateString() : 'Ikke utført'}</p>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${event.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {event.status}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Key Documents Status */}
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Viktige Dokumenter</h2>
                                        {projectDocuments.length === 0 ? (
                                            <p className="text-sm text-gray-500">Ingen dokumenter.</p>
                                        ) : (
                                            <ul className="space-y-3 text-sm text-gray-600">
                                                {projectDocuments.slice(0, 5).map((doc) => (
                                                    <li key={doc.id} className="flex items-center justify-between">
                                                        <div className="truncate pr-2">
                                                            <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {doc.type} • Status: {doc.status}
                                                            </p>
                                                        </div>
                                                        <Link href={`/app/documents/${doc.id}`} className="text-blue-600 hover:underline text-xs whitespace-nowrap">
                                                            Åpne
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* File Upload */}
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Last opp vedlegg</h2>
                                        <input
                                            type="file"
                                            id="project-upload"
                                            className="hidden"
                                            multiple
                                            onChange={handleDocumentUpload}
                                            disabled={uploading}
                                        />
                                        <label
                                            htmlFor="project-upload"
                                            className={`flex items-center justify-center gap-2 w-full border border-dashed border-gray-300 rounded-lg py-4 cursor-pointer hover:border-blue-400 ${uploading ? 'opacity-50' : ''}`}
                                        >
                                            <span className="text-xl">📄</span>
                                            <span className="text-sm text-gray-600">{uploading ? 'Laster opp...' : 'Last opp filer'}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Rule Engine Section (Collapsible or Bottom) */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">System Status & Krav (Compliance)</h2>
                                        <p className="text-sm text-gray-500">Oversikt over regelbrudd og manglende data.</p>
                                    </div>
                                    <button
                                        onClick={handleRunRuleEngine}
                                        disabled={ruleEngineRunning}
                                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                    >
                                        {ruleEngineRunning ? 'Analyserer...' : 'Kjør analyse'}
                                    </button>
                                </div>
                                <div className="mt-4">
                                    {requirementWarnings.length > 0 && (
                                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800">
                                            <ul className="space-y-1 list-disc list-inside text-sm">
                                                {requirementWarnings.map((warning, idx) => (
                                                    <li key={idx}>{formatWarningMessage(warning)}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {requirementWarnings.length === 0 && (
                                        <p className="text-sm text-green-600">Ingen systemvarsler.</p>
                                    )}
                                </div>
                            </div>

                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
