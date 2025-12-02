"use client";

import { CopilotKit } from "@copilotkit/react-core";

import type { PropsWithChildren } from "react";
import { useCopilotAction } from "@copilotkit/react-core";
import { fetchDocument, searchDocuments } from "@/lib/api";

function CopilotBackendActions() {
    useCopilotAction({
        name: "searchDocuments",
        description: "Search documents via the backend and return top matches with ids, titles, and status.",
        parameters: [
            { name: "query", type: "string", description: "Search text", required: true },
            { name: "limit", type: "number", description: "Max results to return", required: false },
        ],
        handler: async ({ query, limit }) => {
            const data = await searchDocuments(query);
            const items = Array.isArray(data) ? data : data?.results || [];
            const trimmed = (limit ? items.slice(0, limit) : items).map((item: any) => ({
                id: item.id,
                title: item.title,
                status: item.status,
                score: item.score ?? item.matchScore,
            }));
            return { results: trimmed };
        },
    });

    useCopilotAction({
        name: "getDocumentDetails",
        description: "Fetch a document by id to provide status and metadata for the answer.",
        parameters: [
            { name: "documentId", type: "string", description: "Document id to fetch", required: true },
        ],
        handler: async ({ documentId }) => {
            const doc = await fetchDocument(documentId);
            return {
                id: doc.id,
                title: doc.title,
                status: doc.status,
                createdAt: doc.createdAt,
            };
        },
    });

    return null;
}

import { SessionProvider } from "next-auth/react";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { usePathname } from "next/navigation";

function GlobalCopilotWrapper() {
    const pathname = usePathname();
    // Do not show global sidebar on document pages where we have a persistent one
    if (pathname?.startsWith('/app/documents/')) {
        return null;
    }

    return (
        <CopilotSidebar
            instructions="Du er en ISO-compliance copilot. Bruk all delt kontekst (dokumenter, standarder, gap- og compliance-resultater) til å svare kort, fylle ut skjemaer på brukerens vegne med godkjenning, og foreslå tekst for remediation. Ikke finn på innhold; siter eller foreslå utkast som brukeren må godkjenne."
            defaultOpen={false}
            shortcut="/"
            labels={{ title: "ISO Copilot" }}
        />
    );
}

export default function Providers({ children }: PropsWithChildren) {
    return (
        <SessionProvider refetchOnWindowFocus={false}>
            <CopilotKit
                runtimeUrl="/api/copilot"
                properties={{ surface: "iso-doc-ui" }}
            >
                <CopilotBackendActions />
                {children}
                <GlobalCopilotWrapper />
            </CopilotKit>
        </SessionProvider>
    );
}
