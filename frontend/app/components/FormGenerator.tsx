'use client';

import React, { useState } from 'react';
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import { Upload, FileText, Save, Play } from 'lucide-react';

// Simple default schema for demonstration
const defaultSchema = {
    title: "New Form",
    type: "object",
    properties: {
        title: { type: "string", title: "Title", default: "A new form" },
        done: { type: "boolean", title: "Done?", default: false }
    }
};

export default function FormGenerator() {
    const [schema, setSchema] = useState<any>(defaultSchema);
    const [uiSchema, setUiSchema] = useState<any>({});
    const [formData, setFormData] = useState<any>({});
    const [mode, setMode] = useState<'edit' | 'preview'>('edit');

    const handleSchemaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        try {
            const parsed = JSON.parse(e.target.value);
            setSchema(parsed);
        } catch (error) {
            // Invalid JSON, ignore for now or show error
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Show loading state (optional, can add state for this)
            const response = await fetch('http://localhost:3001/forms/generate-schema', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to generate schema');
            }

            const generatedSchema = await response.json();
            setSchema(generatedSchema);
            setMode('preview'); // Switch to preview to see the result
        } catch (error) {
            console.error('Error generating schema:', error);
            alert('Failed to generate schema from document');
        }
    };

    const handleAutoFill = async () => {
        try {
            // In a real app, we'd pass a context string or project ID
            const response = await fetch('http://localhost:3001/forms/auto-fill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schema }),
            });

            if (!response.ok) {
                throw new Error('Failed to auto-fill form');
            }

            const filledData = await response.json();
            setFormData({ ...formData, ...filledData });
            alert('Form auto-filled based on available knowledge!');
        } catch (error) {
            console.error('Error auto-filling form:', error);
            alert('Failed to auto-fill form');
        }
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4">
                <h1 className="text-2xl font-semibold text-gray-800">Form Generator</h1>
                <div className="flex gap-2">
                    {mode === 'preview' && (
                        <button
                            onClick={handleAutoFill}
                            className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-500"
                        >
                            <FileText className="h-4 w-4" />
                            Auto-Fill with AI
                        </button>
                    )}
                    <button
                        onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
                        className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                        {mode === 'edit' ? <Play className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        {mode === 'edit' ? 'Preview' : 'Edit Schema'}
                    </button>
                    <button className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500">
                        <Save className="h-4 w-4" />
                        Save Template
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel: Editor / Upload */}
                {mode === 'edit' && (
                    <div className="w-1/2 border-r bg-gray-50 p-6 overflow-y-auto">
                        <div className="mb-6">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Generate from Document
                            </label>
                            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 hover:border-blue-500 bg-white">
                                <div className="text-center">
                                    <Upload className="mx-auto h-12 w-12 text-gray-300" />
                                    <div className="mt-4 flex text-sm leading-6 text-gray-600">
                                        <label
                                            htmlFor="file-upload"
                                            className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                                        >
                                            <span>Upload a file</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileUpload} />
                                        </label>
                                        <p className="pl-1">to generate schema</p>
                                    </div>
                                    <p className="text-xs leading-5 text-gray-600">PDF, DOCX up to 10MB</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                JSON Schema
                            </label>
                            <textarea
                                className="h-[500px] w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                                value={JSON.stringify(schema, null, 2)}
                                onChange={handleSchemaChange}
                            />
                        </div>
                    </div>
                )}

                {/* Right Panel: Form Preview */}
                <div className={`${mode === 'edit' ? 'w-1/2' : 'w-full max-w-3xl mx-auto'} p-6 overflow-y-auto`}>
                    <div className="rounded-lg bg-white p-6 shadow-sm border">
                        <Form
                            schema={schema}
                            uiSchema={uiSchema}
                            formData={formData}
                            onChange={(e) => setFormData(e.formData)}
                            validator={validator}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
