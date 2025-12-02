'use client';

import React, { Suspense } from 'react';
import Header from '@/app/components/Header';
import DocumentsTab from '@/app/components/DocumentsTab';
import { IDEProvider } from '@/app/components/IDE/IDEContext';

function DocumentsContent() {
    return (
        <div className="flex flex-col h-full min-h-0 bg-gray-50 overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
                <Header />

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
