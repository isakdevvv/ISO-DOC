"use client";

import React from "react";
import { NodeGraphView } from "@/components/nodes/NodeGraphView";
import { useProjectNodeEdges } from "@/lib/hooks/project"; // Import mock hook

type Props = {
  project: any;
  nodes: any[];
  tasks: any[];
  maintenanceEvents: any[];
  compliance: any;
  avvik: any[];
  onSelectNode?: (node: any | null) => void;
};

export function ProjectLayout(props: Props) {
  const { nodes, onSelectNode } = props;

  // edges can be fetched from DB (node_edges), but here pseudo:
  const edges = useProjectNodeEdges(props.project?.id); // returns { id, fromNodeId, toNodeId, relationType }[]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header / overall */}

      <section className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {/* Node Table / list */}
          <h2>Nodes</h2>
          <ul>
            {nodes.map(node => (
              <li key={node.id} onClick={() => onSelectNode?.(node)} style={{ cursor: 'pointer', border: '1px solid gray', margin: '5px', padding: '5px' }}>
                {node.title} ({node.type})
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-1">
          {/* DAG-visualization */}
          <h2 className="text-sm font-semibold mb-2">Sammenheng mellom noder</h2>
          <NodeGraphView
            nodes={nodes}
            edges={edges}
            onSelectNode={onSelectNode}
          />
        </div>
      </section>
    </div>
  );
}
