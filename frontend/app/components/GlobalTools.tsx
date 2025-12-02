'use client';

import React, { useState, useEffect } from 'react';
import PersistentCopilot from '@/app/components/PersistentCopilot';
import { fetchIsoStandards, runComplianceCheck } from '@/lib/api';
import { useCopilotReadable, useCopilotAction } from '@copilotkit/react-core';

import { useIDE } from './IDE/IDEContext';

export default function GlobalTools() {
    const { files, activeFileId } = useIDE();
    const documents = files;
    const activeDocumentId = activeFileId;
    const [activeTab, setActiveTab] = useState<'copilot' | 'compliance' | 'remediation'>('copilot');
    const [standards, setStandards] = useState<{ id: string; title: string }[]>([]);
    const [selectedStandard, setSelectedStandard] = useState<string>('');
    const [checking, setChecking] = useState(false);
    const [complianceResult, setComplianceResult] = useState<{ results: { status: string; requirement: string }[] } | null>(null);
    const [formData, setFormData] = useState<{ owner?: string; summary?: string }>({});

    useCopilotAction({
        name: 'fillRemediationForm',
        description: 'Fill out the remediation form for the active document',
        parameters: [
            { name: 'owner', type: 'string', description: 'Name of the person responsible' },
            { name: 'summary', type: 'string', description: 'Summary of the remediation plan' },
        ],
        handler: async ({ owner, summary }) => {
            setFormData({ owner, summary });
            setActiveTab('remediation');
            return 'Form filled. Please review and save.';
        },
    });

    // Make documents available to Copilot globally
    useCopilotReadable({
        description: 'All documents in the project',
        value: documents,
    }, [documents]);

    useEffect(() => {
        loadStandards();
    }, []);

    useEffect(() => {
        if (activeDocumentId) {
            setComplianceResult(null);
        }
    }, [activeDocumentId]);

    async function loadStandards() {
        try {
            const data = await fetchIsoStandards();
            setStandards(data);
        } catch (error) {
            console.error('Failed to fetch standards', error);
        }
    }

    async function runAnalysis() {
        if (!selectedStandard || !activeDocumentId) return;
        setChecking(true);
        try {
            const data = await runComplianceCheck(activeDocumentId, selectedStandard);
            setComplianceResult(data);
        } catch (error) {
            console.error(error);
        } finally {
            setChecking(false);
        }
    }

    return (
        <div className="h-full flex flex-col bg-white border-l border-gray-200 w-96">
            {/* Tool Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    className={`flex-1 py-3 text-sm font-medium ${activeTab === 'copilot' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('copilot')}
                >
                    Copilot
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-medium ${activeTab === 'compliance' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('compliance')}
                >
                    Compliance
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-medium ${activeTab === 'remediation' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('remediation')}
                >
                    Remediation
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-0">
                {activeTab === 'copilot' && (
                    <div className="h-full flex flex-col">
                        <PersistentCopilot />
                    </div>
                )}

                {activeTab === 'compliance' && (
                    <div className="p-4 space-y-4">
                        {!activeDocumentId ? (
                            <div className="text-center text-gray-500 mt-10">
                                <p>Select a document to run compliance checks.</p>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Standard</label>
                                    <select
                                        className="w-full text-sm border-gray-300 rounded-md shadow-sm"
                                        value={selectedStandard}
                                        onChange={(e) => setSelectedStandard(e.target.value)}
                                    >
                                        <option value="">Select...</option>
                                        {standards.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                    </select>
                                </div>
                                <button
                                    onClick={runAnalysis}
                                    disabled={!selectedStandard || checking}
                                    className="w-full py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {checking ? 'Checking...' : 'Run Check'}
                                </button>

                                {complianceResult && (
                                    <div className="space-y-3 mt-4">
                                        <h4 className="font-medium text-sm">Results</h4>
                                        {complianceResult.results.map((res: any, idx: number) => (
                                            <div key={idx} className="p-2 bg-gray-50 rounded border text-xs">
                                                <div className={`font-bold mb-1 ${res.status === 'COMPLIANT' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {res.status}
                                                </div>
                                                <p className="text-gray-600">{res.requirement}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'remediation' && (
                    <div className="p-4 space-y-4">
                        {!activeDocumentId ? (
                            <div className="text-center text-gray-500 mt-10">
                                <p>Select a document to view remediation.</p>
                            </div>
                        ) : (
                            <>
                                <div className="text-xs text-gray-500">
                                    Remediation form for active document
                                </div>
                                <input
                                    className="w-full text-sm border-gray-300 rounded"
                                    placeholder="Owner"
                                    value={formData.owner || ''}
                                    onChange={e => setFormData({ ...formData, owner: e.target.value })}
                                />
                                <textarea
                                    className="w-full text-sm border-gray-300 rounded h-24"
                                    placeholder="Summary"
                                    value={formData.summary || ''}
                                    onChange={e => setFormData({ ...formData, summary: e.target.value })}
                                />
                                <button className="w-full py-2 bg-green-600 text-white rounded text-sm">
                                    Save
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
