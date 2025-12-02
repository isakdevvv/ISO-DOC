'use client';

import React, { useEffect, useState } from 'react';
import { useCopilotReadable } from '@copilotkit/react-core';
import { fetchComplianceReport } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ComplianceResult {
    id: string;
    requirement: string;
    status: string;
    reasoning: string;
    evidence: string;
    clauseNumber: string;
}

interface ComplianceReport {
    id: string;
    overallScore: number;
    status: string;
    createdAt: string;
    document: { title: string };
    isoStandard: { title: string };
    results: ComplianceResult[];
}

export default function ComplianceReportPage() {
    const params = useParams();
    const [report, setReport] = useState<ComplianceReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (params.id) {
            loadReport(params.id as string);
        }
    }, [params.id]);

    async function loadReport(id: string) {
        try {
            const data = await fetchComplianceReport(id);
            setReport(data);
        } catch (err) {
            setError('Failed to load report');
        } finally {
            setLoading(false);
        }
    }

    useCopilotReadable({
        description: 'Aktiv compliance-rapport med detaljerte resultater',
        value: report,
        available: report ? 'enabled' : 'disabled',
    }, [report]);

    if (loading) return <div className="p-8 text-center">Loading report...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
    if (!report) return <div className="p-8 text-center">Report not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                <Link href="/app/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Dashboard</Link>

                <header className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Compliance Report</h1>
                            <p className="text-gray-600">
                                Document: <span className="font-medium text-gray-900">{report.document.title}</span>
                            </p>
                            <p className="text-gray-600">
                                Standard: <span className="font-medium text-gray-900">{report.isoStandard.title}</span>
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                Generated on {new Date(report.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Overall Score</div>
                            <div className={`text-5xl font-bold ${report.overallScore >= 80 ? 'text-green-600' : report.overallScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {Math.round(report.overallScore)}%
                            </div>
                            <div className="mt-2 inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                {report.status}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-800">Detailed Analysis</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {report.results.map((result) => (
                            <div key={result.id} className="p-6 hover:bg-gray-50 transition">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded text-gray-700">
                                            {result.clauseNumber || 'N/A'}
                                        </span>
                                        <h3 className="text-md font-medium text-gray-900">{result.requirement}</h3>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shrink-0 ${result.status === 'COMPLIANT' ? 'bg-green-100 text-green-800' :
                                            result.status === 'NON_COMPLIANT' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {result.status}
                                    </span>
                                </div>

                                <div className="ml-12 space-y-3">
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Reasoning</h4>
                                        <p className="text-sm text-gray-700">{result.reasoning}</p>
                                    </div>
                                    {result.evidence && (
                                        <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                            <h4 className="text-xs font-semibold text-blue-700 uppercase mb-1">Evidence Found</h4>
                                            <p className="text-sm text-blue-900 italic">"{result.evidence}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
