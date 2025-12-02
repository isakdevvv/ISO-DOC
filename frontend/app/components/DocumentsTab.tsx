'use client';

import React, { useEffect, useState } from 'react';
import { useCopilotReadable } from '@copilotkit/react-core';
import { fetchDocuments, uploadDocuments, commitDocuments, deleteDocument, fetchDashboardStats, Document as ApiDocument, ReviewDraft } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIDE, Document } from './IDE/IDEContext';
import IDELayout from './IDE/IDELayout';

// Sync component to bridge fetched documents with IDE context
const DataSync = ({ docs, initialDocId }: { docs: Document[]; initialDocId: string | null }) => {
    const { setFiles, openFile } = useIDE();
    useEffect(() => {
        setFiles(docs);
        if (initialDocId && docs.some(d => d.id === initialDocId)) {
            openFile(initialDocId);
        }
    }, [docs, setFiles, initialDocId, openFile]);
    return null;
};

export default function DocumentsTab() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // We can still use docIdParam to open a specific file on load
    const docIdParam = searchParams.get('docId');

    const [documents, setDocuments] = useState<Document[]>([]);
    const [uploading, setUploading] = useState(false);
    const [stagedDocs, setStagedDocs] = useState<Document[]>([]);
    const [committing, setCommitting] = useState(false);
    const [stats, setStats] = useState<{ recentActivity: any[]; totalDocuments: number; analyzedDocuments: number; averageComplianceScore: number } | null>(null);

    useCopilotReadable({
        description: 'Dashboard document lists visible to the user',
        value: {
            activeDocuments: documents,
            stagedDocuments: stagedDocs,
        },
    }, [documents, stagedDocs]);

    useEffect(() => {
        loadDocuments();
        loadStats();

        const interval = setInterval(() => {
            loadDocuments();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    async function loadStats() {
        try {
            const data = await fetchDashboardStats();
            setStats(data);
        } catch (err) {
            console.error(err);
        }
    }

    async function loadDocuments() {
        try {
            const docs = await fetchDocuments();
            // We pass ALL documents to the IDE, let the explorer filter/group them
            // But we might want to separate STAGED ones?
            // For now, let's pass everything and maybe mark them in the IDE
            setDocuments(docs);
            setStagedDocs(docs.filter(d => d.status === 'STAGED'));
        } catch (err) {
            console.error(err);
        }
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.length) return;
        setUploading(true);
        try {
            const { batchId } = await uploadDocuments(e.target.files);
            window.dispatchEvent(new CustomEvent('batch-upload-start', { detail: batchId }));
            await loadDocuments();
        } catch (err) {
            alert('Upload failed');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    }

    return (
        <div className="h-full flex flex-col p-4">
            {/* Toolbar */}
            <div className="mb-4 flex justify-between items-center px-1 flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-800">Documents</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => document.getElementById('file-upload')?.click()}
                        disabled={uploading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                    >
                        {uploading ? 'Uploading...' : 'Upload Documents'}
                    </button>
                    <input
                        id="file-upload"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleUpload}
                    />
                </div>
            </div>

            {/* IDE Interface */}
            <div className="flex-1 min-h-0">
                <DataSync docs={documents} initialDocId={docIdParam} />
                <IDELayout />
            </div>
        </div>
    );
}
