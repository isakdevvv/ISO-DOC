'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import Header from '@/app/components/Header';
import Link from 'next/link';
import { createProjectTask, fetchProject, Project, ProjectTask, updateProjectTask, uploadDocuments } from '@/lib/api';

const TASK_STATUSES = ['PENDING', 'READY', 'IN_PROGRESS', 'COMPLETED'];

interface ProjectDetailPageProps {
    params: {
        id: string;
    };
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
    const projectId = params.id;
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [creatingTask, setCreatingTask] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '' });

    useEffect(() => {
        loadProject();
    }, [projectId]);

    async function loadProject() {
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
    }

    async function handleStatusChange(taskId: string, status: string) {
        try {
            await updateProjectTask(projectId, taskId, { status });
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
            await uploadDocuments(event.target.files, { projectId });
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
        setError(null);
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

    const documentTasks = useMemo(() => project?.tasks.filter((task) => task.flowType === 'DOCUMENT') || [], [project?.tasks]);
    const workflowTasks = useMemo(() => project?.tasks.filter((task) => task.flowType !== 'DOCUMENT') || [], [project?.tasks]);

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

    function renderTaskRow(task: ProjectTask) {
        return (
            <div key={task.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 py-3 last:border-b-0">
                <div>
                    <p className="font-medium text-gray-900">{task.title}</p>
                    {task.description && <p className="text-sm text-gray-500">{task.description}</p>}
                    {task.documentId && task.document && (
                        <Link href={`/app/documents/${task.documentId}`} className="text-sm text-blue-600 hover:underline">
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

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Header />
                <main className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="text-sm text-gray-500">Laster prosjekt...</div>
                        ) : !project ? (
                            <div className="text-sm text-gray-500">Prosjektet finnes ikke.</div>
                        ) : (
                            <>
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                                            <p className="text-sm text-gray-500">Flow: {project.flowKey}</p>
                                            {project.clientName && <p className="text-sm text-gray-500">Kunde: {project.clientName}</p>}
                                        </div>
                                        <div className="flex gap-6">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase">Dokumenter</p>
                                                <p className="text-lg font-semibold text-gray-900">{project.documents.length}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase">Gjøremål</p>
                                                <p className="text-lg font-semibold text-gray-900">{project.tasks.length}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h2 className="text-lg font-semibold text-gray-900">Prosess-steg</h2>
                                                    <p className="text-sm text-gray-500">Oppgaver basert på prosjektflow.</p>
                                                </div>
                                            </div>
                                            {workflowTasks.length === 0 ? (
                                                <p className="text-sm text-gray-500">Ingen steg definert.</p>
                                            ) : (
                                                <div>
                                                    {workflowTasks.map(renderTaskRow)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h2 className="text-lg font-semibold text-gray-900">Dokument-gjøremål</h2>
                                                    <p className="text-sm text-gray-500">Dokumenter som må fylles ut før levering.</p>
                                                </div>
                                            </div>
                                            {documentTasks.length === 0 ? (
                                                <p className="text-sm text-gray-500">Ingen dokumenter er knyttet til prosjektet enda.</p>
                                            ) : (
                                                <div>
                                                    {documentTasks.map(renderTaskRow)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Last opp dokumenter</h2>
                                            <p className="text-sm text-gray-500 mb-4">Filer som lastes opp her blir automatisk gjøremål for prosjektet.</p>
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
                                                className={`flex items-center justify-center gap-2 w-full border border-dashed border-gray-300 rounded-lg py-8 cursor-pointer hover:border-blue-400 ${uploading ? 'opacity-50' : ''}`}
                                            >
                                                <span className="text-2xl">📄</span>
                                                {uploading ? 'Laster opp...' : 'Velg filer'}
                                            </label>
                                        </div>

                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Legg til manuelt gjøremål</h2>
                                            <form className="space-y-3" onSubmit={handleCreateTask}>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Tittel</label>
                                                    <input
                                                        type="text"
                                                        value={newTask.title}
                                                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                                        className="mt-1 w-full rounded-lg border border-gray-200 p-2"
                                                        placeholder="F.eks. innhent signatur"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Beskrivelse</label>
                                                    <textarea
                                                        value={newTask.description}
                                                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                                        rows={3}
                                                        className="mt-1 w-full rounded-lg border border-gray-200 p-2"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={creatingTask}
                                                    className={`w-full rounded-lg bg-blue-600 text-white py-2 font-medium hover:bg-blue-700 transition ${creatingTask ? 'opacity-50' : ''}`}
                                                >
                                                    {creatingTask ? 'Lagrer...' : 'Legg til gjøremål'}
                                                </button>
                                            </form>
                                        </div>

                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Dokumenter i prosjektet</h2>
                                            {project.documents.length === 0 ? (
                                                <p className="text-sm text-gray-500">Ingen dokumenter lastet opp.</p>
                                            ) : (
                                                <ul className="space-y-3 text-sm text-gray-600">
                                                    {project.documents.map((doc) => (
                                                        <li key={doc.id} className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-medium text-gray-900">{doc.title}</p>
                                                                <p className="text-xs text-gray-500">Status: {doc.status}</p>
                                                            </div>
                                                            <Link href={`/app/documents/${doc.id}`} className="text-blue-600 hover:underline text-sm">
                                                                Åpne
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
