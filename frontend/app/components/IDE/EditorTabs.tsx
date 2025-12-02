'use client';

import React from 'react';
import { useIDE } from './IDEContext';

export default function EditorTabs() {
    const { openNodes, activeNodeId, setActiveNode, closeNode, nodes } = useIDE();

    if (openNodes.length === 0) return null;

    return (
        <div className="flex bg-gray-100 border-b border-gray-200 overflow-x-auto no-scrollbar">
            {openNodes.map(nodeId => {
                const node = nodes.find(n => n.id === nodeId);
                if (!node) return null;

                const isActive = activeNodeId === nodeId;

                return (
                    <div
                        key={nodeId}
                        className={`
                            group flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r border-gray-200 min-w-[120px] max-w-[200px]
                            ${isActive ? 'bg-white text-blue-600 font-medium border-t-2 border-t-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}
                        `}
                        onClick={() => setActiveNode(nodeId)}
                    >
                        <span className="truncate flex-1">{node.title}</span>
                        <button
                            className={`
                                w-4 h-4 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 hover:bg-gray-300
                                ${isActive ? 'opacity-100' : ''}
                            `}
                            onClick={(e) => {
                                e.stopPropagation();
                                closeNode(nodeId);
                            }}
                        >
                            ×
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
