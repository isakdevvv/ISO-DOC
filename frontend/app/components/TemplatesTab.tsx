'use client';

import React, { useState, useEffect } from 'react';
import { fetchTemplates, deleteTemplate, createTemplate, updateTemplate, Template } from '@/lib/api';
import TemplateEditor from './TemplateEditor';

export default function TemplatesTab() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    async function loadTemplates() {
        try {
            setLoading(true);
            const data = await fetchTemplates();
            setTemplates(data);
        } catch (err) {
            setError('Failed to load templates');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await deleteTemplate(id);
            setTemplates(templates.filter(t => t.id !== id));
        } catch (err) {
            alert('Failed to delete template');
        }
    }

    async function handleSave(data: Partial<Template>) {
        try {
            if (view === 'create') {
                await createTemplate(data as any);
            } else if (view === 'edit' && selectedTemplate) {
                await updateTemplate(selectedTemplate.id, data);
            }
            await loadTemplates();
            setView('list');
            setSelectedTemplate(null);
        } catch (err) {
            console.error(err);
            throw err; // Re-throw to let Editor handle error state if needed
        }
    }

    return (
        <div className="h-full flex flex-col p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Templates</h2>
                {view === 'list' && (
                    <button
                        onClick={() => { setSelectedTemplate(null); setView('create'); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                    >
                        + New Template
                    </button>
                )}
                {view !== 'list' && (
                    <button
                        onClick={() => { setView('list'); setSelectedTemplate(null); }}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        Back to List
                    </button>
                )}
            </div>

            {loading && view === 'list' && <div className="text-center py-10">Loading templates...</div>}
            {error && <div className="text-red-600 mb-4">{error}</div>}

            {view === 'list' && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <div key={template.id} className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-2">
                                <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded">
                                    {template.metadata?.category || 'Uncategorized'}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setSelectedTemplate(template); setView('edit'); }}
                                        className="text-gray-400 hover:text-blue-600"
                                        title="Edit"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="text-gray-400 hover:text-red-600"
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{template.title}</h3>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{template.description || 'No description'}</p>
                            <div className="text-xs text-gray-400">
                                Updated: {new Date(template.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                    {templates.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500 bg-gray-50 rounded border border-dashed border-gray-300">
                            No templates found. Create one to get started.
                        </div>
                    )}
                </div>
            )}

            {(view === 'create' || view === 'edit') && (
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <TemplateEditor
                        initialData={selectedTemplate}
                        onSave={handleSave}
                        onCancel={() => { setView('list'); setSelectedTemplate(null); }}
                    />
                </div>
            )}
        </div>
    );
}
