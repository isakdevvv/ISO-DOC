import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopilotKit } from '@copilotkit/react-core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GapAnalysisPage from './page';
import {
    fetchNodes,
    fetchRuleSets,
    fetchLatestRequirements,
    fetchRuleConflicts,
    runRuleEngine,
} from '@/lib/api';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('@/lib/api', () => ({
    fetchNodes: vi.fn(),
    fetchRuleSets: vi.fn(),
    fetchLatestRequirements: vi.fn(),
    fetchRuleConflicts: vi.fn(),
    runRuleEngine: vi.fn(),
    searchDocuments: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

describe('GapAnalysisPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    });

    afterEach(() => {
        (window.alert as any).mockRestore?.();
    });

    const renderWithCopilot = () => render(
        <CopilotKit runtimeUrl="/api/copilot">
            <GapAnalysisPage />
        </CopilotKit>
    );

    it('renders the unified compliance workspace', async () => {
        (fetchNodes as any).mockResolvedValue([
            { id: 'node-1', title: 'Access Control Policy', status: 'PENDING_REVIEW', type: 'POLICY', tenantId: '', projectId: '', createdAt: '', updatedAt: '' },
        ]);
        (fetchRuleSets as any).mockResolvedValue([
            { id: 'rs-1', title: 'ISO 27001', code: 'ISO27001', version: '1.0', description: '', scope: 'GLOBAL', isActive: true },
        ]);
        (fetchLatestRequirements as any).mockResolvedValue({
            id: 'req-1',
            projectId: 'default-project-id',
            scope: 'FULL',
            version: 1,
            payload: {
                requiredDocuments: [{ code: 'POL-1', title: 'Access Control Policy', severity: 'HIGH' }],
                requiredFields: [{ path: 'policy.owner', description: 'Owner of policy' }],
            },
            warnings: [],
            createdAt: new Date().toISOString(),
        });
        (fetchRuleConflicts as any).mockResolvedValue([]);

        renderWithCopilot();

        expect(await screen.findByText('Compliance Workspace')).toBeDefined();
        expect(screen.getByText('Gap & Requirements Summary')).toBeDefined();
        expect(screen.getAllByText('Access Control Policy').length).toBeGreaterThan(0);
    });

    it('runs the compliance audit flow from the workspace', async () => {
        (fetchNodes as any).mockResolvedValue([]);
        (fetchRuleSets as any).mockResolvedValue([
            { id: 'rs-1', title: 'ISO 27001', code: 'ISO27001', version: '1.0', description: '', scope: 'GLOBAL', isActive: true },
        ]);
        (fetchLatestRequirements as any).mockResolvedValue(null);
        (fetchRuleConflicts as any).mockResolvedValue([]);
        (runRuleEngine as any).mockResolvedValue({ evaluationId: 'eval-1' });

        renderWithCopilot();

        const button = await screen.findByText('Run Compliance Audit');
        fireEvent.click(button);

        await waitFor(() => {
            expect(runRuleEngine).toHaveBeenCalledWith('default-project-id', { ruleSetIds: ['rs-1'] });
        });
    });
});
