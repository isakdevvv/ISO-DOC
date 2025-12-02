'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ActivityWidget from './ActivityWidget';
import {
    fetchNodes,
    fetchTasks,
    fetchProjects,
    fetchTemplates,
    Node,
    Task,
    Project,
    Template,
    isAuthenticationError
} from '@/lib/api';

interface OverviewStats {
    templateCount: number;
    documentCount: number;
    documentsInReview: number;
    projectCount: number;
    activeProjects: number;
    reportsApproved: number;
    reportsPending: number;
}

const DEFAULT_PROJECT_ID = 'default-project-id';

export default function HomeTab() {
    const [overview, setOverview] = useState<OverviewStats>({
        templateCount: 0,
        documentCount: 0,
        documentsInReview: 0,
        projectCount: 0,
        activeProjects: 0,
        reportsApproved: 0,
        reportsPending: 0,
    });
    const [activity, setActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [documents, setDocuments] = useState<Node[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        try {
            const projectId = DEFAULT_PROJECT_ID;
            const [projectList, templateList, nodes, tasks] = await Promise.all([
                fetchProjects(),
                fetchTemplates(),
                fetchNodes(projectId),
                fetchTasks(projectId)
            ]);

            setProjects(projectList);
            setTemplates(templateList);
            setDocuments(nodes);

            const documentsAwaitingReview = nodes.filter((n: Node) =>
                n.status === 'PENDING_REVIEW' || n.status === 'NEEDS_CHANGES' || n.status === 'DRAFT'
            ).length;
            const approvedDocuments = nodes.filter((n: Node) => n.status === 'APPROVED').length;
            const nodesNeedingAttention = nodes.length - approvedDocuments;

            const projectsWithActiveWork = projectList.filter((project) => {
                const projectTasks = Array.isArray(project.tasks) ? project.tasks : [];
                const projectNodes = Array.isArray(project.nodes) ? project.nodes : [];

                const hasOpenTasks = projectTasks.some((task: any) => {
                    const status = typeof task?.status === 'string' ? task.status.toUpperCase() : '';
                    return status !== 'COMPLETED' && status !== 'CANCELLED' && status !== 'CLOSED';
                });

                const hasPendingDocuments = projectNodes.some((node: any) => {
                    const status = typeof node?.status === 'string' ? node.status.toUpperCase() : '';
                    return status !== 'APPROVED';
                });

                return hasOpenTasks || hasPendingDocuments;
            }).length;

            setOverview({
                templateCount: templateList.length,
                documentCount: nodes.length,
                documentsInReview: documentsAwaitingReview,
                projectCount: projectList.length,
                activeProjects: projectsWithActiveWork,
                reportsApproved: approvedDocuments,
                reportsPending: nodesNeedingAttention,
            });

            const recentNodes = nodes.map((n: Node) => ({
                id: n.id,
                title: `Dokument: ${n.title || n.type}`,
                updatedAt: n.updatedAt,
                status: n.status,
                type: 'DOCUMENT'
            }));

            const recentTasks = tasks.map((t: Task) => ({
                id: t.id,
                title: `Oppgave: ${t.title}`,
                updatedAt: t.updatedAt,
                status: t.status,
                type: 'TASK'
            }));

            const projectTimeline = projectList.map((project) => {
                const projectTasks = Array.isArray(project.tasks) ? project.tasks : [];
                const hasActiveWork = projectTasks.some((task: any) => {
                    const status = typeof task?.status === 'string' ? task.status.toUpperCase() : '';
                    return status !== 'COMPLETED' && status !== 'CANCELLED' && status !== 'CLOSED';
                });

                return {
                    id: `project-${project.id}`,
                    title: `Prosjekt: ${project.name}`,
                    updatedAt: project.updatedAt || project.createdAt,
                    status: hasActiveWork ? 'IN_PROGRESS' : 'COMPLETED',
                    type: 'PROJECT',
                };
            });

            const combined = [...recentNodes, ...recentTasks, ...projectTimeline]
                .filter((item) => item.updatedAt)
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 10);

            setActivity(combined);
        } catch (err) {
            if (!isAuthenticationError(err)) {
                console.error('Failed to load dashboard data', err);
            }
        } finally {
            setLoading(false);
        }
    }

    const templatePreview = templates.slice(0, 3);
    const projectPreview = projects.slice(0, 3);
    const reportsPreview = selectReportDocuments(documents);

    return (
        <div className="space-y-8">
            <header className="mb-4">
                <h1 className="text-3xl font-bold text-gray-900">Admin Control Tower</h1>
                <p className="text-gray-600">
                    Få rask oversikt over Templates/Dokumenter, Prosjekter og Rapporter – og hopp direkte til arbeidet som betyr noe.
                </p>
            </header>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
                    <div className="grid gap-6 lg:grid-cols-3">
                        <AdminSectionCard
                            icon="🧱"
                            title="Templates & Dokumenter"
                            description="Administrer maler og dokumenter på tvers av prosjekter."
                            stats={[
                                { label: 'Aktive maler', value: overview.templateCount },
                                { label: 'Dokumenter i arbeid', value: overview.documentsInReview },
                                { label: 'Totalt generert', value: overview.documentCount },
                            ]}
                            actions={[
                                { label: 'Åpne Template Studio', href: '/app/dashboard?tab=templates', variant: 'primary' },
                                { label: 'Vis dokumentbibliotek', href: '/app/documents' },
                            ]}
                        >
                            <TemplatePreviewList templates={templatePreview} />
                        </AdminSectionCard>

                        <AdminSectionCard
                            icon="🗂️"
                            title="Prosjekter"
                            description="Se hvilke prosjekter som trenger oppfølging akkurat nå."
                            stats={[
                                { label: 'Prosjekter totalt', value: overview.projectCount },
                                { label: 'Aktive nå', value: overview.activeProjects },
                            ]}
                            actions={[
                                { label: 'Gå til prosjekter', href: '/app/projects', variant: 'primary' },
                                { label: 'Opprett nytt prosjekt', href: '/app/projects?create=1' },
                            ]}
                        >
                            <ProjectsPreviewList projects={projectPreview} />
                        </AdminSectionCard>

                        <AdminSectionCard
                            icon="📊"
                            title="Rapporter"
                            description="Følg status på compliance-, FDV- og kunderapporter."
                            stats={[
                                { label: 'Klare rapporter', value: overview.reportsApproved },
                                { label: 'Krever handling', value: overview.reportsPending },
                            ]}
                            actions={[
                                { label: 'Compliance workspace', href: '/app/dashboard?tab=compliance', variant: 'primary' },
                                { label: 'Se task-innboks', href: '/app/tasks' },
                            ]}
                        >
                            <ReportsPreviewList documents={reportsPreview} />
                        </AdminSectionCard>
                    </div>

                    <ActivityWidget activity={activity} />
                </>
            )}
        </div>
    );
}

