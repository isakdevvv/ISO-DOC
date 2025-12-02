'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface IsoStandard {
    id: string;
    title: string;
    standardId: string;
    status: string;
    createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function IsoStandardsPage() {
    const [standards, setStandards] = useState<IsoStandard[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    useEffect(() => {
        fetchStandards();
    }, []);

    const fetchStandards = async () => {
        try {
            const res = await fetch(`${API_URL}/iso-standards`);
            if (res.ok) {
                const data = await res.json();
                setStandards(data);
            }
        } catch (error) {
            console.error('Failed to fetch standards', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('file', file);
        // For now, just use the filename as the standard ID or ask user. 
        // Let's assume the user names the file "ISO 27001.pdf"
        formData.append('standardId', file.name.replace(/\.[^/.]+$/, ""));

        try {
            const res = await fetch(`${API_URL}/iso-standards/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');

            await fetchStandards();
        } catch (error) {
            setUploadError('Failed to upload standard');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">ISO Standards</h1>
                <div className="relative">
                    <input
                        type="file"
                        id="upload-standard"
                        className="hidden"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />
                    <label
                        htmlFor="upload-standard"
                        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload Standard
                    </label>
                </div>
            </div>

            {uploadError && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {uploadError}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {standards.map((std) => (
                    <div key={std.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${std.status === 'ANALYZED' ? 'bg-green-100 text-green-700' :
                                    std.status === 'ERROR' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                }`}>
                                {std.status}
                            </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">{std.title}</h3>
                        <p className="text-sm text-gray-500 mb-4">ID: {std.standardId}</p>
                        <div className="text-xs text-gray-400">
                            Uploaded {new Date(std.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>

            {standards.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No standards uploaded yet. Upload one to get started.
                </div>
            )}
        </div>
    );
}
