'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Node } from '@/lib/api';

interface IDEContextType {
    nodes: Node[];
    setNodes: (nodes: Node[]) => void;
    openNodes: string[]; // IDs of open nodes
    activeNodeId: string | null;
    openNode: (id: string) => void;
    closeNode: (id: string) => void;
    setActiveNode: (id: string) => void;
    sidebarVisible: boolean;
    toggleSidebar: () => void;
    rightPanelVisible: boolean;
    toggleRightPanel: () => void;
}

const IDEContext = createContext<IDEContextType | undefined>(undefined);

export function IDEProvider({ children }: { children: ReactNode }) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [openNodes, setOpenNodes] = useState<string[]>([]);
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [rightPanelVisible, setRightPanelVisible] = useState(true);

    const openNode = (id: string) => {
        if (!openNodes.includes(id)) {
            setOpenNodes([...openNodes, id]);
        }
        setActiveNodeId(id);
    };

    const closeNode = (id: string) => {
        const newOpenNodes = openNodes.filter(nodeId => nodeId !== id);
        setOpenNodes(newOpenNodes);

        if (activeNodeId === id) {
            // If we closed the active node, switch to the last one or null
            setActiveNodeId(newOpenNodes.length > 0 ? newOpenNodes[newOpenNodes.length - 1] : null);
        }
    };

    const setActiveNode = (id: string) => {
        setActiveNodeId(id);
    };

    const toggleSidebar = () => setSidebarVisible(!sidebarVisible);
    const toggleRightPanel = () => setRightPanelVisible(!rightPanelVisible);

    return (
        <IDEContext.Provider value={{
            nodes,
            setNodes,
            openNodes,
            activeNodeId,
            openNode,
            closeNode,
            setActiveNode,
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

