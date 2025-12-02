import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from './page';
import { fetchDocuments, uploadDocuments, commitDocuments, deleteDocument, fetchIsoStandards, runComplianceCheck, fetchDashboardStats, searchDocuments, fetchNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the API module
vi.mock('@/lib/api', () => ({
    fetchDocuments: vi.fn(),
    uploadDocuments: vi.fn(),
    commitDocuments: vi.fn(),
    deleteDocument: vi.fn(),
    fetchIsoStandards: vi.fn(),
    runComplianceCheck: vi.fn(),
    fetchDashboardStats: vi.fn(),
    searchDocuments: vi.fn(),
    fetchNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
}));

// Mock useRouter and usePathname
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
    usePathname: () => '/app/dashboard',
}));

describe('Dashboard Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders documents and standards', async () => {
        const mockDocuments = [
            { id: '1', title: 'Doc 1', status: 'PENDING', createdAt: '2023-01-01' },
        ];
        const mockStandards = [
            { id: 'iso-1', title: 'ISO 27001', standardId: 'ISO 27001:2022' },
        ];

        (fetchDocuments as any).mockResolvedValue(mockDocuments);
        (fetchIsoStandards as any).mockResolvedValue(mockStandards);

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Doc 1')).toBeDefined();
        });

        expect(fetchDocuments).toHaveBeenCalled();
        expect(fetchIsoStandards).toHaveBeenCalled();
    });

    it('renders dashboard widgets', async () => {
        const mockStats = {
            totalDocuments: 10,
            analyzedDocuments: 5,
            averageComplianceScore: 85,
            recentActivity: [
                { id: '1', title: 'Doc 1', status: 'ANALYZED', updatedAt: '2023-01-01' }
            ]
        };

        (fetchDocuments as any).mockResolvedValue([]);
        (fetchIsoStandards as any).mockResolvedValue([]);
        (fetchDashboardStats as any).mockResolvedValue(mockStats);

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('85%')).toBeDefined();
            expect(screen.getByText('Total Documents')).toBeDefined();
            expect(screen.getByText('Recent Activity')).toBeDefined();
        });
    });

    it('opens analysis modal and runs check', async () => {
        const mockDocuments = [
            { id: '1', title: 'Doc 1', status: 'PENDING', createdAt: '2023-01-01' },
        ];
        const mockStandards = [
            { id: 'iso-1', title: 'ISO 27001', standardId: 'ISO 27001:2022' },
        ];

        (fetchDocuments as any).mockResolvedValue(mockDocuments);
        (fetchIsoStandards as any).mockResolvedValue(mockStandards);
        (runComplianceCheck as any).mockResolvedValue({ id: 'report-1' });

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByTitle('Analyze')).toBeDefined();
        });

        // Click Analyze
        fireEvent.click(screen.getByTitle('Analyze'));

        // Check modal
        expect(screen.getByText('Run Compliance Analysis')).toBeDefined();
        expect(screen.getByText('ISO 27001 (ISO 27001:2022)')).toBeDefined();

        // Click Run
        fireEvent.click(screen.getByText('Run Analysis'));

        await waitFor(() => {
            expect(runComplianceCheck).toHaveBeenCalledWith('1', 'iso-1');
            expect(mockPush).toHaveBeenCalledWith('/app/reports/report-1');
        });
    });

    it('shows staged documents and allows approval', async () => {
        const mockDocuments = [
            { id: '1', title: 'Doc 1', status: 'STAGED', createdAt: '2023-01-01' },
        ];
        (fetchDocuments as any).mockResolvedValue(mockDocuments);
        (fetchIsoStandards as any).mockResolvedValue([]);
        (fetchDashboardStats as any).mockResolvedValue({ recentActivity: [] });

        render(<Dashboard />);

        expect(fetchDocuments).toHaveBeenCalled();
        expect(await screen.findByText('Review Uploads', {}, { timeout: 3000 })).toBeDefined();
        expect(screen.getByText('Doc 1')).toBeDefined();
        expect(screen.getByText('Ready for Approval')).toBeDefined();

        // Click Approve
        fireEvent.click(screen.getByText('Approve All'));

        await waitFor(() => {
            expect(commitDocuments).toHaveBeenCalledWith(['1']);
        });
    });

    it('allows rejecting staged documents', async () => {
        const mockDocuments = [
            { id: '1', title: 'Doc 1', status: 'STAGED', createdAt: '2023-01-01' },
        ];
        (fetchDocuments as any).mockResolvedValue(mockDocuments);
        (fetchIsoStandards as any).mockResolvedValue([]);
        (fetchDashboardStats as any).mockResolvedValue({ recentActivity: [] });

        // Mock confirm
        window.confirm = vi.fn(() => true);

        render(<Dashboard />);

        expect(await screen.findByText('Review Uploads', {}, { timeout: 3000 })).toBeDefined();

        // Click Reject
        fireEvent.click(screen.getByTitle('Reject / Delete'));

        await waitFor(() => {
            expect(deleteDocument).toHaveBeenCalledWith('1');
        });
    });

    it('shows notifications', async () => {
        const mockNotifications = [
            { id: '1', title: 'Analysis Complete', message: 'Doc 1 analyzed', type: 'SUCCESS', read: false, createdAt: '2023-01-01' }
        ];
        (fetchDocuments as any).mockResolvedValue([]);
        (fetchIsoStandards as any).mockResolvedValue([]);
        (fetchDashboardStats as any).mockResolvedValue({});
        (fetchNotifications as any).mockResolvedValue(mockNotifications);

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('1')).toBeDefined(); // Unread count badge
        });

        // Click Bell
        fireEvent.click(screen.getByText('🔔'));

        expect(screen.getByText('Analysis Complete')).toBeDefined();
        expect(screen.getByText('Doc 1 analyzed')).toBeDefined();
    });

    it('shows upload progress', async () => {
        (fetchDocuments as any).mockResolvedValue([]);
        (fetchIsoStandards as any).mockResolvedValue([]);
        (fetchDashboardStats as any).mockResolvedValue({});
        (fetchNotifications as any).mockResolvedValue([]);
        (uploadDocuments as any).mockResolvedValue({ batchId: 'batch-1', documents: [] });

        // Mock fetchBatchProgress
        const mockProgress = { total: 10, processed: 5, failed: 0, pending: 5 };
        (global.fetch as any) = vi.fn((url) => {
            if (url.includes('/progress')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockProgress)
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });

        render(<Dashboard />);

        // Trigger upload
        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        const input = screen.getByLabelText('Upload New') as HTMLInputElement;
        Object.defineProperty(input, 'files', { value: [file] });
        fireEvent.change(input);

        await waitFor(() => {
            expect(uploadDocuments).toHaveBeenCalled();
        });

        // Check for progress bar in Header (it listens to window event)
        // Note: We might need to wait for the poll interval or manually trigger the event if the component is isolated.
        // Since Header is rendered inside Dashboard, it should receive the event.

        await waitFor(() => {
            expect(screen.getByText('Uploading... 5 of 10')).toBeDefined();
            expect(screen.getByText('50%')).toBeDefined();
        });
    });
});


