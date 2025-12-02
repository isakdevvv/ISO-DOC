import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CopilotKit } from '@copilotkit/react-core';
import DocumentsPage from './page';
import { fetchDocuments, uploadDocuments, fetchDashboardStats, fetchNotifications } from '@/lib/api';

vi.mock('@/lib/api', () => ({
    fetchDocuments: vi.fn(),
    uploadDocuments: vi.fn(),
    deleteDocument: vi.fn(),
    fetchDashboardStats: vi.fn(),
    fetchNotifications: vi.fn(),
    searchDocuments: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    fetchBatchProgress: vi.fn(),
}));

const mockRouter = { push: vi.fn(), replace: vi.fn() };

vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    useSearchParams: () => ({
        get: () => null,
    }),
    usePathname: () => '/app/documents',
}));

describe('Documents Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithCopilotKit = (component: React.ReactElement) => {
        return render(<CopilotKit runtimeUrl="/api/copilot">{component}</CopilotKit>);
    };

    it('renders the IDE based workspace with fetched documents', async () => {
        (fetchDocuments as any).mockResolvedValue([
            { id: '1', title: 'Doc 1', status: 'ANALYZED', createdAt: '2023-01-01' },
            { id: '2', title: 'Doc 2', status: 'PENDING', createdAt: '2023-01-02' },
        ]);
        (fetchDashboardStats as any).mockResolvedValue({ recentActivity: [] });
        (fetchNotifications as any).mockResolvedValue([]);

        renderWithCopilotKit(<DocumentsPage />);

        expect(await screen.findByText('Documents')).toBeDefined();
        expect(fetchDocuments).toHaveBeenCalled();

        // Expand All Documents group to reveal files
        const groupToggle = await screen.findByText('All Documents');
        fireEvent.click(groupToggle);

        await waitFor(() => {
            expect(screen.getByText(/Doc 1/)).toBeDefined();
            expect(screen.getByText(/Doc 2/)).toBeDefined();
        });
    });

    it('allows uploading new files from the toolbar', async () => {
        (fetchDocuments as any).mockResolvedValue([]);
        (fetchDashboardStats as any).mockResolvedValue({ recentActivity: [] });
        (fetchNotifications as any).mockResolvedValue([]);
        (uploadDocuments as any).mockResolvedValue({ batchId: 'batch-1', documents: [] });

        renderWithCopilotKit(<DocumentsPage />);

        const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
        const input = screen.getByLabelText('Upload Documents') as HTMLInputElement;
        Object.defineProperty(input, 'files', { value: [file] });
        fireEvent.change(input);

        await waitFor(() => {
            expect(uploadDocuments).toHaveBeenCalled();
        });
    });
});
