import { render, screen, waitFor } from '@testing-library/react';
import ComplianceReportPage from './page';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fetchComplianceReport } from '@/lib/api';

// Mock dependencies
vi.mock('@/lib/api', () => ({
    fetchComplianceReport: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useParams: () => ({ id: 'report-1' }),
}));

// Mock Link
vi.mock('next/link', () => {
    return {
        __esModule: true,
        default: ({ children, href }: { children: React.ReactNode; href: string }) => (
            <a href={href}>{children}</a>
        ),
    };
});

describe('ComplianceReportPage', () => {
    const mockReport = {
        id: 'report-1',
        overallScore: 85,
        status: 'COMPLETED',
        createdAt: '2023-01-01T00:00:00Z',
        document: { title: 'Test Doc' },
        isoStandard: { title: 'ISO 27001' },
        results: [
            {
                id: 'res-1',
                requirement: 'Requirement 1',
                status: 'COMPLIANT',
                reasoning: 'Good',
                evidence: 'Evidence 1',
                clauseNumber: '1.1',
            },
            {
                id: 'res-2',
                requirement: 'Requirement 2',
                status: 'NON_COMPLIANT',
                reasoning: 'Bad',
                evidence: null,
                clauseNumber: '1.2',
            },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', () => {
        (fetchComplianceReport as any).mockReturnValue(new Promise(() => { }));
        render(<ComplianceReportPage />);
        expect(screen.getByText('Loading report...')).toBeDefined();
    });

    it('renders report data successfully', async () => {
        (fetchComplianceReport as any).mockResolvedValue(mockReport);
        render(<ComplianceReportPage />);

        await waitFor(() => {
            expect(screen.getByText('Compliance Report')).toBeDefined();
        });

        expect(screen.getByText('Test Doc')).toBeDefined();
        expect(screen.getByText('ISO 27001')).toBeDefined();
        expect(screen.getByText('85%')).toBeDefined();
        expect(screen.getByText('COMPLIANT')).toBeDefined();
        expect(screen.getByText('NON_COMPLIANT')).toBeDefined();
        expect(screen.getByText('"Evidence 1"')).toBeDefined();
    });

    it('renders error state on failure', async () => {
        (fetchComplianceReport as any).mockRejectedValue(new Error('Failed'));
        render(<ComplianceReportPage />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load report')).toBeDefined();
        });
    });
});
