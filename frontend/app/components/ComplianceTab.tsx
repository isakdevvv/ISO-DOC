'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import {
    fetchNodes,
    fetchRuleSets,
    fetchLatestRequirements,
    fetchRuleConflicts,
    runRuleEngine,
    fetchProjects,
    Node,
    RuleSet,
    RequirementsModel,
    RuleConflict,
    Project,
    isAuthenticationError,
} from '@/lib/api';
import dynamic from 'next/dynamic';

const ConflictResolver = dynamic(() => import('./ConflictResolver'), {
    loading: () => <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">Loading...</div>,
});

type RequirementDoc = {
    code?: string;
    title?: string;
    severity?: string;
    data?: Record<string, any>;
};

type RequirementField = {
    path?: string;
    description?: string;
    templateCode?: string;
    severity?: string;
    data?: Record<string, any>;
};

export default function ComplianceTab() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [nodes, setNodes] = useState<Node[]>([]);
    const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
    const [selectedRuleSetId, setSelectedRuleSetId] = useState<string>('');
    const [requirements, setRequirements] = useState<RequirementsModel | null>(null);
    const [conflicts, setConflicts] = useState<RuleConflict[]>([]);
    const [selectedConflict, setSelectedConflict] = useState<RuleConflict | null>(null);
    const [loadingWorkspace, setLoadingWorkspace] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

    useCopilotReadable({
        description: 'Projects available for the compliance workspace',
        value: projects.map(({ id, name }) => ({ id, name })),
        available: projects.length ? 'enabled' : 'disabled',
    }, [projects]);

    useCopilotReadable({
        description: 'Selected project powering the compliance workspace',
        value: selectedProjectId,
        available: selectedProjectId ? 'enabled' : 'disabled',
    }, [selectedProjectId]);

    useCopilotReadable({
        description: 'Nodes visible in the compliance workspace',
        value: nodes,
        available: nodes.length ? 'enabled' : 'disabled',
    }, [nodes]);

    useCopilotReadable({
        description: 'Latest requirements model powering the gap summary',
        value: requirements,
        available: requirements ? 'enabled' : 'disabled',
    }, [requirements]);

    useEffect(() => {
        (async () => {
            try {
                setLoadingWorkspace(true);
                const availableProjects = await fetchProjects();
                setProjects(availableProjects);
                const defaultProjectId = availableProjects[0]?.id;
                if (defaultProjectId) {
                    await loadWorkspace(defaultProjectId);
                } else {
                    clearWorkspaceState();
                }
            } catch (err) {
                if (isAuthenticationError(err)) {
                    return;
                }
                console.error('Failed to initialize compliance workspace', err);
            } finally {
                setLoadingWorkspace(false);
            }
        })();
    }, []);

    function clearWorkspaceState() {
        setSelectedProjectId('');
        setNodes([]);
        setRuleSets([]);
        setRequirements(null);
        setConflicts([]);
        setSelectedRuleSetId('');
    }

    async function fetchWorkspace(projectId: string) {
        const [
            fetchedNodes,
            fetchedRuleSets,
            latestRequirements,
            fetchedConflicts,
        ] = await Promise.all([
            fetchNodes(projectId),
            fetchRuleSets(projectId),
            fetchLatestRequirements(projectId),
            fetchRuleConflicts(projectId, 'OPEN'),
        ]);

        setSelectedProjectId(projectId);
        setNodes(fetchedNodes);
        setRuleSets(fetchedRuleSets);
        setRequirements(latestRequirements);
        setConflicts(fetchedConflicts);
        setSelectedRuleSetId((current) => {
            if (current && fetchedRuleSets.some((ruleSet) => ruleSet.id === current)) {
                return current;
            }
            return fetchedRuleSets[0]?.id || '';
        });
    }

    async function loadWorkspace(targetProjectId = selectedProjectId) {
        if (!targetProjectId) {
            clearWorkspaceState();
            return;
        }
        try {
            setLoadingWorkspace(true);
            await fetchWorkspace(targetProjectId);
        } catch (err) {
            if (isAuthenticationError(err)) {
                return;
            }
            console.error('Failed to load compliance workspace', err);
        } finally {
            setLoadingWorkspace(false);
        }
    }

    async function handleAnalyze() {
        if (!selectedProjectId) {
            alert('Please select a project before running the audit.');
            return;
        }
        if (!selectedRuleSetId) {
            alert('Please select at least one Rule Set.');
            return;
        }
        setAnalyzing(true);
        try {
            const report = await runRuleEngine(selectedProjectId, { ruleSetIds: [selectedRuleSetId] });
            alert(`Compliance evaluation started (ID: ${report.evaluationId}). Refresh to see updated gaps.`);
            await loadWorkspace(selectedProjectId);
        } catch (err: any) {
            if (!isAuthenticationError(err)) {
                alert(`Compliance check failed: ${err?.message ?? 'Unknown error'}`);
            }
        } finally {
            setAnalyzing(false);
        }
    }

    useCopilotAction({
        name: 'runComplianceAudit',
        description: 'Run compliance audit against a Rule Set.',
        parameters: [
            { name: 'ruleSetId', type: 'string', description: 'ID of the Rule Set', required: true },
            { name: 'projectId', type: 'string', description: 'ID of the project to evaluate', required: false },
        ],
        handler: async ({ ruleSetId, projectId }) => {
            const targetProjectId = projectId || selectedProjectId;
            if (!targetProjectId) {
                return { status: 'error', message: 'No project selected for audit' };
            }
            setSelectedRuleSetId(ruleSetId);
            setAnalyzing(true);
            try {
                const report = await runRuleEngine(targetProjectId, { ruleSetIds: [ruleSetId] });
                await loadWorkspace(targetProjectId);
                return { status: 'ok', evaluationId: report.evaluationId };
            } catch (err: any) {
                if (isAuthenticationError(err)) {
                    return { status: 'error', message: 'Authentication required' };
                }
                return { status: 'error', message: err?.message || 'Audit failed' };
            } finally {
                setAnalyzing(false);
            }
        },
    });

    const requiredDocuments = useMemo<RequirementDoc[]>(() => {
        const docs = (requirements?.payload?.requiredDocuments ?? []) as RequirementDoc[];
        return docs;
    }, [requirements]);

    const requiredFields = useMemo<RequirementField[]>(() => {
        const fields = (requirements?.payload?.requiredFields ?? []) as RequirementField[];
        return fields;
    }, [requirements]);

    const warnings = useMemo(() => {
        return Array.isArray(requirements?.warnings) ? requirements?.warnings : [];
    }, [requirements]);

    const nodeStatusSummary = useMemo(() => {
        return nodes.reduce<Record<string, number>>((acc, node) => {
            acc[node.status] = (acc[node.status] ?? 0) + 1;
            return acc;
        }, {});
    }, [nodes]);

    const criticalConflicts = conflicts.slice(0, 5);

    return (
        <div className="space-y-8">
            <header className="mb-4">
                <h1 className="text-3xl font-bold text-gray-900">Compliance Workspace</h1>
                <p className="text-gray-600">Review requirements, gaps, and run audits from one place.</p>
            </header>

            <div className="grid gap-6 xl:grid-cols-2">
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Gap & Requirements Summary</h2>
                            <p className="text-sm text-gray-500">Latest output from the Rule Engine.</p>
                        </div>
                        <button
                            onClick={loadWorkspace}
                            className="text-sm text-blue-600 hover:text-blue-800"
                            disabled={loadingWorkspace}
                        >
                            Refresh
                        </button>
                    </div>
                    {loadingWorkspace ? (
                        <div className="text-gray-500">Loading requirements…</div>
                    ) : !requirements ? (
                        <div className="text-gray-500">No requirements found. Run the Rule Engine to generate a model.</div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <p className="text-xs uppercase text-blue-600 font-semibold">Documents</p>
                                    <p className="text-2xl font-bold text-blue-900">{requiredDocuments.length}</p>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                                    <p className="text-xs uppercase text-amber-600 font-semibold">Fields</p>
                                    <p className="text-2xl font-bold text-amber-900">{requiredFields.length}</p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                                    <p className="text-xs uppercase text-red-600 font-semibold">Warnings</p>
                                    <p className="text-2xl font-bold text-red-900">{warnings.length}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-800 mb-2">Key Documents</h3>
                                {requiredDocuments.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No documents required.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {requiredDocuments.slice(0, 5).map((doc, index) => (
                                            <li key={`${doc.code}-${index}`} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                                                <div>
                                                    <p className="font-medium text-gray-900">{doc.title || doc.code || 'Untitled'}</p>
                                                    {doc.data?.description && <p className="text-xs text-gray-500">{doc.data.description}</p>}
                                                </div>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{doc.severity || 'INFO'}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-800 mb-2">Fields to Track</h3>
                                {requiredFields.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No required fields detected.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {requiredFields.slice(0, 5).map((field, index) => (
                                            <li key={`${field.path}-${index}`} className="text-sm text-gray-700 border border-gray-100 rounded-lg px-3 py-2">
                                                <span className="font-medium">{field.path || field.templateCode}</span>
                                                <span className="text-gray-500"> — {field.description || 'Required field'}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Compliance Audit</h2>
                    <p className="text-sm text-gray-500 mb-6">Select a project and rule set, then run a new audit. The result will update the gap summary above.</p>

                    <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                    <select
                        value={selectedProjectId}
                        onChange={(e) => loadWorkspace(e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 mb-4"
                        disabled={loadingWorkspace || projects.length === 0}
                    >
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                        {projects.length === 0 && <option value="">No projects available</option>}
                    </select>

                    <label className="block text-sm font-medium text-gray-700 mb-2">Rule Set</label>
                    <select
                        value={selectedRuleSetId}
                        onChange={(e) => setSelectedRuleSetId(e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3"
                        disabled={!selectedProjectId || ruleSets.length === 0}
                    >
                        {ruleSets.map((rs) => (
                            <option key={rs.id} value={rs.id}>{rs.title} ({rs.code})</option>
                        ))}
                        {ruleSets.length === 0 && <option value="">No rule sets available</option>}
                    </select>

                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing || !selectedRuleSetId || !selectedProjectId}
                        className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {analyzing ? (
                            <>
                                <span className="animate-spin">↻</span> Running audit…
                            </>
                        ) : (
                            <>
                                <span>⚡</span> Run Compliance Audit
                            </>
                        )}
                    </button>
                </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Node Status</h2>
                    {nodes.length === 0 ? (
                        <p className="text-gray-500 text-sm">No nodes found for this project.</p>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(nodeStatusSummary).map(([status, count]) => (
                                    <div key={status} className="px-3 py-2 rounded-lg bg-gray-50 border text-sm text-gray-700">
                                        <span className="font-semibold">{status}</span>: {count}
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-gray-100 pt-3">
                                <ul className="divide-y divide-gray-100">
                                    {nodes.slice(0, 5).map((node) => (
                                        <li key={node.id} className="py-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{node.title}</p>
                                                <p className="text-xs text-gray-500">{node.type}</p>
                                            </div>
                                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{node.status}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </section>

                <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Rule Conflicts</h2>
                    {criticalConflicts.length === 0 ? (
                        <p className="text-gray-500 text-sm">No open conflicts 🎉</p>
                    ) : (
                        <ul className="space-y-3">
                            {criticalConflicts.map((conflict) => (
                                <li
                                    key={conflict.id}
                                    className="border border-red-100 rounded-lg p-3 bg-red-50/40 cursor-pointer hover:bg-red-50 transition"
                                    onClick={() => setSelectedConflict(conflict)}
                                >
                                    <p className="text-sm font-semibold text-red-900">{conflict.conflictType}</p>
                                    <p className="text-xs text-red-700 mt-1">
                                        {conflict.ruleACode} ↔ {conflict.ruleBCode}
                                    </p>
                                    {conflict.message && <p className="text-xs text-red-600 mt-2">{conflict.message}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {selectedConflict && (
                <ConflictResolver
                    conflict={selectedConflict}
                    onResolved={() => {
                        setSelectedConflict(null);
                        loadWorkspace();
                    }}
                    onCancel={() => setSelectedConflict(null)}
                />
            )}
        </div>
    );
}
