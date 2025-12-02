'use client';

import React, { useEffect, useState } from 'react';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { fetchNode, fetchRuleSets, runRuleEngine, fetchFileContent, Node, RuleSet, updateNode } from '@/lib/api';
import DocumentPreview from '@/app/components/DocumentPreview';

type RemediationForm = {
    owner?: string | null;
    dueDate?: string | null;
    status?: string | null;
    summary?: string | null;
    nextSteps?: string | null;
};

interface DocumentDetailViewProps {
    documentId: string;
    onBack: () => void;
}

export default function DocumentDetailView({ documentId, onBack }: DocumentDetailViewProps) {
    const [node, setNode] = useState<Node | null>(null);
    const [contentUrl, setContentUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Compliance State
    const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
    const [selectedRuleSetId, setSelectedRuleSetId] = useState<string>('');
    const [checking, setChecking] = useState(false);
    const [complianceResult, setComplianceResult] = useState<{ results: { status: string; requirement: string; reasoning: string; evidence?: string }[] } | null>(null);
    const [remediationNote, setRemediationNote] = useState('');
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [suggestedRequirement, setSuggestedRequirement] = useState<string | null>(null);
    const [suggestedOwner, setSuggestedOwner] = useState<string | null>(null);
    const [formData, setFormData] = useState<RemediationForm>({
        owner: '',
        dueDate: '',
        status: '',
        summary: '',
        nextSteps: '',
    });
    const [formSavedAt, setFormSavedAt] = useState<string | null>(null);

    useCopilotReadable({
        description: 'Node metadata',
        value: node,
        available: node ? 'enabled' : 'disabled',
    }, [node]);

    useCopilotReadable({
        description: 'Available Rule Sets',
        value: ruleSets,
        available: ruleSets.length ? 'enabled' : 'disabled',
    }, [ruleSets]);

    useCopilotReadable({
        description: 'Selected Rule Set for this node',
        value: selectedRuleSetId,
        available: selectedRuleSetId ? 'enabled' : 'disabled',
    }, [selectedRuleSetId]);

    useCopilotReadable({
        description: 'Latest compliance check result',
        value: complianceResult,
        available: complianceResult ? 'enabled' : 'disabled',
    }, [complianceResult]);

    useCopilotReadable({
        description: 'Remediation note draft the user is editing',
        value: remediationNote,
    }, [remediationNote]);

    useCopilotReadable({
        description: 'Structured remediation form fields',
        value: formData,
    }, [formData]);

    useCopilotReadable({
        description: 'Remediation form completeness',
        value: {
            ownerFilled: Boolean(formData.owner),
            dueDateFilled: Boolean(formData.dueDate),
            statusFilled: Boolean(formData.status),
            summaryFilled: Boolean(formData.summary),
            nextStepsFilled: Boolean(formData.nextSteps),
        },
    }, [formData]);

    useEffect(() => {
        if (node?.data && typeof node.data === 'object' && 'remediationForm' in node.data) {
            const form = (node.data as any).remediationForm;
            setFormData({
                owner: form?.owner || '',
                dueDate: form?.dueDate || '',
                status: form?.status || '',
                summary: form?.summary || '',
                nextSteps: form?.nextSteps || '',
            });
        }
    }, [node]);

    useEffect(() => {
        if (!node?.id) return;
        const safeFormData = {
            owner: formData.owner || undefined,
            dueDate: formData.dueDate || undefined,
            status: formData.status || undefined,
            summary: formData.summary || undefined,
            nextSteps: formData.nextSteps || undefined,
        };

        // Update node data with remediation form
        const currentData = (node.data as any) || {};
        updateNode(node.id, {
            data: { ...currentData, remediationForm: safeFormData }
        })
            .then(() => setFormSavedAt(new Date().toISOString()))
            .catch((e) => console.error('Failed to persist remediation form', e));
    }, [formData, node?.id]);

    useEffect(() => {
        if (documentId) {
            loadNode(documentId);
            loadRuleSets();
        }
    }, [documentId]);

    useEffect(() => {
        return () => {
            if (contentUrl) {
                URL.revokeObjectURL(contentUrl);
            }
        };
    }, [contentUrl]);

    async function loadNode(id: string) {
        try {
            const n = await fetchNode(id);
            setNode(n);

            // Fetch content blob if node has files
            if (n.files && n.files.length > 0) {
                try {
                    const blob = await fetchFileContent(n.files[0].id);
                    const url = URL.createObjectURL(blob);
                    setContentUrl(url);
                } catch (e) {
                    console.error("Failed to load file content", e);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function loadRuleSets() {
        try {
            const data = await fetchRuleSets('default-project-id'); // TODO: dynamic project id
            setRuleSets(data);
        } catch (error) {
            console.error('Failed to fetch rule sets', error);
        }
    }

    async function runAnalysis() {
        if (!selectedRuleSetId || !node) return;
        setChecking(true);
        setComplianceResult(null);

        try {
            // TODO: dynamic project id
            const report = await runRuleEngine('default-project-id', { ruleSetIds: [selectedRuleSetId] });
            // Map report to complianceResult format if needed, or update UI to show report
            // For now, let's just show raw report or a simplified version
            setComplianceResult({
                results: report.requirementsModel?.payload?.ruleHits?.map((hit: any) => ({
                    status: hit.outcomeType === 'PASS' ? 'COMPLIANT' : 'NON_COMPLIANT', // Simplified mapping
                    requirement: hit.ruleCode,
                    reasoning: hit.metadata?.reasoning || 'Rule evaluation result',
                    evidence: hit.metadata?.evidence
                })) || []
            });
        } catch (error) {
            console.error('Compliance check failed', error);
        } finally {
            setChecking(false);
        }
    }

    useCopilotAction({
        name: 'draftRemediationNote',
        description: 'Draft remediation text the user can paste into the remediation note field for this document.',
        parameters: [
            {
                name: 'requirement',
                type: 'string',
                description: 'Requirement or clause to address',
            },
            {
                name: 'findingSummary',
                type: 'string',
                description: 'Short description of the finding or gap',
                required: false,
            },
            {
                name: 'draftText',
                type: 'string',
                description: 'Draft note the user can paste into the document',
            },
            {
                name: 'owner',
                type: 'string',
                description: 'Suggested owner for the action item',
                required: false,
            },
            {
                name: 'dueDate',
                type: 'string',
                description: 'Suggested due date for the action item',
                required: false,
            },
        ],
        handler: async ({ requirement, findingSummary, draftText, owner }) => {
            const safeDraft = draftText || findingSummary || '';
            setAiSuggestion(safeDraft);
            setSuggestedRequirement(requirement || null);
            setSuggestedOwner(owner || null);
            return { accepted: false, draft: safeDraft, requirement };
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render: (props: any) => {
            const { args, respond, status } = props;
            if (status === 'complete') {
                return (
                    <div className="p-3 border rounded-lg bg-gray-100 text-gray-500 text-sm italic">
                        ✓ Remediation note processed.
                    </div>
                );
            }
            return (
                <div className="p-3 border rounded-lg bg-blue-50 text-gray-900 space-y-2">
                    <div className="font-semibold">Insert this remediation note?</div>
                    {args.requirement && <p className="text-xs text-gray-600">Requirement: {args.requirement}</p>}
                    {args.findingSummary && <p className="text-xs text-gray-600">Finding: {args.findingSummary}</p>}
                    <div className="bg-white border rounded p-2 text-sm text-gray-800 whitespace-pre-wrap">
                        {args.draftText || args.findingSummary || 'No draft provided yet.'}
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
                            onClick={() => {
                                const note = args.draftText || args.findingSummary || '';
                                setRemediationNote((prev) => (prev ? `${prev}\n\n${note}` : note));
                                setAiSuggestion(null);
                                respond({ approved: true, note });
                            }}
                        >
                            Use it
                        </button>
                        <button
                            className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
                            onClick={() => {
                                setAiSuggestion(null);
                                respond({ approved: false });
                            }}
                        >
                            Dismiss
                        </button>
                    </div>
                    {status === 'inProgress' && <p className="text-xs text-blue-700">Waiting for your approval...</p>}
                </div>
            )
        },
    });

    useCopilotAction({
        name: 'fillRemediationForm',
        description: 'Fyll ut de vanligste feltene i remediation-skjemaet (eier, frist, status, sammendrag, neste steg). Krever bruker-godkjenning.',
        parameters: [
            { name: 'owner', type: 'string', description: 'Foreslått eier for tiltaket', required: false },
            { name: 'dueDate', type: 'string', description: 'Foreslått frist (ISO date eller naturlig språk)', required: false },
            { name: 'status', type: 'string', description: 'Status (f.eks. OPEN, IN_PROGRESS, DONE)', required: false },
            { name: 'summary', type: 'string', description: 'Kort sammendrag av hva som må gjøres', required: false },
            { name: 'nextSteps', type: 'string', description: 'Neste steg / tiltak', required: false },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render: (props: any) => {
            const { args, respond, status } = props;
            if (status === 'complete') {
                return (
                    <div className="p-3 border rounded-lg bg-gray-100 text-gray-500 text-sm italic">
                        ✓ Form filled.
                    </div>
                );
            }
            return (
                <div className="p-3 border rounded-lg bg-blue-50 text-gray-900 space-y-2">
                    <div className="font-semibold">Foreslå utfylling av skjema</div>
                    <ul className="list-disc pl-4 text-sm text-gray-800 space-y-1">
                        {args.owner && <li><strong>Eier:</strong> {args.owner}</li>}
                        {args.dueDate && <li><strong>Frist:</strong> {args.dueDate}</li>}
                        {args.status && <li><strong>Status:</strong> {args.status}</li>}
                        {args.summary && <li><strong>Sammendrag:</strong> {args.summary}</li>}
                        {args.nextSteps && <li><strong>Neste steg:</strong> {args.nextSteps}</li>}
                        {!args.owner && !args.dueDate && !args.status && !args.summary && !args.nextSteps && (
                            <li className="text-gray-500">Ingen forslag mottatt ennå.</li>
                        )}
                    </ul>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
                            onClick={() => {
                                setFormData((prev) => ({
                                    owner: args.owner || prev.owner,
                                    dueDate: args.dueDate || prev.dueDate,
                                    status: args.status || prev.status,
                                    summary: args.summary || prev.summary,
                                    nextSteps: args.nextSteps || prev.nextSteps,
                                }));
                                respond({ applied: true, appliedFields: Object.keys(args).filter((k) => (args as Record<string, string | undefined>)[k]) });
                            }}
                        >
                            Godkjenn og fyll ut
                        </button>
                        <button
                            className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
                            onClick={() => respond({ applied: false })}
                        >
                            Avbryt
                        </button>
                    </div>
                </div>
            )
        },
    });

    const allowedFields: Array<keyof RemediationForm> = ['owner', 'dueDate', 'status', 'summary', 'nextSteps'];

    useCopilotAction({
        name: 'setRemediationField',
        description: 'Sett ett bestemt felt i remediation-skjemaet. Krever bruker-godkjenning.',
        parameters: [
            { name: 'field', type: 'string', description: 'Felt: owner | dueDate | status | summary | nextSteps', required: true },
            { name: 'value', type: 'string', description: 'Verdien som skal settes', required: true },
        ],
        handler: async ({ field, value }) => {
            if (!allowedFields.includes(field as keyof RemediationForm)) {
                return { applied: false, message: 'Ugyldig felt' };
            }
            setFormData((prev) => ({ ...prev, [field]: value }));
            return { applied: true, field, value };
        },
    });

    if (loading) return <div className="p-8">Loading...</div>;
    if (!node) return <div className="p-8">Node not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="w-full max-w-[98%] mx-auto bg-white rounded-lg shadow p-6">
                <header className="mb-8 border-b pb-4 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{node.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Uploaded: {new Date(node.createdAt).toLocaleDateString()}</span>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                {node.type}
                            </span>
                            {/* TODO: Add error display if needed */}
                            <button
                                onClick={() => alert('Export not implemented yet')}
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                                ⬇️ Download JSON
                            </button>
                        </div>
                    </div>
                    <button onClick={onBack} className="text-blue-600 hover:text-blue-800 text-sm">
                        &larr; Back to Dashboard
                    </button>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-9 gap-6">
                    {/* Left Column: Document Info & Preview */}
                    <div className="space-y-8 xl:col-span-5">
                        {/* File Preview */}
                        <div className="h-[calc(100vh-200px)] min-h-[600px]">
                            {contentUrl ? (
                                <DocumentPreview
                                    url={contentUrl}
                                    title={node.title}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg text-gray-500">
                                    {node.files && node.files.length > 0 ? 'Loading preview...' : 'No content available'}
                                </div>
                            )}
                        </div>

                        {/* Metadata (JSON View) */}
                        <div className="border rounded-lg p-4 bg-gray-50">
                            <h2 className="text-xl font-semibold mb-4">Metadata (JSON)</h2>
                            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-sm font-mono max-h-60">
                                {JSON.stringify(node, null, 2)}
                            </pre>
                        </div>
                    </div>

                    {/* Middle Column: Compliance Agent & Forms */}
                    <div className="space-y-8 xl:col-span-4">
                        <div className="border rounded-lg p-6 bg-white shadow-sm border-blue-100">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <span className="text-2xl">🛡️</span> Compliance Analyst
                            </h2>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Rule Set</label>
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                        value={selectedRuleSetId}
                                        onChange={(e) => setSelectedRuleSetId(e.target.value)}
                                    >
                                        <option value="">-- Select Rule Set --</option>
                                        {ruleSets.map(rs => (
                                            <option key={rs.id} value={rs.id}>{rs.title} ({rs.code})</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={runAnalysis}
                                        disabled={!selectedRuleSetId || checking}
                                        className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${(!selectedRuleSetId || checking) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {checking ? 'Analyzing...' : 'Run Check'}
                                    </button>
                                </div>
                            </div>

                            {complianceResult && (
                                <div className="space-y-4">
                                    <h3 className="font-medium text-gray-900">Analysis Results</h3>
                                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                        {complianceResult.results.map((res, idx) => (
                                            <div key={idx} className={`p-4 rounded-lg border ${res.status === 'COMPLIANT' ? 'bg-green-50 border-green-200' :
                                                res.status === 'NON_COMPLIANT' ? 'bg-red-50 border-red-200' :
                                                    'bg-yellow-50 border-yellow-200'
                                                }`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${res.status === 'COMPLIANT' ? 'bg-green-200 text-green-800' :
                                                        res.status === 'NON_COMPLIANT' ? 'bg-red-200 text-red-800' :
                                                            'bg-yellow-200 text-yellow-800'
                                                        }`}>
                                                        {res.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-gray-900 mb-2">Requirement:</p>
                                                <p className="text-sm text-gray-600 mb-3 italic">&quot;{res.requirement}&quot;</p>

                                                <p className="text-sm font-medium text-gray-900 mb-1">Reasoning:</p>
                                                <p className="text-sm text-gray-700 mb-3">{res.reasoning}</p>

                                                {res.evidence && (
                                                    <>
                                                        <p className="text-sm font-medium text-gray-900 mb-1">Evidence:</p>
                                                        <p className="text-xs text-gray-500 bg-white p-2 rounded border">&quot;{res.evidence}&quot;</p>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border rounded-lg p-6 bg-white shadow-sm border-blue-100 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">Remediation notes</h3>
                                    <p className="text-sm text-gray-500">Human approval area for text Copilot suggests.</p>
                                </div>
                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-semibold">Human in the loop</span>
                            </div>

                            {aiSuggestion && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-800 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div className="font-semibold text-gray-900">Suggested note</div>
                                        <div className="text-xs text-gray-600">{suggestedRequirement || 'General'}</div>
                                    </div>
                                    <p className="whitespace-pre-wrap">{aiSuggestion}</p>
                                    {suggestedOwner && <p className="text-xs text-gray-600">Suggested owner: {suggestedOwner}</p>}
                                    <div className="flex gap-2">
                                        <button
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
                                            onClick={() => {
                                                setRemediationNote((prev) => (prev ? `${prev}\n\n${aiSuggestion}` : aiSuggestion));
                                                setAiSuggestion(null);
                                            }}
                                        >
                                            Accept & paste
                                        </button>
                                        <button
                                            className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
                                            onClick={() => setAiSuggestion(null)}
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            )}

                            <label className="block text-sm font-medium text-gray-700">
                                Working note
                                <textarea
                                    className="mt-2 w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[180px]"
                                    placeholder="Track remediation ideas, action items, or wording you want to paste into the document."
                                    value={remediationNote}
                                    onChange={(e) => setRemediationNote(e.target.value)}
                                />
                            </label>
                            <p className="text-xs text-gray-500">Copilot can read this note to refine it or keep a running draft for the document.</p>
                        </div>

                        <div className="border rounded-lg p-6 bg-white shadow-sm border-blue-100 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">Remediation form</h3>
                                    <p className="text-sm text-gray-500">Fyll manuelt eller la Copilot foreslå feltene. Lagres automatisk.</p>
                                </div>
                                <div className={`text-xs px-2 py-1 rounded-full font-semibold ${formData.owner && formData.dueDate && formData.status && formData.summary && formData.nextSteps ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                                    {formData.owner && formData.dueDate && formData.status && formData.summary && formData.nextSteps ? 'Alt er fylt ut' : 'Mangler felter'}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="text-sm font-medium text-gray-700 flex flex-col gap-1">
                                    Eier
                                    <input
                                        className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.owner || ''}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, owner: e.target.value }))}
                                        placeholder="Navn på ansvarlig"
                                    />
                                </label>
                                <label className="text-sm font-medium text-gray-700 flex flex-col gap-1">
                                    Frist
                                    <input
                                        type="date"
                                        className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.dueDate || ''}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                                    />
                                </label>
                                <label className="text-sm font-medium text-gray-700 flex flex-col gap-1">
                                    Status
                                    <select
                                        className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.status || ''}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                                    >
                                        <option value="">Velg status</option>
                                        <option value="OPEN">Open</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="DONE">Done</option>
                                    </select>
                                </label>
                                <label className="text-sm font-medium text-gray-700 flex flex-col gap-1">
                                    Neste steg
                                    <input
                                        className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.nextSteps || ''}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, nextSteps: e.target.value }))}
                                        placeholder="Hva skjer videre?"
                                    />
                                </label>
                            </div>

                            <label className="text-sm font-medium text-gray-700 flex flex-col gap-1">
                                Sammendrag
                                <textarea
                                    className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
                                    value={formData.summary || ''}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
                                    placeholder="Kort beskrivelse av tiltaket"
                                />
                            </label>

                            <div className="flex items-center justify-between text-xs text-gray-500 mt-4">
                                <span>Copilot kan trigge “fillRemediationForm” for å foreslå feltene basert på dokument/rapport.</span>
                                <div className="flex items-center gap-3">
                                    <span>
                                        {formSavedAt ? `Autolagret lokalt ${new Date(formSavedAt).toLocaleTimeString()}` : 'Ikke lagret lokalt'}
                                    </span>
                                    <button
                                        onClick={async () => {
                                            if (!node) return;
                                            try {
                                                const currentData = (node.data as any) || {};
                                                const updatedData = {
                                                    ...currentData,
                                                    remediationForm: formData
                                                };

                                                await updateNode(node.id, { data: updatedData });
                                                alert('Lagret til server!');
                                                // Reload to confirm
                                                loadNode(node.id);
                                            } catch (e) {
                                                console.error('Failed to save to server', e);
                                                alert('Feil ved lagring til server');
                                            }
                                        }}
                                        className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
                                    >
                                        Lagre til Server
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}
