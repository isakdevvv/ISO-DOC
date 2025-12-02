'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
            <Header />
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
