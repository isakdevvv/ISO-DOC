'use client';

import React, { useEffect, useState } from 'react';
import { useCopilotReadable } from '@copilotkit/react-core';
import { fetchDocuments, uploadDocuments, deleteDocument } from '@/lib/api';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';

interface Document {
    id: string;
    title: string;
    status: string;
    createdAt: string;
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [stagedDocs, setStagedDocs] = useState<Document[]>([]);
    const [uploading, setUploading] = useState(false);

    useCopilotReadable({
        description: 'List of all documents',
        value: {
            activeDocuments: documents,
            stagedDocuments: stagedDocs,
        },
    }, [documents, stagedDocs]);

    useEffect(() => {
        loadDocuments();

        const interval = setInterval(() => {
            loadDocuments();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    async function loadDocuments() {
        try {
            const docs = await fetchDocuments();
            setDocuments(docs.filter(d => d.status !== 'STAGED' && d.status !== 'UPLOADING'));
            setStagedDocs(docs.filter(d => d.status === 'STAGED' || d.status === 'UPLOADING'));
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

    async function handleDelete(docId: string) {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            await deleteDocument(docId);
            await loadDocuments();
        } catch (err) {
            alert('Deletion failed');
        }
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />

            <div className="flex-1 flex flex-col">
                <Header />

                <main className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto space-y-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
                                <p className="text-sm text-gray-500">Manage all your uploaded files</p>
                            </div>
                            <div className="relative">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    onChange={handleUpload}
                                    disabled={uploading}
                                    multiple
                                />
                                <label
                                    htmlFor="file-upload"
                                    className={`flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition cursor-pointer shadow-sm ${uploading ? 'opacity-50' : ''}`}
                                >
                                    <span>{uploading ? '⏳' : '☁️'}</span>
                                    {uploading ? 'Uploading...' : 'Upload New'}
                                </label>
                            </div>
                        </div>

                        {/* Uploads in Progress / Staged */}
                        {stagedDocs.length > 0 && (
                            <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
                                <h3 className="text-lg font-semibold text-blue-900 mb-4">Processing Uploads</h3>
                                <div className="bg-white rounded-lg shadow-sm border border-blue-100 overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <tbody className="divide-y divide-gray-200">
                                            {stagedDocs.map(doc => (
                                                <tr key={doc.id}>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.title}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {doc.status === 'UPLOADING' ? (
                                                            <span className="flex items-center gap-2 text-blue-600">
                                                                <span className="animate-spin">↻</span> Processing...
                                                            </span>
                                                        ) : (
                                                            <span className="text-orange-600">Pending Review (See Dashboard)</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Main Document List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {documents.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className="text-4xl">📄</span>
                                                        <p>No active documents found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            documents.map((doc) => (
                                                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                                                📄
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                                                                <div className="text-xs text-gray-500">ID: {doc.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${doc.status === 'ANALYZED' ? 'bg-green-100 text-green-800' :
                                                            doc.status === 'ERROR' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}
                                                        >
                                                            {doc.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(doc.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end gap-3">
                                                            <a href={`/app/documents/${doc.id}`} className="text-blue-600 hover:text-blue-900 transition-colors">
                                                                View
                                                            </a>
                                                            <button
                                                                onClick={() => handleDelete(doc.id)}
                                                                className="text-red-400 hover:text-red-600 transition-colors"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
