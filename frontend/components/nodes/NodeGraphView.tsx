"use client";

import React, { useMemo, useCallback } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Node,
    Edge,
    Position,
} from "reactflow";
import "reactflow/dist/style.css";

type TermoTeamNode = {
    id: string;
    type: string;
    title: string;
    status: string;
};

type TermoTeamEdge = {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    relationType: string;
};

export type NodeGraphViewProps = {
    nodes: TermoTeamNode[];
    edges: TermoTeamEdge[];
    selectedNodeId?: string;
    onSelectNode?: (node: TermoTeamNode | null) => void;
};

export function NodeGraphView({
    nodes,
    edges,
    selectedNodeId,
    onSelectNode,
}: NodeGraphViewProps) {
    const rfNodes: Node[] = useMemo(
        () =>
            nodes.map((n, index) => ({
                id: n.id,
                data: { label: `${n.type}: ${n.title}` },
                position: {
                    x: (index % 5) * 250,
                    y: Math.floor(index / 5) * 150,
                },
                style: {
                    borderRadius: 8,
                    padding: 8,
                    border:
                        n.id === selectedNodeId ? "2px solid #2A64D1" : "1px solid #D9DDE3",
                    background:
                        n.status === "approved"
                            ? "#E5F9EC"
                            : n.status === "pending_review"
                                ? "#FFF4E0"
                                : "#FFFFFF",
                    fontSize: 12,
                },
            })),
        [nodes, selectedNodeId]
    );

    const rfEdges: Edge[] = useMemo(
        () =>
            edges.map((e) => ({
                id: e.id,
                source: e.fromNodeId,
                target: e.toNodeId,
                label: e.relationType,
                animated: e.relationType === "UPDATES" || e.relationType === "GENERATES",
                style: { stroke: "#CBD2E0" },
                labelBgPadding: [4, 2],
                labelBgBorderRadius: 4,
                labelBgStyle: { fill: "#F7F8FA" },
            })),
        [edges]
    );

    const handleNodeClick = useCallback(
        (_: any, node: Node) => {
            const found = nodes.find((n) => n.id === node.id) || null;
            onSelectNode?.(found);
        },
        [nodes, onSelectNode]
    );

    return (
        <div className="border border-gray-200 rounded-xl h-[480px] overflow-hidden">
            <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodeClick={handleNodeClick}
                fitView
            >
                <MiniMap
                    nodeStrokeColor={(n) =>
                        n.id === selectedNodeId ? "#2A64D1" : "#999"
                    }
                    nodeColor={(n) => {
                        if ((n.style as any)?.background) return (n.style as any).background;
                        return "#FFF";
                    }}
                />
                <Controls />
                <Background gap={16} />
            </ReactFlow>
        </div>
    );
}
