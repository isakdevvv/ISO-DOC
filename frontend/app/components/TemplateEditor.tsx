import React, { useState, useEffect } from 'react';
import { Template } from '@/lib/api';
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";

interface TemplateEditorProps {
    initialData?: Template | null;
    onSave: (data: Partial<Template>) => Promise<void>;
    onCancel: () => void;
}

export default function TemplateEditor({ initialData, onSave, onCancel }: TemplateEditorProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Policy');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.title);
            setDescription(initialData.description || '');
            setCategory(initialData.metadata?.category || 'Policy');
            // Handle content safely, assuming it might be an object or string
            const contentVal = initialData.schema?.content;
            if (typeof contentVal === 'string') {
                setContent(contentVal);
            } else if (contentVal && typeof contentVal === 'object' && 'text' in contentVal) {
                setContent(contentVal.text);
            } else {
                setContent(JSON.stringify(initialData.schema, null, 2));
            }
        }
    }, [initialData]);

    useCopilotReadable({
        description: "The current state of the template editor. Use this context to understand what the user is working on.",
        value: {
            name,
            description,
            category,
            content
        },
    });

    useCopilotAction({
        name: "updateTemplateContent",
        description: "Update the content of the template being edited. Use this to write, rewrite, or format the template text based on user instructions.",
        parameters: [
            {
                name: "content",
                type: "string",
                description: "The new content for the template.",
                required: true,
            },
        ],
        handler: async ({ content }) => {
            setContent(content);
            return "Template content updated successfully.";
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Wrap content in a simple object structure for now, as per plan
            const schemaPayload = { content: content };

            await onSave({
                title: name,
                description,
                metadata: { category },
                schema: schemaPayload,
                code: initialData?.code || `tpl-${Date.now()}`, // Simple code generation
                version: initialData?.version || '1.0.0'
            });
        } catch (error) {
            console.error('Failed to save template', error);
            alert('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                    {initialData ? 'Edit Template' : 'Create New Template'}
                </h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Template Name
                    </label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Information Security Policy"
                    />
                </div>

                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                    </label>
                    <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="Policy">Policy</option>
                        <option value="Procedure">Procedure</option>
                        <option value="Form">Form</option>
                        <option value="Checklist">Checklist</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Brief description of this template..."
                    />
                </div>

                <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                        Content
                    </label>
                    <div className="text-xs text-gray-500 mb-2">
                        Enter the template text below.
                    </div>
                    <textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={15}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder="# Policy Title&#10;&#10;1. Purpose&#10;..."
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Template'}
                </button>
            </div>
        </form>
    );
}
