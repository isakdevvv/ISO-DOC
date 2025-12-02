'use client';

import React, { useMemo, useState } from 'react';
import { useIDE, Document } from './IDEContext';

export default function FileExplorer() {
    const { files, openFile, activeFileId } = useIDE();
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Group files by batchId or "Uncategorized"
    const groupedFiles = useMemo(() => {
        const groups: Record<string, Document[]> = {};
        files.forEach(file => {
            const key = file.batchId || 'Uncategorized';
            if (!groups[key]) groups[key] = [];
            groups[key].push(file);
        });
        return groups;
    }, [files]);

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200 text-sm">
            <div className="p-3 font-semibold text-gray-700 border-b border-gray-200 flex justify-between items-center">
                <span>Explorer</span>
                <span className="text-xs text-gray-400">{files.length} files</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {Object.entries(groupedFiles).map(([group, groupFiles]) => (
                    <div key={group} className="mb-2">
                        <div
                            className="flex items-center gap-2 px-2 py-1 hover:bg-gray-200 rounded cursor-pointer text-gray-600 font-medium select-none"
                            onClick={() => toggleGroup(group)}
                        >
                            <span className="text-xs">{expandedGroups[group] ? '▼' : '▶'}</span>
                            {group === 'Uncategorized' ? 'All Documents' : `Batch ${group.substring(0, 8)}...`}
                        </div>
                        {expandedGroups[group] && (
                            <div className="ml-4 mt-1 space-y-0.5">
                                {groupFiles.map(file => (
                                    <div
                                        key={file.id}
                                        onClick={() => openFile(file.id)}
                                        className={`px-2 py-1.5 rounded cursor-pointer truncate transition-colors ${activeFileId === file.id
                                                ? 'bg-blue-100 text-blue-700 font-medium'
                                                : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                        title={file.title}
                                    >
                                        📄 {file.title}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
