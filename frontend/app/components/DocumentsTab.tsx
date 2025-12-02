'use client';

import React, { useEffect, useState } from 'react';
import { useCopilotReadable } from '@copilotkit/react-core';
import { fetchNodes, uploadFiles, deleteNode, generateNode, Node, isAuthenticationError } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { useIDE } from './IDE/IDEContext';
import IDELayout from './IDE/IDELayout';

// Sync component to bridge fetched nodes with IDE context
const DataSync = ({ nodes, initialNodeId }: { nodes: Node[]; initialNodeId: string | null }) => {
    const { setNodes, openNode } = useIDE();
    useEffect(() => {
        setNodes(nodes);
        if (initialNodeId && nodes.some(n => n.id === initialNodeId)) {
            openNode(initialNodeId);
        }
    }, [nodes, setNodes, initialNodeId, openNode]);
    return null;
};

export default function DocumentsTab() {
    const searchParams = useSearchParams();

    // We can still use docIdParam to open a specific file on load
    const docIdParam = searchParams.get('docId');

    const { activeNodeId, closeNode, openNode } = useIDE();

    const [nodes, setNodesState] = useState<Node[]>([]);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [stats, setStats] = useState<{ recentActivity: any[]; totalDocuments: number; analyzedDocuments: number; averageComplianceScore: number } | null>(null);

    const activeNode = nodes.find(n => n.id === activeNodeId) || null;
    const activeIndex = activeNode ? nodes.findIndex(n => n.id === activeNode.id) : -1;
    const previousNode = activeIndex > 0 ? nodes[activeIndex - 1] : null;
    const nextNode = activeIndex >= 0 && activeIndex < nodes.length - 1 ? nodes[activeIndex + 1] : null;

    useCopilotReadable({
        description: 'Dashboard node lists visible to the user',
        value: {
            activeNodes: nodes,
        },
    }, [nodes]);

    useEffect(() => {
        loadNodes();
        loadStats();

        const interval = setInterval(() => {
            loadNodes();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (docIdParam || activeNode || nodes.length === 0) {
            return;
        }
        openNode(nodes[0].id);
    }, [docIdParam, activeNode, nodes, openNode]);

    async function loadStats() {
        // Stats temporarily disabled
        setStats(null);
    }

    async function loadNodes() {
        try {
            // TODO: Get projectId from context or params
            const projectId = 'default-project-id';
            const fetchedNodes = await fetchNodes(projectId);
            setNodesState(fetchedNodes);
        } catch (err) {
            if (isAuthenticationError(err)) {
                return;
            }
            console.error(err);
        }
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.length) return;
        setUploading(true);
        try {
            // TODO: Get projectId from context
            await uploadFiles(e.target.files, { projectId: 'default-project-id' });
            await loadNodes();
        } catch (err) {
            if (!isAuthenticationError(err)) {
                alert('Upload failed');
            }
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    }

    async function handleDeleteActiveNode() {
        if (!activeNode || deleting) return;
        const confirmed = window.confirm(`Slett dokumentet "${activeNode.title}"? Dette kan ikke angres.`);
        if (!confirmed) return;

        setDeleting(true);
        try {
            await deleteNode(activeNode.id);
            closeNode(activeNode.id);
            await loadNodes();
            await loadStats();
        } catch (err) {
            if (!isAuthenticationError(err)) {
                const message = err instanceof Error ? err.message : 'Failed to delete node';
                alert(message);
            }
        } finally {
            setDeleting(false);
        }
    }

    async function handleGenerateActiveNode() {
        if (!activeNode || generating) return;
        setGenerating(true);
        try {
            await generateNode(activeNode.id);
            await loadNodes();
        } catch (err) {
            if (!isAuthenticationError(err)) {
                const message = err instanceof Error ? err.message : 'Failed to generate document';
                alert(message);
            }
        } finally {
            setGenerating(false);
        }
    }

    function handleNavigate(direction: 'previous' | 'next') {
        const target = direction === 'previous' ? previousNode : nextNode;
        if (target) {
            openNode(target.id);
        } else if (!activeNode && nodes.length > 0) {
            openNode(nodes[0].id);
        }
    }

    return (
        <div className="h-full min-h-0 flex flex-col p-4">
            {/* Toolbar */}
            <div className="mb-4 flex justify-between items-center px-1 flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-800">Documents</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleNavigate('previous')}
                        disabled={!previousNode}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 text-sm font-medium"
                        title={previousNode ? `Forrige: ${previousNode.title}` : 'Ingen forrige dokument'}
                    >
                        ← Previous
                    </button>
                    <button
                        onClick={() => handleNavigate('next')}
                        disabled={!nextNode}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 text-sm font-medium"
                        title={nextNode ? `Neste: ${nextNode.title}` : 'Ingen flere dokumenter'}
                    >
                        Next →
                    </button>
                    <button
                        onClick={() => document.getElementById('file-upload')?.click()}
                        disabled={uploading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                    >
                        {uploading ? 'Uploading...' : 'Upload Documents'}
                    </button>
                    <button
                        onClick={handleGenerateActiveNode}
                        disabled={!activeNode || generating}
                        className="px-4 py-2 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 text-sm font-medium"
                        title={activeNode ? `Generer nytt utkast for ${activeNode.title}` : 'Velg et dokument for å generere'}
                    >
                        {generating ? 'Generating…' : 'Generate Draft'}
                    </button>
                    <button
                        onClick={handleDeleteActiveNode}
                        disabled={!activeNode || deleting}
                        className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 text-sm font-medium"
                        title={activeNode ? `Slett ${activeNode.title}` : 'Velg et dokument for å slette det'}
                    >
                        {deleting ? 'Deleting...' : 'Delete Document'}
                    </button>
                    <input
                        id="file-upload"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleUpload}
                        aria-label="Upload Documents"
                    />
                </div>
            </div>

            {/* IDE Interface */}
            <div className="flex-1 min-h-0">
                <DataSync nodes={nodes} initialNodeId={docIdParam} />
                <IDELayout />
            </div>
        </div>
    );
}
