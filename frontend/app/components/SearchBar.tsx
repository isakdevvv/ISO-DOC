import React, { useState, useEffect } from 'react';
import { searchDocuments } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any>(null);
    const [searching, setSearching] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query.trim()) {
                performSearch(query);
            } else {
                setResults(null);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    async function performSearch(searchQuery: string) {
        setSearching(true);
        try {
            const data = await searchDocuments(searchQuery);
            setResults(data);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
    }

    return (
        <div className="relative w-full max-w-xl">
            <form onSubmit={handleSearch} className="relative">
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search documents (e.g. 'password policy')..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">🔍</span>
                </div>
                <button
                    type="submit"
                    className="absolute inset-y-0 right-0 px-4 text-white bg-blue-600 rounded-r-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={searching}
                >
                    {searching ? '...' : 'Search'}
                </button>
            </form>

            {/* Results Dropdown */}
            {results && (results.vectorResults.length > 0 || results.keywordResults.length > 0) && (
                <div className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
                    {results.vectorResults.length > 0 && (
                        <div className="p-2">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-1">Semantic Matches</h3>
                            {results.vectorResults.map((res: any, idx: number) => (
                                <a
                                    key={`vec-${idx}`}
                                    href={`/app/documents/${res.documentId}`}
                                    className="block px-2 py-2 hover:bg-gray-50 rounded"
                                >
                                    <div className="font-medium text-sm text-blue-600">{res.title}</div>
                                    <div className="text-xs text-gray-500 truncate">{res.content.substring(0, 100)}...</div>
                                    <div className="text-xs text-green-600 mt-1">{(res.similarity * 100).toFixed(0)}% relevant</div>
                                </a>
                            ))}
                        </div>
                    )}

                    {results.keywordResults.length > 0 && (
                        <div className="p-2 border-t">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-1">Keyword Matches</h3>
                            {results.keywordResults.map((res: any, idx: number) => (
                                <a
                                    key={`key-${idx}`}
                                    href={`/app/documents/${res.documentId}`}
                                    className="block px-2 py-2 hover:bg-gray-50 rounded"
                                >
                                    <div className="font-medium text-sm text-gray-900">{res.document.title}</div>
                                    <div className="text-xs text-gray-500 truncate">{res.content.substring(0, 100)}...</div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
