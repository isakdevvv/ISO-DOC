'use client';

import React, { useEffect, useState } from 'react';
import { useIDE } from './IDEContext';
import FileExplorer from './FileExplorer';
import EditorTabs from './EditorTabs';
import DocumentPreview from '@/app/components/DocumentPreview';
import { fetchDocumentContent } from '@/lib/api';

export default function IDELayout() {
    const { sidebarVisible, rightPanelVisible, activeFileId, files } = useIDE();
    const [contentUrl, setContentUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const activeFile = files.find(f => f.id === activeFileId);

    useEffect(() => {
        if (activeFileId) {
            loadContent(activeFileId);
        } else {
            setContentUrl(null);
        }
    }, [activeFileId]);

    async function loadContent(id: string) {
        setLoading(true);
        try {
            const blob = await fetchDocumentContent(id);
            const url = URL.createObjectURL(blob);
            setContentUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
            });
        } catch (e) {
            console.error("Failed to load content", e);
            setContentUrl(null);
        } finally {
            setLoading(false);
        }
    }

    const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');

    return (
        <div className="flex h-full border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
            {/* Sidebar */}
            {sidebarVisible && (
                <div className="w-64 flex-shrink-0 transition-all duration-300">
                    <FileExplorer />
                </div>
            )}

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-100">
                <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 pr-2">
                    <EditorTabs />
                    <div className="flex bg-gray-200 rounded p-0.5 text-xs font-medium">
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-3 py-1 rounded ${viewMode === 'preview' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Preview
                        </button>
                        <button
                            onClick={() => setViewMode('code')}
                            className={`px-3 py-1 rounded ${viewMode === 'code' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Code / JSON
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative p-4 flex items-center justify-center">
                    {activeFileId ? (
                        viewMode === 'preview' ? (
                            loading ? (
                                <div className="text-gray-500">Loading document...</div>
                            ) : contentUrl ? (
                                <div className="w-full h-full bg-white shadow rounded-lg overflow-hidden">
                                    <DocumentPreview url={contentUrl} title={activeFile?.title || 'Document'} />
                                </div>
                            ) : (
                                <div className="text-red-500">Failed to load preview</div>
                            )
                        ) : (
                            <div className="w-full h-full bg-white shadow rounded-lg overflow-auto p-4 font-mono text-sm">
                                <pre>{JSON.stringify(activeFile, null, 2)}</pre>
                            </div>
                        )
                    ) : (
                        <div className="text-gray-400 text-center">
                            <div className="text-4xl mb-2">📄</div>
                            <p>Select a document to start reviewing</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
