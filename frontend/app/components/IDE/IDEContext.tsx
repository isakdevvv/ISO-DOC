'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Document {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    batchId?: string | null;
    docType?: string | null;
}

interface IDEContextType {
    files: Document[];
    setFiles: (files: Document[]) => void;
    openFiles: string[]; // IDs of open files
    activeFileId: string | null;
    openFile: (id: string) => void;
    closeFile: (id: string) => void;
    setActiveFile: (id: string) => void;
    sidebarVisible: boolean;
    toggleSidebar: () => void;
    rightPanelVisible: boolean;
    toggleRightPanel: () => void;
}

const IDEContext = createContext<IDEContextType | undefined>(undefined);

export function IDEProvider({ children }: { children: ReactNode }) {
    const [files, setFiles] = useState<Document[]>([]);
    const [openFiles, setOpenFiles] = useState<string[]>([]);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [rightPanelVisible, setRightPanelVisible] = useState(true);

    const openFile = (id: string) => {
        if (!openFiles.includes(id)) {
            setOpenFiles([...openFiles, id]);
        }
        setActiveFileId(id);
    };

    const closeFile = (id: string) => {
        const newOpenFiles = openFiles.filter(fileId => fileId !== id);
        setOpenFiles(newOpenFiles);

        if (activeFileId === id) {
            // If we closed the active file, switch to the last one or null
            setActiveFileId(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
        }
    };

    const setActiveFile = (id: string) => {
        setActiveFileId(id);
    };

    const toggleSidebar = () => setSidebarVisible(!sidebarVisible);
    const toggleRightPanel = () => setRightPanelVisible(!rightPanelVisible);

    return (
        <IDEContext.Provider value={{
            files,
            setFiles,
            openFiles,
            activeFileId,
            openFile,
            closeFile,
            setActiveFile,
            sidebarVisible,
            toggleSidebar,
            rightPanelVisible,
            toggleRightPanel
        }}>
            {children}
        </IDEContext.Provider>
    );
}

export function useIDE() {
    const context = useContext(IDEContext);
    if (context === undefined) {
        throw new Error('useIDE must be used within an IDEProvider');
    }
    return context;
}
