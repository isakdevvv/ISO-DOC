'use client';

import React, { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import { useNotifications, useBatchProgress } from '@/lib/hooks';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    hideSearch?: boolean;
    children?: React.ReactNode;
}

export default function Header({
    title = 'ISO Doc Workspace',
    subtitle = 'Monitor compliance across documents, projects, and audits.',
    actions,
    hideSearch = false,
    children,
}: HeaderProps) {
    const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
    const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
    const progress = useBatchProgress(activeBatchId);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const handleBatchStart: EventListener = (event) => {
            const customEvent = event as CustomEvent<string>;
            if (typeof customEvent.detail === 'string') {
                setActiveBatchId(customEvent.detail);
            }
        };
        window.addEventListener('batch-upload-start', handleBatchStart);
        return () => window.removeEventListener('batch-upload-start', handleBatchStart);
    }, []);

    useEffect(() => {
        if (!progress) return;

        const isComplete = progress.total === 0
            || (progress.processed + progress.failed >= progress.total && progress.total > 0);

        if (isComplete) {
            const timer = setTimeout(() => setActiveBatchId(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [progress]);

    const uploadPercent = progress?.total
        ? Math.round((progress.processed / progress.total) * 100)
        : 0;

    return (
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex flex-col gap-4 sticky top-0 z-10">
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[220px]">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                </div>

                {!hideSearch && (
                    <div className="flex-1 min-w-[240px] max-w-xl w-full">
                        <SearchBar />
                    </div>
                )}

                <div className="flex items-center gap-3 flex-wrap justify-end">
                    {actions && (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            {actions}
                        </div>
                    )}

                    <div className="relative">
                        <button
                            className="p-2 text-gray-400 hover:text-gray-600 relative"
                            onClick={() => setShowDropdown(!showDropdown)}
                        >
                            🔔
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-700">Notifications</h3>
                                    <button onClick={() => markAllRead()} className="text-xs text-blue-600 hover:text-blue-800">
                                        Mark all read
                                    </button>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div
                                                key={n.id}
                                                className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer ${n.read ? 'opacity-60' : 'bg-blue-50/30'}`}
                                                onClick={() => markRead(n.id)}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${n.type === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                                                        n.type === 'ERROR' ? 'bg-red-100 text-red-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {n.type}
                                                    </span>
                                                    <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleTimeString()}</span>
                                                </div>
                                                <h4 className="text-sm font-medium text-gray-800">{n.title}</h4>
                                                <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        U
                    </div>
                </div>
            </div>

            {activeBatchId && progress && (
                <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Uploading... {progress.processed} of {progress.total}</span>
                        <span>{uploadPercent}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${uploadPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {children && (
                <div className="w-full">
                    {children}
                </div>
            )}
        </header>
    );
}
