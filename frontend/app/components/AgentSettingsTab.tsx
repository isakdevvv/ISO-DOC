'use client';

import React, { useEffect, useState } from 'react';
import { fetchTenant, updateTenant, Tenant } from '@/lib/api';

const DEFAULT_TENANT_ID = 'termoteam';

export default function AgentSettingsTab() {
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const data = await fetchTenant(DEFAULT_TENANT_ID);
            setTenant(data);
            setSystemPrompt(data.agentSettings?.systemPrompt || '');
        } catch (err) {
            console.error('Failed to load tenant settings', err);
            setMessage({ type: 'error', text: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!tenant) return;
        setSaving(true);
        setMessage(null);
        try {
            const updatedSettings = {
                ...tenant.agentSettings,
                systemPrompt,
            };

            await updateTenant(tenant.id, {
                agentSettings: updatedSettings,
            });
            setMessage({ type: 'success', text: 'Settings saved successfully. The copilot will use the new prompt immediately.' });

            // Notify SystemPromptManager to refresh
            window.dispatchEvent(new Event('systemPromptUpdated'));
        } catch (err) {
            console.error('Failed to save settings', err);
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Agent Configuration</h2>
                <p className="text-sm text-gray-500">Customize the behavior and personality of your AI agent.</p>
            </div>

            {message && (
                <div className={`mb-4 p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        System Prompt
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                        This prompt defines the core persona and instructions for the agent. It is prepended to every conversation.
                    </p>
                    <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        rows={10}
                        className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
                        placeholder="You are a helpful assistant..."
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
