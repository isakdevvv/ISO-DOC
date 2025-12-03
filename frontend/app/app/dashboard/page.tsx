'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import ComplianceTab from '@/app/components/ComplianceTab';
import TemplatesTab from '@/app/components/TemplatesTab';
import HomeTab from '../../components/HomeTab';

type DashboardTab = 'home' | 'compliance' | 'templates';

function DashboardInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<DashboardTab>('home');

    useEffect(() => {
        if (tabParam === 'documents') {
            router.replace('/app/documents');
            setActiveTab('home');
            return;
        }

        if (tabParam === 'gap-analysis') {
            router.replace('/app/dashboard?tab=compliance');
            setActiveTab('compliance');
            return;
        }

        if (tabParam === 'templates' || tabParam === 'compliance' || tabParam === 'home') {
            setActiveTab(tabParam as DashboardTab);
        } else {
            setActiveTab('home');
        }
    }, [tabParam, router]);

    return (
        <div className="flex flex-col min-h-full bg-gray-50">
            <Header
                title="Compliance Overview"
                subtitle="Track ISO readiness, active audits, and non-conformities for your organizations."
                actions={(
                    <>
                        <Link
                            href="/app/documents"
                            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:border-gray-300"
                        >
                            Open documents
                        </Link>
                        <Link
                            href="/app/audits"
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                        >
                            Schedule audit
                        </Link>
                    </>
                )}
            />
            <main className="flex-1 p-8">
                <div className="max-w-7xl mx-auto space-y-8 w-full">
                    {activeTab === 'home' && <HomeTab />}
                    {activeTab === 'compliance' && <ComplianceTab />}
                    {activeTab === 'templates' && <TemplatesTab />}
                </div>
            </main>
        </div>
    );
}

function DashboardContent() {
    return (
        <DashboardInner />
    );
}

export default function Dashboard() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <DashboardContent />
        </Suspense>
    );
}
