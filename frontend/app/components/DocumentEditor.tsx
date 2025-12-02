'use client';

import React, { useEffect, useState } from 'react';
import { fetchNode, fetchRevisions, fetchRevision, Node } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface DocumentEditorProps {
    nodeId: string;
}

export default function DocumentEditor({ nodeId }: DocumentEditorProps) {
    const router = useRouter();
    const [revisions, setRevisions] = useState<any[]>([]);
    const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);

    useEffect(() => {
        loadNode();
        loadRevisions();
    }, [nodeId]);

    useEffect(() => {
        if (selectedRevisionId && node?.currentRevision?.id !== selectedRevisionId) {
            loadRevision(selectedRevisionId);
        }
    }, [selectedRevisionId]);

    async function loadNode() {
        try {
            const fetchedNode = await fetchNode(nodeId);
            setNode(fetchedNode);
            if (fetchedNode.currentRevision) {
                setSelectedRevisionId(fetchedNode.currentRevision.id);
            }
        } catch (err) {
            console.error('Failed to load node', err);
        } finally {
            setLoading(false);
        }
    }

    async function loadRevisions() {
        try {
            const revs = await fetchRevisions(nodeId);
            setRevisions(revs);
        } catch (err) {
            console.error('Failed to load revisions', err);
        }
    }

    async function loadRevision(revisionId: string) {
        try {
            const revision = await fetchRevision(nodeId, revisionId);
            setNode(prev => prev ? { ...prev, currentRevision: revision } : null);
        } catch (err) {
            console.error('Failed to load revision', err);
        }
    }

    if (loading) {
        return <div className="flex justify-center p-12">Loading...</div>;
    }

    if (!node) {
        return <div className="p-12 text-center text-red-600">Document not found</div>;
    }

    const segments = node.currentRevision?.snapshot?.segments || [];
    const selectedSegment = segments.find(s => s.id === selectedSegmentId);

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">{node.title}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">{node.type}</span>
                        <span className="text-gray-300">•</span>
                        <select
                            value={selectedRevisionId || ''}
                            onChange={(e) => setSelectedRevisionId(e.target.value)}
                            className="text-sm border-gray-200 rounded-md py-0.5 pl-2 pr-8 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {revisions.map(rev => (
                                <option key={rev.id} value={rev.id}>
                                    Revision {rev.revisionNumber} ({new Date(rev.createdAt).toLocaleDateString()})
                                </option>
                            ))}
                            {revisions.length === 0 && <option disabled>No revisions</option>}
                        </select>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        Close
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Save Changes
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Editor Area */}
                <main className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-3xl mx-auto bg-white shadow-sm border border-gray-200 rounded-xl min-h-[800px] p-12">
                        {segments.length > 0 ? (
                            segments.map((segment) => (
                                <div
                                    key={segment.id}
                                    className={`mb-6 p-4 rounded-lg border transition-colors cursor-pointer ${selectedSegmentId === segment.id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-transparent hover:bg-gray-50'
                                        }`}
                                    onClick={() => setSelectedSegmentId(segment.id)}
                                >
                                    <div className="prose max-w-none">
                                        {segment.content}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-400 mt-20">
                                No content generated yet.
                            </div>
                        )}
                    </div>
                </main>

                {/* Provenance Sidebar */}
                <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4">
                    <h2 className="font-semibold text-gray-900 mb-4">Provenance & Context</h2>

                    {selectedSegment ? (
                        <div className="space-y-4">
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Selected Segment</h3>
                                <p className="text-sm text-gray-800 line-clamp-3">{selectedSegment.content}</p>
                            </div>

                            <div>
                                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Sources</h3>
                                {selectedSegment.provenance && selectedSegment.provenance.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedSegment.provenance.map((prov, idx) => (
                                            <div key={idx} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                        {prov.sourceType}
                                                    </span>
                                                    {prov.score && (
                                                        <span className="text-xs text-gray-400">
                                                            {Math.round(prov.score * 100)}% match
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-600">
                                                    Source ID: {prov.sourceId || 'Unknown'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No specific sources linked.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center mt-10">
                            Select a text segment to view its sources and provenance.
                        </p>
                    )}
                </aside>
            </div>
        </div>
    );
}
