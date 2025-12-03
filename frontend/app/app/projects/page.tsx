'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '@/app/components/Header';
import { createProject, fetchProjectFlows, fetchProjects, Project, ProjectFlowTemplate } from '@/lib/api';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [flows, setFlows] = useState<ProjectFlowTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({
        name: '',
        clientName: '',
        description: '',
        flowKey: 'default'
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [projectList, flowList] = await Promise.all([
                fetchProjects(),
                fetchProjectFlows()
            ]);
            console.log('Fetched projects:', projectList);
            setProjects(projectList);
            setFlows(flowList);
        } catch (err) {
            setError('Kunne ikke hente prosjekter');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    async function handleCreateProject(e: FormEvent) {
        e.preventDefault();
        if (!form.name) {
            setError('Prosjektnavn må fylles ut');
            return;
        }
        setCreating(true);
        setError(null);
        try {
            await createProject({
                name: form.name,
                clientName: form.clientName || undefined,
            });
            setForm({ name: '', clientName: '', description: '', flowKey: form.flowKey });
            await loadData();
        } catch (err) {
            setError('Klarte ikke å opprette prosjekt');
            console.error(err);
        } finally {
            setCreating(false);
        }
    }

    const projectSummaries = useMemo(() => {
        return projects.map((project) => {
            const completed = project.tasks.filter((task) => task.status === 'COMPLETED').length;
            const total = project.tasks.length;
            const pendingDocuments = project.tasks.filter((task) => task.flowType === 'DOCUMENT' && task.status !== 'COMPLETED');
            return {
                ...project,
                completed,
                total,
                pendingDocumentCount: pendingDocuments.length,
            };
        });
    }, [projects]);

    useCopilotReadable({
        description: 'Prosjekter og tilgjengelige flows vist i Prosjekter-panelet',
        value: {
            projects: projectSummaries.map((project) => ({
                id: project.id,
                name: project.name,
                clientName: project.clientName,
                completedTasks: project.completed,
                totalTasks: project.total,
                pendingDocumentCount: project.pendingDocumentCount,
            })),
            flows: flows.map((flow) => ({
                key: flow.key,
                name: flow.name,
                description: flow.description,
                taskCount: flow.tasks?.length ?? 0,
            })),
            defaultFlowKey: form.flowKey,
        },
    }, [projectSummaries, flows, form.flowKey]);

    useCopilotAction({
        name: 'createProject',
        description: 'Opprett et nytt prosjekt basert på brukerens input (navn, kunde, beskrivelse og flow).',
        parameters: [
            { name: 'name', type: 'string', description: 'Prosjektnavn som skal opprettes', required: true },
            { name: 'clientName', type: 'string', description: 'Kundenavn (valgfritt)', required: false },
            { name: 'description', type: 'string', description: 'Kort beskrivelse av prosjektet', required: false },
            { name: 'flowKey', type: 'string', description: 'Flow-nøkkel fra listen i UI', required: false },
        ],
        handler: async ({ name, clientName, description, flowKey }) => {
            const trimmedName = name?.trim();
            if (!trimmedName) {
                throw new Error('Prosjektnavn må fylles inn for å opprette prosjekt.');
            }

            const candidateFlowKey = flowKey && flows.some((flow) => flow.key === flowKey)
                ? flowKey
                : form.flowKey;
            const fallbackFlowKey = flows.some((flow) => flow.key === candidateFlowKey)
                ? candidateFlowKey
                : flows[0]?.key;

            try {
                const project = await createProject({
                    name: trimmedName,
                    clientName: clientName?.trim() || undefined,
                });
                await loadData();
                return {
                    status: 'created',
                    projectId: project.id,
                    message: `Prosjektet "${project.name}" er opprettet.`,
                };
            } catch (err) {
                console.error('Copilot kunne ikke opprette prosjekt', err);
                throw new Error('Klarte ikke å opprette prosjekt via Copilot. Prøv igjen.');
            }
        },
    }, [flows, form.flowKey, loadData]);

    return (
        <div className="flex flex-col min-h-full bg-gray-50">
            <Header
                title="Projects"
                subtitle="Track implementations per standard and keep delivery health visible."
            />
            <main className="flex-1 p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Prosjekter</h1>
                            <p className="text-sm text-gray-500">Organiser dokumentarbeidet i prosjektbaserte flows.</p>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-1">Aktive prosjekter</h2>
                                <p className="text-sm text-gray-500">Velg prosjekt for å se gjøremål og dokumentstatus.</p>
                            </div>

                            {loading ? (
                                <div className="text-sm text-gray-500">Laster prosjekter...</div>
                            ) : projectSummaries.length === 0 ? (
                                <div className="text-sm text-gray-500">Ingen prosjekter er opprettet ennå.</div>
                            ) : (
                                <div className="space-y-4">
                                    {projectSummaries.map((project) => (
                                        <div key={project.id} className="border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div>
                                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                    <span className="text-xl">📁</span>
                                                    {project.name}
                                                </h3>
                                                {project.clientName && <p className="text-sm text-gray-500">Kunde: {project.clientName}</p>}
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500 uppercase">Fremdrift</p>
                                                    <p className="font-semibold text-gray-900">{project.completed}/{project.total}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500 uppercase">Dokumenter igjen</p>
                                                    <p className="font-semibold text-gray-900">{project.pendingDocumentCount}</p>
                                                </div>
                                                <Link href={`/app/projects/${project.id}`} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                                                    Åpne
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-1">Opprett nytt prosjekt</h2>
                            <p className="text-sm text-gray-500 mb-4">Velg en forhåndsdefinert flow for å få riktig gjøremål.</p>
                            <form className="space-y-4" onSubmit={handleCreateProject}>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Navn</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-gray-200 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="ISO 9001 leveranse"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Kunde</label>
                                    <input
                                        type="text"
                                        value={form.clientName}
                                        onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-gray-200 p-2"
                                        placeholder="Bedrift AS"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Flow</label>
                                    <select
                                        value={form.flowKey}
                                        onChange={(e) => setForm({ ...form, flowKey: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-gray-200 p-2"
                                    >
                                        {flows.map((flow) => (
                                            <option key={flow.key} value={flow.key}>
                                                {flow.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Beskrivelse</label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className="mt-1 w-full rounded-lg border border-gray-200 p-2"
                                        rows={3}
                                        placeholder="Hva skal leveres i dette prosjektet?"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className={`w-full rounded-lg bg-blue-600 text-white py-2 font-medium hover:bg-blue-700 transition ${creating ? 'opacity-50' : ''}`}
                                >
                                    {creating ? 'Oppretter...' : 'Opprett prosjekt'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {flows.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-1">Tilgjengelige flows</h2>
                            <p className="text-sm text-gray-500 mb-4">Hver flow inneholder et sett med gjøremål.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {flows.map((flow) => (
                                    <div key={flow.key} className="border border-gray-100 rounded-lg p-4">
                                        <h3 className="font-semibold text-gray-900">{flow.name}</h3>
                                        <p className="text-sm text-gray-500 mb-3">{flow.description}</p>
                                        <ul className="space-y-1 text-sm text-gray-600">
                                            {flow.tasks.map((task) => (
                                                <li key={`${flow.key}-${task.key || task.title}`}>
                                                    • {task.title}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
