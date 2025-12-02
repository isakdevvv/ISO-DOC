'use client';

import React, { useEffect, useState } from 'react';
import { isAuthenticationError } from '@/lib/api';
import AgentSettingsTab from '@/app/components/AgentSettingsTab';

// We'll define the API Key interface locally for now, or add to api.ts
interface ApiKey {
    id: string;
    name: string;
    tokenHash: string; // We won't see the full token here usually
    scope: 'PROJECT' | 'NODE';
    accessLevel: string;
    createdAt: string;
    lastUsedAt?: string;
    isActive: boolean;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'api-keys' | 'agent'>('agent');
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [newToken, setNewToken] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');

    // Mock API URL - in real app, import from lib/api
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        if (activeTab === 'api-keys') {
            fetchApiKeys();
        }
    }, [activeTab]);

    async function fetchApiKeys() {
        try {
            // TODO: Add auth headers
            const res = await fetch(`${API_URL}/api-keys?tenantId=default-tenant-id`);
            if (res.ok) {
                const data = await res.json();
                setApiKeys(data);
            }
        } catch (err) {
            console.error('Failed to fetch API keys', err);
        } finally {
            setLoading(false);
        }
    }

    async function createApiKey() {
        try {
            const res = await fetch(`${API_URL}/api-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId: 'default-tenant-id',
                    name: newKeyName,
                    scope: 'PROJECT',
                    projectId: 'default-project-id' // Defaulting for now
                })
            });

            if (res.ok) {
                const data = await res.json();
                setNewToken(data.token); // Show this ONCE
                setShowCreateModal(false);
                setNewKeyName('');
                fetchApiKeys();
            }
        } catch (err) {
            alert('Failed to create API key');
        }
    }

    async function revokeApiKey(id: string) {
        if (!confirm('Are you sure you want to revoke this key?')) return;
        try {
            await fetch(`${API_URL}/api-keys/${id}`, { method: 'DELETE' });
            fetchApiKeys();
        } catch (err) {
            alert('Failed to revoke key');
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

            <div className="flex border-b border-gray-200 mb-8">
                <button
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'agent' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('agent')}
                >
                    Agent Configuration
                </button>
                <button
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'api-keys' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('api-keys')}
                >
                    API Keys
                </button>
            </div>

            {activeTab === 'agent' && <AgentSettingsTab />}

            {activeTab === 'api-keys' && (
                <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">API Keys</h2>
                            <p className="text-sm text-gray-500">Manage external access to your project data.</p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            + Generate New Key
                        </button>
                    </div>

                    {newToken && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800 font-medium mb-2">New API Key Generated!</p>
                            <p className="text-xs text-green-600 mb-2">Copy this now. You won't be able to see it again.</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-white p-2 rounded border border-green-200 font-mono text-sm text-gray-800 break-all">
                                    {newToken}
                                </code>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(newToken); alert('Copied!'); }}
                                    className="px-3 py-2 bg-white border border-green-200 text-green-700 rounded hover:bg-green-50 text-sm"
                                >
                                    Copy
                                </button>
                            </div>
                            <button onClick={() => setNewToken(null)} className="mt-2 text-xs text-green-700 underline">Dismiss</button>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading keys...</div>
                    ) : apiKeys.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <p className="text-gray-500">No active API keys found.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Used</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {apiKeys.map((key) => (
                                        <tr key={key.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{key.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className="px-2 py-1 bg-gray-100 rounded text-xs">{key.scope}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(key.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => revokeApiKey(key.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Revoke
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Create New API Key</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                            <input
                                type="text"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                placeholder="e.g. CI/CD Pipeline"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createApiKey}
                                disabled={!newKeyName}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
