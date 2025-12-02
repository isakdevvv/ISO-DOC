'use client';

import React, { useEffect, useState } from 'react';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { fetchIsoStandards, runGapAnalysis, generateGapReport } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

export default function GapAnalysisTab() {
    const [standards, setStandards] = useState<any[]>([]);
    const [selectedStandard, setSelectedStandard] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [report, setReport] = useState<any>(null);
    const [fullReport, setFullReport] = useState<any>(null);

    useCopilotReadable({
        description: 'Available ISO standards for gap analysis',
        value: standards,
        available: standards.length ? 'enabled' : 'disabled',
    }, [standards]);

    useCopilotReadable({
        description: 'Selected ISO standard for gap analysis',
        value: selectedStandard,
        available: selectedStandard ? 'enabled' : 'disabled',
    }, [selectedStandard]);

    useCopilotReadable({
        description: 'Latest gap analysis report',
        value: report,
        available: report ? 'enabled' : 'disabled',
    }, [report]);

    useEffect(() => {
        loadStandards();
    }, []);

    async function loadStandards() {
        try {
            const data = await fetchIsoStandards();
            setStandards(data);
            if (data.length > 0) setSelectedStandard(data[0].id);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleRunAnalysis() {
        if (!selectedStandard) return;
        setLoading(true);
        setFullReport(null); // Reset full report
        try {
            const result = await runGapAnalysis(selectedStandard);
            setReport(result);
        } catch (err) {
            alert('Gap Analysis failed');
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerateFullReport() {
        if (!selectedStandard) return;
        setGeneratingReport(true);
        try {
            const result = await generateGapReport(selectedStandard);
            setFullReport(result);
        } catch (err) {
            alert('Failed to generate full report');
        } finally {
            setGeneratingReport(false);
        }
    }

    useCopilotAction({
        name: 'runGapAnalysis',
        description: 'Kjør gap-analyse for valgt ISO-standard og vis resultatene.',
        parameters: [
            { name: 'isoStandardId', type: 'string', description: 'ID til ISO-standarden', required: true },
        ],
        handler: async ({ isoStandardId }) => {
            setSelectedStandard(isoStandardId);
            setLoading(true);
            try {
                const result = await runGapAnalysis(isoStandardId);
                setReport(result);
                return {
                    status: 'ok',
                    missing: result?.gapAnalysis?.filter((r: any) => r.status === 'MISSING')?.length ?? 0,
                    total: result?.gapAnalysis?.length ?? 0,
                };
            } catch (err: any) {
                return { status: 'error', message: err?.message || 'Gap analysis failed' };
            } finally {
                setLoading(false);
            }
        },
    });

    return (
        <div className="space-y-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Gap Analysis</h1>
                <p className="text-gray-600">Identify missing required documents for ISO compliance.</p>
            </header>

            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select ISO Standard</label>
                        <select
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                            value={selectedStandard}
                            onChange={(e) => setSelectedStandard(e.target.value)}
                        >
                            {standards.map(std => (
                                <option key={std.id} value={std.id}>{std.title}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleRunAnalysis}
                        disabled={loading || !selectedStandard}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Analyzing...' : 'Run Gap Analysis'}
                    </button>
                    <button
                        onClick={handleGenerateFullReport}
                        disabled={generatingReport || !selectedStandard}
                        className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {generatingReport ? 'Generating...' : '✨ Generate Full Report'}
                    </button>
                </div>
            </div>

            {fullReport && (
                <div className="space-y-8">
                    <div className="bg-white rounded-lg shadow p-8 border-l-4 border-purple-500">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Executive Summary</h2>
                        <div className="prose max-w-none text-gray-700">
                            <ReactMarkdown>{fullReport.executiveSummary}</ReactMarkdown>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-8 border-l-4 border-blue-500">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Remediation Plan</h2>
                        <div className="prose max-w-none text-gray-700">
                            <ReactMarkdown>{fullReport.remediationPlan}</ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}

            {report && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-800">Missing Documents: {report.standardTitle}</h2>
                        <div className="text-sm text-gray-500">
                            Missing: {report.gapAnalysis.filter((r: any) => r.status === 'MISSING').length} / {report.gapAnalysis.length}
                        </div>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required Document</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matched Document</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {report.gapAnalysis.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{item.requiredDocument.title}</div>
                                        <div className="text-sm text-gray-500">{item.requiredDocument.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.requiredDocument.type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === 'FULFILLED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.matchedDocument ? (
                                            <a href={`/app/documents/${item.matchedDocument.id}`} className="text-blue-600 hover:underline">
                                                {item.matchedDocument.title}
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
