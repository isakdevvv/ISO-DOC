'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import DocumentsTab from '@/app/components/DocumentsTab';
import ComplianceTab from '@/app/components/ComplianceTab';
import GapAnalysisTab from '@/app/components/GapAnalysisTab';
import TemplatesTab from '@/app/components/TemplatesTab';

import { IDEProvider, useIDE } from '@/app/components/IDE/IDEContext';
import GlobalTools from '@/app/components/GlobalTools';
import { fetchDocuments } from '@/lib/api';

function DashboardInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<'documents' | 'compliance' | 'gap-analysis' | 'templates'>('documents');
    const { setFiles } = useIDE();

    useEffect(() => {
        if (tabParam === 'compliance') {
            setActiveTab('compliance');
        } else if (tabParam === 'gap-analysis') {
            setActiveTab('gap-analysis');
        } else if (tabParam === 'templates') {
            setActiveTab('templates');
        } else {
            setActiveTab('documents');
        }
    }, [tabParam]);

    // Fetch documents globally for Copilot context
    useEffect(() => {
        async function loadDocs() {
            try {
                const docs = await fetchDocuments();
                setFiles(docs);
            } catch (e) {
                console.error(e);
            }
        }
        loadDocs();
    }, [setFiles]);

    const handleTabChange = (tab: 'documents' | 'compliance' | 'gap-analysis' | 'templates') => {
        setActiveTab(tab);
        router.push(`/app/dashboard?tab=${tab}`);
    };

    return (
        <div className="flex min-h-screen bg-gray-50 overflow-hidden h-screen">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <Header />

                <div className="flex-1 flex overflow-hidden">
                    <main className={`flex-1 flex flex-col ${activeTab === 'documents' ? 'overflow-hidden' : 'p-8 overflow-y-auto'}`}>
                        <div className={`${activeTab === 'documents' ? 'h-full flex flex-col' : 'max-w-7xl mx-auto space-y-8 w-full'}`}>
                            {/* Tabs Navigation */}
                            <div className={`border-b border-gray-200 ${activeTab === 'documents' ? 'px-4 pt-2' : ''}`}>
                                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                    <button
                                        onClick={() => handleTabChange('documents')}
                                        className={`${activeTab === 'documents'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                    >
                                        Documents
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('compliance')}
                                        className={`${activeTab === 'compliance'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                    >
                                        Compliance Audit
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('gap-analysis')}
                                        className={`${activeTab === 'gap-analysis'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                    >
                                        Gap Analysis
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('templates')}
                                        className={`${activeTab === 'templates'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                                    >
                                        Templates
                                    </button>
                                </nav>
                            </div>

                            {/* Tab Content */}
                            <div className={`${activeTab === 'documents' ? 'flex-1 min-h-0' : 'mt-6'}`}>
                                {activeTab === 'documents' && <DocumentsTab />}
                                {activeTab === 'compliance' && <ComplianceTab />}
                                {activeTab === 'gap-analysis' && <GapAnalysisTab />}
                                {activeTab === 'templates' && <TemplatesTab />}
                            </div>
                        </div>
                    </main>

                    {/* Global Right Sidebar */}
                    <GlobalTools />
                </div>
            </div>
        </div>
    );
}

function DashboardContent() {
    return (
        <IDEProvider>
            <DashboardInner />
        </IDEProvider>
    );
}

export default function Dashboard() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <DashboardContent />
        </Suspense>
    );
}
