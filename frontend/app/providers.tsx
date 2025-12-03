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

    const loadSystemPrompt = () => {
        fetchTenant('termoteam')
            .then(t => {
                if (t.agentSettings?.systemPrompt) {
                    setSystemPrompt(t.agentSettings.systemPrompt);
                }
            })
            .catch(err => console.error("Failed to load system prompt", err));
    };

    useEffect(() => {
        // Load initially
        loadSystemPrompt();

        // Listen for custom event to reload
        const handleRefresh = () => {
            loadSystemPrompt();
        };

        window.addEventListener('systemPromptUpdated', handleRefresh);
        return () => {
            window.removeEventListener('systemPromptUpdated', handleRefresh);
        };
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

    // Don't initialize CopilotKit on unauthenticated pages (login) to prevent GraphQL errors
    const isAuthPage = pathname === '/login';

    return (
        <SessionProvider refetchOnWindowFocus={false}>
            {isAuthPage ? (
                children
            ) : (
                <CopilotKit
                    runtimeUrl="/api/copilot"
                    properties={{ surface: "iso-doc-ui" }}
                    key={copilotKey}
                >
                    <SystemPromptManager />
                    <CopilotBackendActions />
                    {children}
                </CopilotKit>
            )}
        </SessionProvider>
    );
}
