'use client';

import React, { useEffect, useState } from 'react';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { fetchDocuments, fetchIsoStandards, runComplianceCheck, Document } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function ComplianceTab() {
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [standards, setStandards] = useState<any[]>([]);
    const [selectedDocId, setSelectedDocId] = useState<string>('');
    const [selectedStandardId, setSelectedStandardId] = useState<string>('');
    const [analyzing, setAnalyzing] = useState(false);

    useCopilotReadable({
        description: 'Available documents for compliance audit',
        value: documents,
        available: documents.length ? 'enabled' : 'disabled',
    }, [documents]);

    useCopilotReadable({
        description: 'Available ISO standards for compliance audit',
        value: standards,
        available: standards.length ? 'enabled' : 'disabled',
    }, [standards]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [docs, stds] = await Promise.all([
                fetchDocuments(),
                fetchIsoStandards()
            ]);
            setDocuments(docs);
            setStandards(stds);
            if (docs.length > 0) setSelectedDocId(docs[0].id);
            if (stds.length > 0) setSelectedStandardId(stds[0].id);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleAnalyze() {
        if (!selectedDocId || !selectedStandardId) return;
        setAnalyzing(true);
        try {
            const report = await runComplianceCheck(selectedDocId, selectedStandardId);
            router.push(`/app/reports/${report.id}`);
        } catch (err) {
            alert('Compliance Check failed');
            setAnalyzing(false);
        }
    }

    useCopilotAction({
        name: 'runComplianceAudit',
        description: 'Kjør samsvarssjekk (audit) for et dokument mot en ISO-standard.',
        parameters: [
            { name: 'documentId', type: 'string', description: 'ID til dokumentet', required: true },
            { name: 'isoStandardId', type: 'string', description: 'ID til ISO-standarden', required: true },
        ],
        handler: async ({ documentId, isoStandardId }) => {
            setSelectedDocId(documentId);
            setSelectedStandardId(isoStandardId);
            setAnalyzing(true);
            try {
                const report = await runComplianceCheck(documentId, isoStandardId);
                router.push(`/app/reports/${report.id}`);
                return { status: 'ok', reportId: report.id };
            } catch (err: any) {
                setAnalyzing(false);
                return { status: 'error', message: err?.message || 'Audit failed' };
            }
        },
    });

    return (
        <div className="space-y-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Compliance Audit</h1>
                <p className="text-gray-600">Audit your documents against ISO standards using AI.</p>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Document</label>
                        <select
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                            value={selectedDocId}
                            onChange={(e) => setSelectedDocId(e.target.value)}
                        >
                            {documents.map(doc => (
                                <option key={doc.id} value={doc.id}>{doc.title}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select ISO Standard</label>
                        <select
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                            value={selectedStandardId}
                            onChange={(e) => setSelectedStandardId(e.target.value)}
                        >
                            {standards.map(std => (
                                <option key={std.id} value={std.id}>{std.title} ({std.standardId})</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={handleAnalyze}
                            disabled={analyzing || !selectedDocId || !selectedStandardId}
                            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                            {analyzing ? (
                                <>
                                    <span className="animate-spin">↻</span> Analyzing...
                                </>
                            ) : (
                                <>
                                    <span>⚡️</span> Run Compliance Audit
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">How it works</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">1</div>
                            <p className="text-sm text-gray-600">Select a document you've uploaded to the platform.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">2</div>
                            <p className="text-sm text-gray-600">Choose the ISO standard you want to check against.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">3</div>
                            <p className="text-sm text-gray-600">AI analyzes the content and generates a detailed report.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
