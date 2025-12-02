'use client';

import React from 'react';
import { useIDE } from './IDEContext';

export default function EditorTabs() {
    const { openFiles, activeFileId, setActiveFile, closeFile, files } = useIDE();

    if (openFiles.length === 0) return null;

    return (
        <div className="flex bg-gray-100 border-b border-gray-200 overflow-x-auto no-scrollbar">
            {openFiles.map(fileId => {
                const file = files.find(f => f.id === fileId);
                if (!file) return null;

                const isActive = activeFileId === fileId;

                return (
                    <div
                        key={fileId}
                        className={`
                            group flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r border-gray-200 min-w-[120px] max-w-[200px]
                            ${isActive ? 'bg-white text-blue-600 font-medium border-t-2 border-t-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}
                        `}
                        onClick={() => setActiveFile(fileId)}
                    >
                        <span className="truncate flex-1">{file.title}</span>
                        <button
                            className={`
                                w-4 h-4 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 hover:bg-gray-300
                                ${isActive ? 'opacity-100' : ''}
                            `}
                            onClick={(e) => {
                                e.stopPropagation();
                                closeFile(fileId);
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
