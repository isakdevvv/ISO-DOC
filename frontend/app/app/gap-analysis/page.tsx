'use client';

import Header from '@/app/components/Header';
import ComplianceTab from '@/app/components/ComplianceTab';

export default function GapAnalysisPage() {
    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
                <Header
                    title="Compliance Workspace"
                    subtitle="Gap analysis, clause coverage, and AI remediation planning."
                />
                <main className="flex-1 flex flex-col p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto space-y-8 w-full">
                        <ComplianceTab />
                    </div>
                </main>
            </div>
        </div>
    );
}
