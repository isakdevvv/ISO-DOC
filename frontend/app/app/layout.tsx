import React from 'react';
import Sidebar from '@/app/components/Sidebar';
import PersistentCopilot from '@/app/components/PersistentCopilot';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Left Navigation Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>

            {/* Right Chat Sidebar */}
            <div className="w-[400px] border-l border-gray-200 bg-white flex flex-col">
                <PersistentCopilot />
            </div>
        </div>
    );
}
