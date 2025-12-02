import React from 'react';

interface DocumentPreviewProps {
    url: string;
    title: string;
}

export default function DocumentPreview({ url, title }: DocumentPreviewProps) {
    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-medium text-gray-700 truncate" title={title}>{title}</h3>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                >
                    Open in new tab
                </a>
            </div>
            <div className="flex-1 bg-gray-100 relative">
                <iframe
                    src={url}
                    className="absolute inset-0 w-full h-full"
                    title={`Preview of ${title}`}
                />
            </div>
        </div>
    );
}
