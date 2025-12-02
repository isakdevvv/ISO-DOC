'use client';

import React, { useState } from 'react';
import { RuleConflict, resolveConflict } from '@/lib/api';

interface ConflictResolverProps {
    conflict: RuleConflict;
    onResolved: () => void;
    onCancel: () => void;
}

export default function ConflictResolver({ conflict, onResolved, onCancel }: ConflictResolverProps) {
    const [resolution, setResolution] = useState<'OVERRIDE_A' | 'OVERRIDE_B' | 'IGNORE' | null>(null);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (!resolution) return;
        setSubmitting(true);
        try {
            await resolveConflict(conflict.id, resolution, notes);
            onResolved();
        } catch (err) {
            alert('Failed to resolve conflict');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Resolve Conflict</h2>

                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-red-600 uppercase tracking-wide">{conflict.conflictType}</span>
                        <span className="text-xs text-gray-500">ID: {conflict.id.slice(0, 8)}</span>
                    </div>
                    <p className="text-gray-900 font-medium mb-2">{conflict.message}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex-1 p-2 bg-white rounded border border-red-200">
                            <span className="block text-xs text-gray-400 mb-1">Rule A</span>
                            <span className="font-mono font-bold">{conflict.ruleACode}</span>
                        </div>
                        <span className="text-gray-400">vs</span>
                        <div className="flex-1 p-2 bg-white rounded border border-red-200">
                            <span className="block text-xs text-gray-400 mb-1">Rule B</span>
                            <span className="font-mono font-bold">{conflict.ruleBCode}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <h3 className="text-sm font-semibold text-gray-900">Choose Resolution</h3>

                    <label className={`block p-4 rounded-lg border cursor-pointer transition ${resolution === 'OVERRIDE_A' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="resolution"
                                value="OVERRIDE_A"
                                checked={resolution === 'OVERRIDE_A'}
                                onChange={() => setResolution('OVERRIDE_A')}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <span className="block font-medium text-gray-900">Override Rule A</span>
                                <span className="text-sm text-gray-500">Disable Rule A ({conflict.ruleACode}) and keep Rule B active.</span>
                            </div>
                        </div>
                    </label>

                    <label className={`block p-4 rounded-lg border cursor-pointer transition ${resolution === 'OVERRIDE_B' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="resolution"
                                value="OVERRIDE_B"
                                checked={resolution === 'OVERRIDE_B'}
                                onChange={() => setResolution('OVERRIDE_B')}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <span className="block font-medium text-gray-900">Override Rule B</span>
                                <span className="text-sm text-gray-500">Disable Rule B ({conflict.ruleBCode}) and keep Rule A active.</span>
                            </div>
                        </div>
                    </label>

                    <label className={`block p-4 rounded-lg border cursor-pointer transition ${resolution === 'IGNORE' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="resolution"
                                value="IGNORE"
                                checked={resolution === 'IGNORE'}
                                onChange={() => setResolution('IGNORE')}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <span className="block font-medium text-gray-900">Ignore Conflict</span>
                                <span className="text-sm text-gray-500">Mark as resolved without changing rules. Both rules remain active.</span>
                            </div>
                        </div>
                    </label>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Explain why you chose this resolution..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 h-24 resize-none"
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={submitting}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!resolution || submitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {submitting ? 'Resolving...' : 'Confirm Resolution'}
                    </button>
                </div>
            </div>
        </div>
    );
}
