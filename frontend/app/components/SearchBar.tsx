import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Modal,
    ModalContent,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { FileText, Folder, Layers } from 'lucide-react';
import { searchDocuments, fetchProjects, fetchTemplates, Project, Template } from '@/lib/api';

export default function SearchBar() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [documentResults, setDocumentResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [projs, temps] = await Promise.all([
                    fetchProjects(),
                    fetchTemplates()
                ]);
                setProjects(projs);
                setTemplates(temps);
            } catch (e) {
                console.error("Failed to load initial search data", e);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (!query) {
            setDocumentResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setLoading(true);
            try {
                const results = await searchDocuments(query);
                const combined = [...results.vectorResults, ...results.keywordResults];
                // Deduplicate by documentId
                const unique = combined.filter((v, i, a) => a.findIndex(t => (t.documentId === v.documentId) || (t.document?.id === v.document?.id)) === i);
                setDocumentResults(unique);
            } catch (e) {
                console.error("Search failed", e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    const filteredTemplates = templates.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));

    return (
        <>
            <Button
                variant="outline"
                className="relative h-9 w-full justify-start rounded-[0.5rem] text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
                onClick={() => setOpen(true)}
            >
                <span className="hidden lg:inline-flex">Search...</span>
                <span className="inline-flex lg:hidden">Search...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
            <Modal open={open} onOpenChange={setOpen}>
                <ModalContent className="p-0 overflow-hidden max-w-[600px]">
                    <Command shouldFilter={false} className="h-full">
                        <CommandInput placeholder="Type to search..." value={query} onValueChange={setQuery} />
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>

                            {filteredProjects.length > 0 && (
                                <CommandGroup heading="Projects">
                                    {filteredProjects.map((project) => (
                                        <CommandItem
                                            key={project.id}
                                            value={project.name}
                                            onSelect={() => runCommand(() => router.push(`/app/projects/${project.id}`))}
                                        >
                                            <Folder className="mr-2 h-4 w-4" />
                                            <span>{project.name}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {filteredTemplates.length > 0 && (
                                <CommandGroup heading="Templates">
                                    {filteredTemplates.map((template) => (
                                        <CommandItem
                                            key={template.id}
                                            value={template.title}
                                            onSelect={() => runCommand(() => router.push(`/app/templates/${template.id}`))}
                                        >
                                            <Layers className="mr-2 h-4 w-4" />
                                            <span>{template.title}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {documentResults.length > 0 && (
                                <CommandGroup heading="Documents">
                                    {documentResults.map((doc, idx) => (
                                        <CommandItem
                                            key={doc.documentId || idx}
                                            value={doc.title || doc.document?.title || "Untitled"}
                                            onSelect={() => runCommand(() => router.push(`/app/documents/${doc.documentId}`))}
                                        >
                                            <FileText className="mr-2 h-4 w-4" />
                                            <div className="flex flex-col">
                                                <span>{doc.title || doc.document?.title}</span>
                                                {doc.content && (
                                                    <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                        {doc.content.substring(0, 50)}...
                                                    </span>
                                                )}
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </ModalContent>
            </Modal>
        </>
    );
}
