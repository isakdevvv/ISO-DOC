import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DocumentView from './page';
import { fetchDocument, exportDocument, fetchIsoStandards, runComplianceCheck } from '@/lib/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the API module
vi.mock('@/lib/api', () => ({
    fetchDocument: vi.fn(),
    exportDocument: vi.fn(),
    fetchIsoStandards: vi.fn(),
    runComplianceCheck: vi.fn(),
}));

// Mock useParams
vi.mock('next/navigation', () => ({
    useParams: () => ({ id: 'doc-1' }),
}));

describe('DocumentView Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders document details and download button', async () => {
        const mockDocument = {
            id: 'doc-1',
            title: 'Test Document',
            status: 'ANALYZED',
            createdAt: '2023-01-01T00:00:00Z',
        };

        (fetchDocument as any).mockResolvedValue(mockDocument);
        (fetchIsoStandards as any).mockResolvedValue([]);

        render(<DocumentView />);

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Test Document', level: 1 })).toBeDefined();
        });

        expect(screen.getByText('ANALYZED')).toBeDefined();
        expect(screen.getByText('⬇️ Download JSON')).toBeDefined();
        expect(screen.getByTitle('Test Document')).toBeDefined(); // Preview title
    });

    it('triggers export on button click', async () => {
        const mockDocument = {
            id: 'doc-1',
            title: 'Test Document',
            status: 'ANALYZED',
            createdAt: '2023-01-01T00:00:00Z',
        };

        (fetchDocument as any).mockResolvedValue(mockDocument);
        (fetchIsoStandards as any).mockResolvedValue([]);

        render(<DocumentView />);

        await waitFor(() => {
            expect(screen.getByText('⬇️ Download JSON')).toBeDefined();
        });

        fireEvent.click(screen.getByText('⬇️ Download JSON'));

        expect(exportDocument).toHaveBeenCalledWith('doc-1');
    });
});
