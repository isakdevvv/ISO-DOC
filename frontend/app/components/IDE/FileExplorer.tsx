'use client';

import React, { useMemo, useState } from 'react';
import { useIDE } from './IDEContext';
import { Node } from '@/lib/api';

export default function FileExplorer() {
    const { nodes, openNode, activeNodeId } = useIDE();
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Group nodes by type
    const groupedNodes = useMemo(() => {
        const groups: Record<string, Node[]> = {};
        nodes.forEach(node => {
            const key = node.type || 'Uncategorized';
            if (!groups[key]) groups[key] = [];
            groups[key].push(node);
        });
        return groups;
    }, [nodes]);

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200 text-sm">
            <div className="p-3 font-semibold text-gray-700 border-b border-gray-200 flex justify-between items-center">
                <span>Explorer</span>
                <span className="text-xs text-gray-400">{nodes.length} items</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {Object.entries(groupedNodes).map(([group, groupNodes]) => (
                    <div key={group} className="mb-2">
                        <div
                            className="flex items-center gap-2 px-2 py-1 hover:bg-gray-200 rounded cursor-pointer text-gray-600 font-medium select-none"
                            onClick={() => toggleGroup(group)}
                        >
                            <span className="text-xs">{expandedGroups[group] ? '▼' : '▶'}</span>
                            {group}
                        </div>
                        {expandedGroups[group] && (
                            <div className="ml-4 mt-1 space-y-0.5">
                                {groupNodes.map(node => (
                                    <div
                                        key={node.id}
                                        onClick={() => openNode(node.id)}
                                        className={`px-2 py-1.5 rounded cursor-pointer truncate transition-colors ${activeNodeId === node.id
                                            ? 'bg-blue-100 text-blue-700 font-medium'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                        title={node.title}
                                    >
                                        📄 {node.title}
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
