"use client";

import { CopilotKit } from "@copilotkit/react-core";

import type { PropsWithChildren } from "react";
import { useCopilotAction } from "@copilotkit/react-core";
import { fetchNode, fetchNodes } from "@/lib/api";

function CopilotBackendActions() {
    useCopilotAction({
        name: "getRecentNodes",
        description: "Get the most recently updated nodes.",
        parameters: [
            { name: "limit", type: "number", description: "Number of nodes to return (default 5)", required: false },
        ],
        handler: async ({ limit = 5 }) => {
            // TODO: Use dynamic projectId
            const nodes = await fetchNodes('default-project-id');
            return {
                nodes: nodes.slice(0, limit).map(n => ({
                    id: n.id,
                    title: n.title,
                    status: n.status,
                    createdAt: n.createdAt
                }))
            };
        },
    });

    useCopilotAction({
        name: "getNodeDetails",
        description: "Fetch a node by id to provide status and metadata for the answer.",
        parameters: [
            { name: "nodeId", type: "string", description: "Node id to fetch", required: true },
        ],
        handler: async ({ nodeId }) => {
            const node = await fetchNode(nodeId);
            return {
                id: node.id,
                title: node.title,
                status: node.status,
                createdAt: node.createdAt,
                type: node.type,
            };
        },
    });

    return null;
}

import { SessionProvider } from "next-auth/react";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { usePathname } from "next/navigation";



import { useEffect, useState } from "react";
import { fetchTenant } from "@/lib/api";
import { useCopilotReadable } from "@copilotkit/react-core";

function SystemPromptManager() {
    const [systemPrompt, setSystemPrompt] = useState<string>("");

    useEffect(() => {
        fetchTenant('ea7404bc-dd8d-47bc-a178-a1e1d62c92ea')
            .then(t => {
                if (t.agentSettings?.systemPrompt) {
                    setSystemPrompt(t.agentSettings.systemPrompt);
                }
            })
            .catch(err => console.error("Failed to load system prompt", err));
    }, []);

    useCopilotReadable({
        description: "System Instructions / Agent Persona. These instructions define how the agent should behave.",
        value: systemPrompt,
    }, [systemPrompt]);

    return null;
}

export default function Providers({ children }: PropsWithChildren) {
    const pathname = usePathname();
    // Use pathname as key to reset copilot context when navigating between projects or main sections
    // This ensures that project context doesn't leak into other areas
    const copilotKey = pathname?.startsWith('/app/projects/') ? pathname : 'global';

    return (
        <SessionProvider refetchOnWindowFocus={false}>
            <CopilotKit
                runtimeUrl="/api/copilot"
                properties={{ surface: "iso-doc-ui" }}
                key={copilotKey}
            >
                <SystemPromptManager />
                <CopilotBackendActions />
                {children}
            </CopilotKit>
        </SessionProvider>
    );
}
