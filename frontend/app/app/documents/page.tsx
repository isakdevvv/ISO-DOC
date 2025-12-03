'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import Header from '@/app/components/Header';
import DocumentsTab from '@/app/components/DocumentsTab';
import { IDEProvider } from '@/app/components/IDE/IDEContext';

function DocumentsContent() {
    return (
        <div className="flex flex-col h-full min-h-0 bg-gray-50 overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <Header
                    title="Documents workspace"
                    subtitle="Library, editor, and approvals for every ISO clause."
                    hideSearch
                    actions={(
                        <>
                            <Link
                                href="/app/dashboard?tab=compliance"
                                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:border-gray-300"
                            >
                                Run audit
                            </Link>
                            <button
                                type="button"
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                                onClick={() => document.getElementById('file-upload')?.click()}
                            >
                                Upload files
                            </button>
                        </>
                    )}
                />

                <main className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <DocumentsTab />
                </main>
            </div>
        </div>
    );
}

export default function DocumentsPage() {
    return (
        <IDEProvider>
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                <DocumentsContent />
            </Suspense>
        </IDEProvider>
    );
}
