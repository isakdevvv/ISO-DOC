import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GapAnalysisPage from './page';
import { fetchIsoStandards, runGapAnalysis } from '@/lib/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock API
vi.mock('@/lib/api', () => ({
    fetchIsoStandards: vi.fn(),
    runGapAnalysis: vi.fn(),
}));

// Mock useParams
vi.mock('next/navigation', () => ({
    useParams: () => ({}),
}));

describe('GapAnalysisPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders and loads standards', async () => {
        const mockStandards = [{ id: 'iso-1', title: 'ISO 27001' }];
        (fetchIsoStandards as any).mockResolvedValue(mockStandards);

        render(<GapAnalysisPage />);

        await waitFor(() => {
            expect(screen.getByText('ISO 27001')).toBeDefined();
        });
    });

    it('runs gap analysis and displays results', async () => {
        const mockStandards = [{ id: 'iso-1', title: 'ISO 27001' }];
        const mockReport = {
            standardTitle: 'ISO 27001',
            gapAnalysis: [
                {
                    requiredDocument: { title: 'Security Policy', type: 'Policy', description: 'Desc' },
                    status: 'MISSING',
                    matchedDocument: null
                },
                {
                    requiredDocument: { title: 'Risk Assessment', type: 'Record', description: 'Desc' },
                    status: 'FULFILLED',
                    matchedDocument: { id: 'doc-1', title: 'My Risk Assessment' }
                }
            ]
        };

        (fetchIsoStandards as any).mockResolvedValue(mockStandards);
        (runGapAnalysis as any).mockResolvedValue(mockReport);

        render(<GapAnalysisPage />);

        await waitFor(() => {
            expect(screen.getByText('Run Gap Analysis')).toBeDefined();
        });

        fireEvent.click(screen.getByText('Run Gap Analysis'));

        await waitFor(() => {
            expect(screen.getByText('Security Policy')).toBeDefined();
            expect(screen.getByText('MISSING')).toBeDefined();
            expect(screen.getByText('My Risk Assessment')).toBeDefined();
        });
    });
});
