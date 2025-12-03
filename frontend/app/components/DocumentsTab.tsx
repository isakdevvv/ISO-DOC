'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useCopilotReadable } from '@copilotkit/react-core';
import { fetchNodes, uploadFiles, deleteNode, generateNode, Node, isAuthenticationError } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { useIDE } from './IDE/IDEContext';
import IDELayout from './IDE/IDELayout';
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';

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

type DocumentStatusFilter = 'ALL' | 'DRAFT' | 'PENDING_REVIEW' | 'NEEDS_CHANGES' | 'APPROVED';

const STATUS_FILTERS: DocumentStatusFilter[] = ['ALL', 'DRAFT', 'PENDING_REVIEW', 'NEEDS_CHANGES', 'APPROVED'];

const REVIEWER_DIRECTORY = [
    { id: 'quality-lead', name: 'Quality Lead', role: 'QA & Document Control' },
    { id: 'compliance', name: 'Compliance Officer', role: 'ISO 27001' },
    { id: 'security', name: 'Security Director', role: 'Risk & Security' },
];

export default function DocumentsTab() {
    const searchParams = useSearchParams();

    // We can still use docIdParam to open a specific file on load
    const docIdParam = searchParams.get('docId');

    const { activeNodeId, closeNode, openNode } = useIDE();

    const [nodes, setNodesState] = useState<Node[]>([]);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>('ALL');
    const [selectedFolder, setSelectedFolder] = useState<string>('ALL');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [reviewDueDate, setReviewDueDate] = useState('');
    const [reviewNote, setReviewNote] = useState('');
    const [selectedReviewers, setSelectedReviewers] = useState<string[]>(['quality-lead']);

    const documentStats = useMemo(() => computeDocumentStats(nodes), [nodes]);
    const folderGroups = useMemo(() => buildFolderGroups(nodes), [nodes]);
    const filteredNodes = useMemo(
        () => filterNodes(nodes, searchTerm, statusFilter, selectedFolder),
        [nodes, searchTerm, statusFilter, selectedFolder]
    );
    const pendingApprovals = useMemo(() => buildPendingApprovals(nodes), [nodes]);

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

    async function processUploadList(list: FileList) {
        setUploading(true);
        try {
            // TODO: Get projectId from context
            await uploadFiles(list, { projectId: 'default-project-id' });
            await loadNodes();
        } catch (err) {
            if (!isAuthenticationError(err)) {
                alert('Upload failed');
            }
        } finally {
            setUploading(false);
        }
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.length) return;
        await processUploadList(e.target.files);
        e.target.value = '';
    }

    async function handleModalUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.length) return;
        await processUploadList(e.target.files);
        setShowUploadModal(false);
        e.target.value = '';
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

    function toggleReviewer(id: string) {
        setSelectedReviewers((prev) => prev.includes(id)
            ? prev.filter((reviewer) => reviewer !== id)
            : [...prev, id]);
    }

    function handleSubmitForReview(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setShowSubmitModal(false);
        setReviewDueDate('');
        setReviewNote('');
        alert('Review request created');
    }

    return (
        <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6">
                <section>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {documentStats.map((stat) => (
                            <DocumentStatCard key={stat.id} stat={stat} />
                        ))}
                    </div>
                </section>

                <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Active selection
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    {activeNode?.title || activeNode?.type || 'Select a document'}
                                </h3>
                                {activeNode && <DocumentStatusBadge status={activeNode.status} />}
                            </div>
                            <p className="text-sm text-gray-500">
                                {activeNode ? `Updated ${formatRelativeTime(activeNode.updatedAt)}` : 'Click a row to open it in the editor'}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                            <button
                                onClick={() => handleNavigate('previous')}
                                disabled={!previousNode}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 text-sm font-medium"
                            >
                                ← Previous
                            </button>
                            <button
                                onClick={() => handleNavigate('next')}
                                disabled={!nextNode}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 text-sm font-medium"
                            >
                                Next →
                            </button>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                Manage uploads
                            </button>
                            <button
                                onClick={handleGenerateActiveNode}
                                disabled={!activeNode || generating}
                                className="px-4 py-2 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 text-sm font-medium"
                            >
                                {generating ? 'Generating…' : 'AI Draft'}
                            </button>
                            <button
                                onClick={() => setShowSubmitModal(true)}
                                disabled={!activeNode}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 text-sm font-medium"
                            >
                                Submit for review
                            </button>
                            <button
                                onClick={handleDeleteActiveNode}
                                disabled={!activeNode || deleting}
                                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 text-sm font-medium"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[220px]">
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by title, clause, or owner"
                                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_FILTERS.map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setStatusFilter(filter)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusFilter === filter ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                >
                                    {filter === 'ALL' ? 'All statuses' : filter.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-[280px,minmax(0,1fr)]">
                    <DocumentFolderTree
                        groups={folderGroups}
                        selectedKey={selectedFolder}
                        onSelect={setSelectedFolder}
                    />
                    <DocumentTable
                        nodes={filteredNodes}
                        onOpen={openNode}
                        activeNodeId={activeNodeId}
                    />
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                    <DocumentDetailPanel node={activeNode} />
                    <PendingApprovalsCard approvals={pendingApprovals} onOpen={openNode} />
                </section>

                <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Editor & review workspace</h3>
                            <p className="text-sm text-gray-500">
                                Preview revisions, metadata, and clause mapping inside the IDE layout.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleNavigate('previous')}
                                disabled={!previousNode}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 text-sm font-medium"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handleNavigate('next')}
                                disabled={!nextNode}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 text-sm font-medium"
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                        <div className="min-h-[520px]">
                            <DataSync nodes={nodes} initialNodeId={docIdParam} />
                            <IDELayout />
                        </div>
                    </div>
                </section>
            </div>

            <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleUpload}
                aria-label="Upload Documents"
            />

            <Modal open={showUploadModal} onOpenChange={setShowUploadModal}>
                <ModalContent className="sm:max-w-xl">
                    <ModalHeader>
                        <ModalTitle>Upload documents</ModalTitle>
                        <ModalDescription>
                            Ingest policies, procedures, and evidence so we can map them to ISO clauses.
                        </ModalDescription>
                    </ModalHeader>
                    <div className="space-y-4">
                        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                            Drag & drop files here or click to browse.
                            <label
                                htmlFor="modal-upload-input"
                                className={`mt-4 inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium ${uploading ? 'border-gray-200 text-gray-400' : 'border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer'}`}
                            >
                                {uploading ? 'Uploading…' : 'Browse files'}
                            </label>
                            <input
                                id="modal-upload-input"
                                type="file"
                                multiple
                                onChange={handleModalUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                            <p className="mt-2 text-xs text-gray-500">PDF, DOCX, XLSX up to 25MB per file.</p>
                        </div>
                    </div>
                    <ModalFooter>
                        <button
                            type="button"
                            onClick={() => setShowUploadModal(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                        >
                            Close
                        </button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal open={showSubmitModal} onOpenChange={setShowSubmitModal}>
                <ModalContent className="sm:max-w-xl">
                    <ModalHeader>
                        <ModalTitle>Submit for approval</ModalTitle>
                        <ModalDescription>
                            Route the selected document to reviewers with due dates and context.
                        </ModalDescription>
                    </ModalHeader>
                    <form onSubmit={handleSubmitForReview} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Reviewers</label>
                            <div className="space-y-2">
                                {REVIEWER_DIRECTORY.map((person) => (
                                    <label key={person.id} className="flex items-start gap-3 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={selectedReviewers.includes(person.id)}
                                            onChange={() => toggleReviewer(person.id)}
                                            className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>
                                            <span className="font-medium text-gray-900">{person.name}</span>{' '}
                                            <span className="text-gray-500">— {person.role}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                                <input
                                    type="date"
                                    value={reviewDueDate}
                                    onChange={(e) => setReviewDueDate(e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500">
                                    <option>Standard</option>
                                    <option>High</option>
                                    <option>Urgent</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                            <textarea
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                rows={4}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Highlight scope, risks, or changes reviewers should pay attention to."
                            />
                        </div>
                        <ModalFooter>
                            <button
                                type="button"
                                onClick={() => setShowSubmitModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!activeNode}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-40"
                            >
                                Send request
                            </button>
                        </ModalFooter>
                    </form>
                </ModalContent>
            </Modal>
        </div>
    );
}

interface DocumentStat {
    id: string;
    label: string;
    value: string;
    helper?: string;
    progress?: number;
}

interface FolderGroup {
    key: string;
    label: string;
    count: number;
    statuses: Record<string, number>;
    updatedAt?: string;
}

interface PendingApproval {
    id: string;
    title: string;
    status: string;
    owner: string;
    dueDate: string;
}

interface HistoryEntry {
    id: string;
    title: string;
    status: string;
    dateLabel: string;
    description?: string;
}

function DocumentStatCard({ stat }: { stat: DocumentStat }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{stat.label}</p>
            <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-semibold text-gray-900">{stat.value}</span>
                {stat.helper && <span className="text-xs text-gray-500">{stat.helper}</span>}
            </div>
            {typeof stat.progress === 'number' && (
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.min(Math.max(stat.progress, 0), 100)}%` }}
                    />
                </div>
            )}
        </div>
    );
}

function DocumentFolderTree({ groups, selectedKey, onSelect }: { groups: FolderGroup[]; selectedKey: string; onSelect: (key: string) => void }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4 h-full">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">Library</h3>
                    <p className="text-xs text-gray-500">Folder tree by document type</p>
                </div>
                <button
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    onClick={() => onSelect('ALL')}
                >
                    Reset
                </button>
            </div>
            <div className="space-y-2">
                {groups.map((group) => (
                    <button
                        key={group.key}
                        onClick={() => onSelect(group.key)}
                        className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${selectedKey === group.key ? 'border-blue-200 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{group.label}</p>
                                <p className="text-xs text-gray-500">{group.count} documents</p>
                            </div>
                            <span className="text-xs text-gray-500">{group.updatedAt ? `Updated ${formatRelativeTime(group.updatedAt)}` : ''}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(group.statuses).slice(0, 3).map(([status, count]) => (
                                <span key={status} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                                    {status.replace('_', ' ')} • {count}
                                </span>
                            ))}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

function DocumentTable({ nodes, onOpen, activeNodeId }: { nodes: Node[]; onOpen: (id: string) => void; activeNodeId: string | null }) {
    if (nodes.length === 0) {
        return (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl shadow-sm p-12 flex items-center justify-center text-sm text-gray-500">
                No documents match the current filters.
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                        <th className="text-left px-4 py-3">Document</th>
                        <th className="text-left px-4 py-3 hidden lg:table-cell">Owner</th>
                        <th className="text-left px-4 py-3 hidden lg:table-cell">Clause</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-left px-4 py-3 hidden md:table-cell">Updated</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {nodes.map((node) => {
                        const metadata = node.metadata as Record<string, unknown> | null | undefined;
                        const owner = getMetadataString(metadata, 'owner') || 'Unassigned';
                        const clause = getMetadataString(metadata, 'clause') || getMetadataString(metadata, 'clauseId') || '—';
                        return (
                            <tr
                                key={node.id}
                                className={`border-t border-gray-100 ${node.id === activeNodeId ? 'bg-blue-50/40' : 'bg-white hover:bg-gray-50'}`}
                            >
                                <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">{node.title || node.type}</div>
                                    <div className="text-xs text-gray-500">{node.type}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-700 hidden lg:table-cell">{owner}</td>
                                <td className="px-4 py-3 text-gray-700 hidden lg:table-cell">{clause}</td>
                                <td className="px-4 py-3">
                                    <DocumentStatusBadge status={node.status} />
                                </td>
                                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                                    {formatRelativeTime(node.updatedAt)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => onOpen(node.id)}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        Open
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function DocumentDetailPanel({ node }: { node: Node | null }) {
    if (!node) {
        return (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center text-sm text-gray-500">
                Select a document to see metadata, linked clauses, and version history.
            </div>
        );
    }

    const metadata = node.metadata as Record<string, unknown> | null | undefined;
    const owner = getMetadataString(metadata, 'owner') || 'Unassigned';
    const clause = getMetadataString(metadata, 'clause') || getMetadataString(metadata, 'clauseId') || 'Not mapped';
    const relatedStandard = node.component?.componentType?.name || getMetadataString(metadata, 'standard') || '—';
    const tags = (getMetadataArray(metadata, 'tags') || []) as unknown[];
    const history = buildHistoryEntries(node);

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase text-gray-500 font-semibold">Document</p>
                    <h3 className="text-lg font-semibold text-gray-900">{node.title || node.type}</h3>
                    <p className="text-sm text-gray-500">Version {node.currentRevision?.revisionNumber ?? 1}</p>
                </div>
                <DocumentStatusBadge status={node.status} />
            </div>

            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                    <dt className="text-xs uppercase text-gray-500">Owner</dt>
                    <dd className="text-gray-900">{owner}</dd>
                </div>
                <div>
                    <dt className="text-xs uppercase text-gray-500">Standard</dt>
                    <dd className="text-gray-900">{relatedStandard}</dd>
                </div>
                <div>
                    <dt className="text-xs uppercase text-gray-500">Clause</dt>
                    <dd className="text-gray-900">{clause}</dd>
                </div>
                <div>
                    <dt className="text-xs uppercase text-gray-500">Last updated</dt>
                    <dd className="text-gray-900">{formatDate(node.updatedAt)}</dd>
                </div>
            </dl>

            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                        <span key={String(tag)} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {String(tag)}
                        </span>
                    ))}
                </div>
            )}

            <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Version history</h4>
                <ol className="space-y-3">
                    {history.map((entry) => (
                        <li key={entry.id} className="flex items-start gap-3">
                            <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500" aria-hidden></span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                                    <DocumentStatusBadge status={entry.status} />
                                </div>
                                <p className="text-xs text-gray-500">{entry.dateLabel}</p>
                                {entry.description && <p className="text-xs text-gray-600 mt-1">{entry.description}</p>}
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}

function PendingApprovalsCard({ approvals, onOpen }: { approvals: PendingApproval[]; onOpen: (id: string) => void }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900">Pending approvals</h3>
                    <p className="text-xs text-gray-500">Everything waiting on your team</p>
                </div>
                <span className="text-xs font-medium text-blue-600">{approvals.length} open</span>
            </div>

            <div className="space-y-3">
                {approvals.length === 0 ? (
                    <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl p-4 text-center">
                        All clear — no outstanding approvals.
                    </div>
                ) : (
                    approvals.map((approval) => (
                        <div key={approval.id} className="border border-gray-100 rounded-xl px-4 py-3">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{approval.title}</p>
                                    <p className="text-xs text-gray-500">Owner {approval.owner} • Due {formatRelativeTime(approval.dueDate)}</p>
                                </div>
                                <DocumentStatusBadge status={approval.status} />
                            </div>
                            <div className="mt-3 flex justify-between text-xs text-gray-500">
                                <span>{formatDate(approval.dueDate)}</span>
                                <button
                                    onClick={() => onOpen(approval.id)}
                                    className="text-blue-600 font-medium hover:text-blue-700"
                                >
                                    Review
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function DocumentStatusBadge({ status }: { status?: string }) {
    const normalized = normalizeStatus(status);
    let classes = 'bg-gray-100 text-gray-700';
    if (normalized === 'APPROVED') {
        classes = 'bg-green-100 text-green-700';
    } else if (normalized === 'PENDING_REVIEW' || normalized === 'IN_REVIEW') {
        classes = 'bg-yellow-100 text-yellow-800';
    } else if (normalized === 'NEEDS_CHANGES') {
        classes = 'bg-orange-100 text-orange-700';
    } else if (normalized === 'DRAFT') {
        classes = 'bg-blue-100 text-blue-700';
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
            {normalized.replace('_', ' ')}
        </span>
    );
}

function computeDocumentStats(nodes: Node[]): DocumentStat[] {
    const total = nodes.length;
    const approved = nodes.filter((node) => normalizeStatus(node.status) === 'APPROVED').length;
    const awaitingReview = nodes.filter((node) => {
        const status = normalizeStatus(node.status);
        return status === 'PENDING_REVIEW' || status === 'NEEDS_CHANGES';
    }).length;
    const drafts = nodes.filter((node) => normalizeStatus(node.status) === 'DRAFT').length;
    const staleThreshold = Date.now() - 1000 * 60 * 60 * 24 * 30;
    const stale = nodes.filter((node) => new Date(node.updatedAt).getTime() < staleThreshold).length;
    const coverage = total ? Math.round((approved / total) * 100) : 0;

    return [
        {
            id: 'total',
            label: 'Documents',
            value: total.toString(),
            helper: `${awaitingReview} awaiting review`,
        },
        {
            id: 'coverage',
            label: 'Implementation coverage',
            value: `${coverage}%`,
            helper: `${approved} approved`,
            progress: coverage,
        },
        {
            id: 'drafts',
            label: 'Drafts in progress',
            value: drafts.toString(),
            helper: 'AI or author work',
        },
        {
            id: 'stale',
            label: 'Stale documents',
            value: stale.toString(),
            helper: 'Updated >30 days ago',
        },
    ];
}

function buildFolderGroups(nodes: Node[]): FolderGroup[] {
    const groups = new Map<string, FolderGroup>();

    nodes.forEach((node) => {
        const key = node.type || 'Uncategorized';
        const entry = groups.get(key) || { key, label: key, count: 0, statuses: {}, updatedAt: node.updatedAt };
        entry.count += 1;
        const status = normalizeStatus(node.status);
        entry.statuses[status] = (entry.statuses[status] || 0) + 1;
        if (!entry.updatedAt || new Date(node.updatedAt).getTime() > new Date(entry.updatedAt).getTime()) {
            entry.updatedAt = node.updatedAt;
        }
        groups.set(key, entry);
    });

    const ordered = Array.from(groups.values()).sort((a, b) => b.count - a.count);
    const latestUpdate = nodes.reduce<string | undefined>((latest, node) => {
        if (!latest || new Date(node.updatedAt).getTime() > new Date(latest).getTime()) {
            return node.updatedAt;
        }
        return latest;
    }, undefined);

    ordered.unshift({
        key: 'ALL',
        label: 'All documents',
        count: nodes.length,
        statuses: {},
        updatedAt: latestUpdate,
    });

    return ordered;
}

function filterNodes(nodes: Node[], search: string, status: DocumentStatusFilter, folder: string) {
    const normalizedSearch = search.trim().toLowerCase();
    return nodes.filter((node) => {
        const normalizedStatus = normalizeStatus(node.status);
        if (status !== 'ALL' && normalizedStatus !== status) {
            return false;
        }
        if (folder !== 'ALL' && (node.type || 'Uncategorized') !== folder) {
            return false;
        }
        if (!normalizedSearch) {
            return true;
        }
        const metadata = node.metadata as Record<string, unknown> | null | undefined;
        const owner = getMetadataString(metadata, 'owner') || '';
        const clause = getMetadataString(metadata, 'clause') || getMetadataString(metadata, 'clauseId') || '';
        return (
            (node.title && node.title.toLowerCase().includes(normalizedSearch)) ||
            (node.type && node.type.toLowerCase().includes(normalizedSearch)) ||
            owner.toLowerCase().includes(normalizedSearch) ||
            clause.toLowerCase().includes(normalizedSearch)
        );
    });
}

function buildPendingApprovals(nodes: Node[]): PendingApproval[] {
    return nodes
        .filter((node) => {
            const status = normalizeStatus(node.status);
            return status === 'PENDING_REVIEW' || status === 'NEEDS_CHANGES';
        })
        .map((node) => {
            const metadata = node.metadata as Record<string, unknown> | null | undefined;
            const owner = getMetadataString(metadata, 'owner') || 'Unassigned';
            const dueDate = getMetadataString(metadata, 'dueDate') || node.updatedAt;
            return {
                id: node.id,
                title: node.title || node.type,
                status: node.status || 'PENDING_REVIEW',
                owner,
                dueDate,
            };
        })
        .slice(0, 4);
}

function buildHistoryEntries(node: Node | null): HistoryEntry[] {
    if (!node) return [];
    const metadata = node.metadata as Record<string, unknown> | null | undefined;
    const historyEntries = getMetadataArray(metadata, 'history');
    if (historyEntries && historyEntries.length > 0) {
        return historyEntries.map((entry, index: number) => {
            if (!entry || typeof entry !== 'object') {
                return {
                    id: `${node.id}-history-${index}`,
                    title: `Revision ${index + 1}`,
                    status: node.status || 'DRAFT',
                    dateLabel: formatDate(node.updatedAt),
                };
            }
            const record = entry as Record<string, unknown>;
            return {
                id: (typeof record.id === 'string' && record.id) || `${node.id}-history-${index}`,
                title: (typeof record.title === 'string' && record.title) || `Revision ${index + 1}`,
                status: (typeof record.status === 'string' && record.status) || node.status || 'DRAFT',
                dateLabel: (typeof record.date === 'string' && record.date)
                    || (typeof record.updatedAt === 'string' && record.updatedAt)
                    || formatDate(node.updatedAt),
                description: typeof record.notes === 'string' ? record.notes : undefined,
            };
        });
    }

    return [
        {
            id: `${node.id}-current`,
            title: `Revision ${node.currentRevision?.revisionNumber ?? 1}`,
            status: node.status || 'DRAFT',
            dateLabel: formatDate(node.updatedAt),
            description: 'Latest generated or uploaded version.',
        },
        {
            id: `${node.id}-created`,
            title: 'Created',
            status: 'DRAFT',
            dateLabel: formatDate(node.createdAt),
            description: 'Document added to the workspace.',
        },
    ];
}

function normalizeStatus(status?: string) {
    return status ? status.toUpperCase() : 'DRAFT';
}

function formatRelativeTime(date?: string) {
    if (!date) return '—';
    const timestamp = new Date(date).getTime();
    if (Number.isNaN(timestamp)) return '—';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

function formatDate(date?: string) {
    if (!date) return '—';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return '—';
    }
    return parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function getMetadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
    if (!metadata) return undefined;
    const value = metadata[key];
    return typeof value === 'string' ? value : undefined;
}

function getMetadataArray(metadata: Record<string, unknown> | null | undefined, key: string) {
    if (!metadata) return undefined;
    const value = metadata[key];
    return Array.isArray(value) ? value : undefined;
}
