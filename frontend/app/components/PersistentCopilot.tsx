"use client";

import { CopilotChat } from "@copilotkit/react-ui";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useEffect, useState, useRef, ChangeEvent, DragEvent, useCallback } from "react";
import { createPortal } from "react-dom";
import { uploadFiles, fetchNodes, Node as ApiNode, isAuthenticationError } from "@/lib/api";
import { useCopilotReadable } from "@copilotkit/react-core";

export default function PersistentCopilot() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [uploading, setUploading] = useState(false);
    const [nodes, setNodes] = useState<ApiNode[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const baseSuggestions = useMemo(() => {
        const tab = searchParams.get('tab');

        if (pathname.startsWith('/app/documents')) {
            // Specific document page (if ID is present) or list
            if (pathname === '/app/documents') {
                return [
                    { title: "Last opp dokument", message: "Hvordan laster jeg opp et dokument?" },
                    { title: "Søk i dokumenter", message: "Finn dokumenter om sikkerhet" },
                    { title: "Statusoversikt", message: "Hva er status på mine dokumenter?" }
                ];
            }
            // Document detail page
            return [
                { title: "Oppsummer", message: "Oppsummer dette dokumentet" },
                { title: "Finn risikoer", message: "Hvilke risikoer er nevnt her?" },
                { title: "Sjekk compliance", message: "Er dette dokumentet i henhold til ISO 27001?" },
                { title: "Forbedre språk", message: "Gi forslag til bedre formuleringer" }
            ];
        }

        if (pathname.startsWith('/app/projects')) {
            if (pathname === '/app/projects') {
                return [
                    { title: "Nytt prosjekt", message: "Hjelp meg å opprette et nytt prosjekt" },
                    { title: "Prosjektstatus", message: "Vis status for alle prosjekter" }
                ];
            }
            // Project detail
            return [
                { title: "Neste steg", message: "Hva er neste steg i dette prosjektet?" },
                { title: "Lag statusrapport", message: "Lag en kort statusrapport for dette prosjektet" },
                { title: "Mangler", message: "Hvilke dokumenter mangler?" }
            ];
        }

        if (pathname === '/app/dashboard') {
            if (tab === 'compliance') {
                return [
                    { title: "Start revisjon", message: "Start en ny compliance-revisjon" },
                    { title: "Oppsummer gap", message: "Hva er de største gapene nå?" },
                    { title: "ISO 27001 status", message: "Hva er status mot ISO 27001?" }
                ];
            }
            if (tab === 'templates') {
                return [
                    { title: "Ny mal", message: "Hjelp meg å lage en ny mal for sikkerhetspolicy" },
                    { title: "Foreslå innhold", message: "Gi meg et utkast til en beredskapsplan" }
                ];
            }
            // Default dashboard
            return [
                { title: "Hva skjer?", message: "Hva bør jeg fokusere på i dag?" },
                { title: "Siste dokumenter", message: "Vis de siste opplastede dokumentene" },
                { title: "Start prosjekt", message: "Jeg vil starte et nytt prosjekt" }
            ];
        }

        // Fallback
        return [
            { title: "Hjelp", message: "Hva kan du hjelpe meg med?" },
            { title: "Søk", message: "Søk etter informasjon i basen" }
        ];
    }, [pathname, searchParams]);

    const loadNodes = async () => {
        try {
            // TODO: Get projectId from context
            const projectId = 'default-project-id';
            const data = await fetchNodes(projectId);
            setNodes(data);
        } catch (error) {
            if (isAuthenticationError(error)) {
                return;
            }
            console.error('Failed to fetch nodes in copilot sidebar', error);
        }
    };

    useEffect(() => {
        loadNodes();
        const interval = setInterval(loadNodes, 15000);
        return () => clearInterval(interval);
    }, []);

    useCopilotReadable({
        description: 'Status på noder synlig i Copilot-panelet',
        value: {
            nodes,
        },
    }, [nodes]);

    const processFiles = async (files: FileList | File[]) => {
        const list = Array.isArray(files) ? files : Array.from(files);
        if (!list.length) return;

        setUploading(true);

        try {
            // TODO: Get projectId from context
            await uploadFiles(list, { projectId: 'default-project-id' });
            await loadNodes();
        } catch (error) {
            if (!isAuthenticationError(error)) {
                console.error('Failed to upload documents from Copilot', error);
                alert('Kunne ikke laste opp dokumentene. Prøv igjen.');
            }
        } finally {
            setUploading(false);
        }
    };

    const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
        if (!Array.from(event.dataTransfer.types || []).includes('Files')) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        if (!Array.from(event.dataTransfer.types || []).includes('Files')) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (!isDragging) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const related = event.relatedTarget as Node | null;
        if (related && event.currentTarget.contains(related)) {
            return;
        }
        setIsDragging(false);
    };

    const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        const files = event.dataTransfer.files;
        if (files?.length) {
            await processFiles(files);
        }
        event.dataTransfer.clearData();
    };

    // Programmatically remove CopilotKit branding
    useEffect(() => {
        const observer = new MutationObserver(() => {
            const poweredBy = document.querySelectorAll('a[href*="copilotkit.ai"], .copilot-kit-powered-by, [class*="copilotKitPoweredBy"], .poweredBy, p[class*="poweredBy"]');
            poweredBy.forEach(el => {
                if (el instanceof HTMLElement) {
                    // Use setProperty with 'important' to override inline styles
                    el.style.setProperty('display', 'none', 'important');
                    el.style.setProperty('visibility', 'hidden', 'important');
                    el.style.setProperty('opacity', '0', 'important');
                    el.style.setProperty('pointer-events', 'none', 'important');
                    el.style.setProperty('height', '0', 'important');
                    el.style.setProperty('width', '0', 'important');
                    el.style.setProperty('position', 'absolute', 'important');

                    // Also clear content as a failsafe
                    if (el.innerHTML !== '') {
                        el.innerHTML = '';
                    }
                }
            });

            // Text content fallback
            const allElements = document.querySelectorAll('p, div, a, span');
            allElements.forEach(el => {
                if (el.textContent?.trim() === 'Powered by CopilotKit') {
                    if (el instanceof HTMLElement) {
                        el.style.setProperty('display', 'none', 'important');
                        el.style.setProperty('visibility', 'hidden', 'important');
                        el.textContent = ''; // Clear text
                    }
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true, attributes: true });
        return () => observer.disconnect();
    }, []);

    return (
        <div className="h-full bg-white flex flex-col relative">
            <style jsx global>{`
                .copilot-kit-powered-by, 
                [class*="copilotKitPoweredBy"], 
                a[href*="copilotkit.ai"],
                .poweredBy,
                p[class*="poweredBy"] {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                    height: 0 !important;
                    width: 0 !important;
                    position: absolute !important;
                    content-visibility: hidden !important;
            `}</style>
            <div className="bg-gray-50 p-3 border-b font-medium text-gray-700 flex items-center gap-2">
                <span>🤖</span> ISO Copilot
            </div>
            <div
                className={`flex-1 overflow-hidden relative ${isDragging ? 'ring-2 ring-blue-400' : ''}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isDragging && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-100/70 border-2 border-dashed border-blue-400 text-blue-700 text-sm font-semibold pointer-events-none">
                        Slipp dokumenter for å laste opp
                    </div>
                )}
                <CopilotChat
                    className="h-full"
                    instructions="Du er en ISO-compliance copilot. Bruk all delt kontekst (dokumenter, standarder, gap- og compliance-resultater) til å svare kort, fylle ut skjemaer på brukerens vegne med godkjenning, og foreslå tekst for remediation. Ikke finn på innhold; siter eller foreslå utkast som brukeren må godkjenne."
                    labels={{
                        title: "Chat",
                        initial: "Hei! Jeg kan hjelpe deg med å fylle ut skjemaer og sjekke compliance. Hva vil du gjøre?",
                    }}
                    suggestions={[]}
                />
                <UploadTriggerButton onFilesSelected={processFiles} uploading={uploading} />
            </div>
            <div className="p-2 text-center text-xs text-gray-400 border-t border-gray-100">
                Powered by OEAI
            </div>
        </div>
    );
}

function UploadTriggerButton({ onFilesSelected, uploading }: { onFilesSelected: (files: FileList | File[]) => void, uploading: boolean }) {
    const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const selector = '.copilotKitInputControls';
        let placeholder: HTMLDivElement | null = null;
        let assignedContainer: Element | null = null;

        const assignTarget = () => {
            const el = document.querySelector(selector);
            if (el) {
                assignedContainer = el;
                placeholder = document.createElement('div');
                placeholder.className = 'copilot-upload-control-wrapper';
                placeholder.style.display = 'flex';
                placeholder.style.alignItems = 'center';
                placeholder.style.gap = '4px';
                const lastChild = el.lastElementChild;
                if (lastChild) {
                    el.insertBefore(placeholder, lastChild);
                } else {
                    el.appendChild(placeholder);
                }
                setPortalEl(placeholder);
                return true;
            }
            return false;
        };

        if (assignTarget()) {
            return;
        }

        const observer = new MutationObserver(() => {
            if (assignTarget()) {
                observer.disconnect();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        return () => {
            observer.disconnect();
            if (placeholder && placeholder.parentElement) {
                placeholder.parentElement.removeChild(placeholder);
            }
            setPortalEl(null);
        };
    }, []);

    const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files?.length) {
            await onFilesSelected(files);
        }
        event.target.value = '';
    };

    const triggerPicker = () => inputRef.current?.click();

    if (!portalEl) {
        return null;
    }

    return createPortal(
        <>
            <button
                type="button"
                onClick={triggerPicker}
                className="copilotKitInputControlButton"
                disabled={uploading}
                title="Last opp dokumenter"
            >
                {uploading ? '…' : '⬆️'}
            </button>
            <input
                ref={inputRef}
                className="hidden"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.zip"
                onChange={handleChange}
            />
        </>,
        portalEl
    );
}
