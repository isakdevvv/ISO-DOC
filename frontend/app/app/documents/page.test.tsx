import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DocumentsPage from './page';
import { fetchDocuments, uploadDocuments, deleteDocument, fetchNotifications } from '@/lib/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CopilotKit } from "@copilotkit/react-core"; // Import CopilotKit

// Mock the API module
vi.mock('@/lib/api', () => ({
    fetchDocuments: vi.fn(),
    uploadDocuments: vi.fn(),
    deleteDocument: vi.fn(),
    fetchNotifications: vi.fn(),
    searchDocuments: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
}));

// Mock useRouter and usePathname
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/app/documents',
}));

describe('Documents Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithCopilotKit = (component: React.ReactElement) => {
        return render(<CopilotKit url="http://localhost:3000/api/copilot">{component}</CopilotKit>);
    };

    it('renders document list', async () => {
        const mockDocuments = [
            { id: '1', title: 'Doc 1', status: 'ANALYZED', createdAt: '2023-01-01' },
            { id: '2', title: 'Doc 2', status: 'PENDING', createdAt: '2023-01-02' },
        ];

        (fetchDocuments as any).mockResolvedValue(mockDocuments);
        (fetchNotifications as any).mockResolvedValue([]);

        renderWithCopilotKit(<DocumentsPage />);

        await waitFor(() => {
            expect(screen.getByText('Doc 1')).toBeDefined();
            expect(screen.getByText('Doc 2')).toBeDefined();
        });

        expect(fetchDocuments).toHaveBeenCalled();
    });

    it('handles file upload', async () => {
        (fetchDocuments as any).mockResolvedValue([]);
        (fetchNotifications as any).mockResolvedValue([]);
        (uploadDocuments as any).mockResolvedValue({ batchId: 'batch-1', documents: [] });

        renderWithCopilotKit(<DocumentsPage />);

        const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
        const input = screen.getByLabelText('Upload New') as HTMLInputElement;
        
        Object.defineProperty(input, 'files', { value: [file] });
        fireEvent.change(input);

        await waitFor(() => {
            expect(uploadDocuments).toHaveBeenCalled();
        });
    });

    it('allows deleting a document', async () => {
        const mockDocuments = [
            { id: '1', title: 'Doc 1', status: 'ANALYZED', createdAt: '2023-01-01' },
        ];
        (fetchDocuments as any).mockResolvedValue(mockDocuments);
        (fetchNotifications as any).mockResolvedValue([]);
        
        // Mock confirm
        window.confirm = vi.fn(() => true);

        renderWithCopilotKit(<DocumentsPage />);

        await waitFor(() => {
            expect(screen.getByText('Doc 1')).toBeDefined();
        });

        const deleteBtn = screen.getByText('Delete');
        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(deleteDocument).toHaveBeenCalledWith('1');
            expect(fetchDocuments).toHaveBeenCalledTimes(2); // Initial + After delete
        });
    });

    it('shows staged documents separately', async () => {
        const mockDocuments = [
            { id: '1', title: 'Active Doc', status: 'ANALYZED', createdAt: '2023-01-01' },
            { id: '2', title: 'Staged Doc', status: 'STAGED', createdAt: '2023-01-02' },
        ];
        (fetchDocuments as any).mockResolvedValue(mockDocuments);
        (fetchNotifications as any).mockResolvedValue([]);

        renderWithCopilotKit(<DocumentsPage />);

        await waitFor(() => {
            expect(screen.getByText('Active Doc')).toBeDefined();
            expect(screen.getByText('Staged Doc')).toBeDefined();
        });

        // Check that Staged Doc is in the "Processing Uploads" section
        expect(screen.getByText('Processing Uploads')).toBeDefined();
        expect(screen.getByText('Pending Review (See Dashboard)')).toBeDefined();
    });
});