interface AdminSectionCardProps {
    icon: string;
    title: string;
    description: string;
    stats: { label: string; value: number | string }[];
    actions: { label: string; href: string; variant?: 'primary' | 'secondary' }[];
    children?: React.ReactNode;
}

function AdminSectionCard({ icon, title, description, stats, actions, children }: AdminSectionCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 flex-1 flex flex-col gap-6">
                <div className="flex items-start gap-3">
                    <span className="text-3xl">{icon}</span>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-500">{description}</p>
                    </div>
                </div>
                <dl className="grid grid-cols-1 gap-4">
                    {stats.map((stat) => (
                        <div key={stat.label}>
                            <dt className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</dt>
                            <dd className="text-2xl font-semibold text-gray-900">{stat.value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
            {children && (
                <div className="border-t border-gray-100 bg-gray-50">
                    {children}
                </div>
            )}
            <div className="p-4 border-t border-gray-100 flex flex-col gap-2">
                {actions.map((action) => (
                    <Link
                        key={`${title}-${action.label}`}
                        href={action.href}
                        className={`w-full text-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${action.variant === 'primary'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        {action.label}
                    </Link>
                ))}
            </div>
        </div>
    );
}

function TemplatePreviewList({ templates }: { templates: Template[] }) {
    if (!templates.length) {
        return <div className="p-4 text-sm text-gray-500">Ingen maler registrert ennå.</div>;
    }

    return (
        <ul className="divide-y divide-gray-100">
            {templates.map((template) => (
                <li key={template.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-gray-900">{template.title}</div>
                        <div className="text-xs text-gray-500">{template.code} · v{template.version}</div>
                    </div>
                    <Link href="/app/dashboard?tab=templates" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                        Rediger
                    </Link>
                </li>
            ))}
        </ul>
    );
}

function ProjectsPreviewList({ projects }: { projects: Project[] }) {
    if (!projects.length) {
        return <div className="p-4 text-sm text-gray-500">Ingen prosjekter i arbeid.</div>;
    }

    return (
        <ul className="divide-y divide-gray-100">
            {projects.map((project) => {
                const documentCount = Array.isArray(project.documents)
                    ? project.documents.length
                    : Array.isArray(project.nodes)
                        ? project.nodes.length
                        : 0;
                const taskCount = Array.isArray(project.tasks) ? project.tasks.length : 0;
                return (
                    <li key={project.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-gray-900">{project.name}</div>
                            <div className="text-xs text-gray-500">
                                {(project.clientName || 'Intern') + ' • '}{documentCount} dokumenter · {taskCount} oppgaver
                            </div>
                        </div>
                        <Link href={`/app/projects/${project.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-500">
                            Åpne
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}

function ReportsPreviewList({ documents }: { documents: Node[] }) {
    if (!documents.length) {
        return <div className="p-4 text-sm text-gray-500">Ingen rapporter generert enda.</div>;
    }

    return (
        <ul className="divide-y divide-gray-100">
            {documents.map((doc) => (
                <li key={doc.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-gray-900">{doc.title || doc.type}</div>
                        <div className="text-xs text-gray-500">{doc.type}</div>
                    </div>
                    <StatusBadge status={doc.status} />
                </li>
            ))}
        </ul>
    );
}

function StatusBadge({ status }: { status?: string }) {
    const label = status || 'DRAFT';
    const normalized = label.toUpperCase();
    let styles = 'bg-gray-100 text-gray-700';

    if (normalized === 'APPROVED' || normalized === 'COMPLETED') {
        styles = 'bg-green-100 text-green-800';
    } else if (normalized === 'PENDING_REVIEW' || normalized === 'IN_PROGRESS' || normalized === 'DRAFT') {
        styles = 'bg-yellow-100 text-yellow-800';
    } else if (normalized === 'NEEDS_CHANGES' || normalized === 'ERROR') {
        styles = 'bg-red-100 text-red-800';
    }

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles}`}>
            {label}
        </span>
    );
}

function selectReportDocuments(documents: Node[]): Node[] {
    if (!documents.length) {
        return [];
    }

    const prioritizedTypes = ['FDV', 'RISK', 'CE', 'REPORT', 'COMPLIANCE'];
    const prioritized = documents
        .filter((doc) => {
            if (!doc.type) return false;
            const type = doc.type.toUpperCase();
            return prioritizedTypes.some((key) => type.includes(key));
        })
        .slice(0, 3);

    if (prioritized.length > 0) {
        return prioritized;
    }

    return documents.slice(0, 3);
}
