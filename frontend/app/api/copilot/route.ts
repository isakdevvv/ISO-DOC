import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import OpenAI from "openai";

const openrouterApiKey = process.env.OPENROUTER_API_KEY;

if (!openrouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is missing. Set it in your environment to enable Copilot chat.");
}

const openai = new OpenAI({
    apiKey: openrouterApiKey,
    baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "ISO Doc Copilot",
    },
});

const serviceAdapter = new OpenAIAdapter({
    openai,
    model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
});

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const runtime = new CopilotRuntime({
    actions: [
        {
            name: "searchDocuments",
            description: "Search for relevant documents and content based on a query.",
            parameters: [
                {
                    name: "query",
                    type: "string",
                    description: "The search query to find relevant documents.",
                    required: true,
                },
            ],
            handler: async ({ query }: { query: string }) => {
                const session = await getServerSession(authOptions);
                const token = (session as any)?.accessToken;

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/documents/search?q=${encodeURIComponent(query)}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!res.ok) {
                    return "Failed to search documents.";
                }

                const data = await res.json();
                return JSON.stringify(data);
            },
        },
        {
            name: "updateDocumentMetadata",
            description: "Update metadata for a specific document.",
            parameters: [
                {
                    name: "id",
                    type: "string",
                    description: "The ID of the document to update.",
                    required: true,
                },
                {
                    name: "metadata",
                    type: "object",
                    description: "The metadata to update (e.g., title, author, summary).",
                    required: true,
                },
            ],
            handler: async ({ id, metadata }: { id: string, metadata: any }) => {
                const session = await getServerSession(authOptions);
                const token = (session as any)?.accessToken;

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/documents/${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(metadata)
                });

                if (!res.ok) {
                    return "Failed to update document metadata.";
                }

                return "Document metadata updated successfully.";
            },
        },
    ],
});

const handler = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilot",
});

export const { GET, POST, OPTIONS } = handler;
