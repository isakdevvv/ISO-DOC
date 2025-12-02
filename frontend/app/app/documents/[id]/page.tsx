'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import DocumentDetailView from '@/app/components/DocumentDetailView';

export default function DocumentPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    if (!id) return <div>Invalid ID</div>;

    return (
        <DocumentDetailView
            documentId={id}
            onBack={() => router.push('/app/dashboard?tab=documents')}
        />
    );
}
