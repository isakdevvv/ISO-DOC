import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Dashboard from './page';
import {
    fetchNodes,
    fetchRuleSets,
    runRuleEngine,
    fetchLatestRequirements,
    fetchRuleConflicts,
    fetchTemplates,
    deleteTemplate,
    createTemplate,
    updateTemplate,
    fetchProjects,
    fetchTasks,
} from '@/lib/api';
import { CopilotKit } from '@copilotkit/react-core';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSearchParams = {
    get: vi.fn(() => null),
};

vi.mock('@/lib/api', () => ({
    fetchNodes: vi.fn(),
    fetchRuleSets: vi.fn(),
    runRuleEngine: vi.fn(),
    fetchLatestRequirements: vi.fn(),
    fetchRuleConflicts: vi.fn(),
    fetchTemplates: vi.fn(),
    deleteTemplate: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    fetchProjects: vi.fn(),
    fetchTasks: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
    usePathname: () => '/app/dashboard',
    useSearchParams: () => mockSearchParams,
}));

describe('Dashboard Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSearchParams.get.mockReturnValue(null);
        vi.spyOn(window, 'alert').mockImplementation(() => undefined);
        (fetchNodes as any).mockResolvedValue([]);
        (fetchTasks as any).mockResolvedValue([]);
        (fetchProjects as any).mockResolvedValue([{
            id: 'project-123',
            name: 'Demo Project',
            tenantId: 'tenant-1',
            tasks: [],
            nodes: [],
            documents: [],
            createdAt: '',
            updatedAt: '',
        }]);
        (fetchTemplates as any).mockResolvedValue([]);
    });

    afterEach(() => {
        (window.alert as any).mockRestore?.();
    });

    const renderWithCopilot = () => render(
        <CopilotKit runtimeUrl="/api/copilot">
            <Dashboard />
        </CopilotKit>
    );

    it('renders compliance audit inputs with fetched documents and standards', async () => {
        mockSearchParams.get.mockReturnValue('compliance');
        const mockRequirements: any = {
            id: 'req-1',
            projectId: 'project-123',
            scope: 'FULL',
            version: 1,
            payload: {
                requiredDocuments: [{ code: 'FDV', title: 'FDV Manual', severity: 'HIGH' }],
                requiredFields: [{ path: 'fdv.title', description: 'Document title' }],
            },
            warnings: [{ message: 'Missing PS data' }],
            createdAt: new Date().toISOString(),
        };
        (fetchNodes as any).mockResolvedValue([
            { id: '1', title: 'FDV', status: 'PENDING_REVIEW', type: 'FDV', tenantId: '', projectId: '', createdAt: '', updatedAt: '' },
        ]);
        (fetchRuleSets as any).mockResolvedValue([
            { id: 'rs-1', title: 'ISO 27001', code: 'ISO27001', version: '1.0', description: '', scope: 'GLOBAL', isActive: true },
        ]);
        (fetchLatestRequirements as any).mockResolvedValue(mockRequirements);
        (fetchRuleConflicts as any).mockResolvedValue([]);

        renderWithCopilot();

        expect(await screen.findByText('Gap & Requirements Summary')).toBeDefined();
        expect(screen.getByText('FDV Manual')).toBeDefined();
    });

    it('runs compliance audit when button is clicked', async () => {
        mockSearchParams.get.mockReturnValue('compliance');
        (fetchNodes as any).mockResolvedValue([]);
        (fetchRuleSets as any).mockResolvedValue([
            { id: 'rs-1', title: 'ISO 27001', code: 'ISO27001', version: '1.0', description: '', scope: 'GLOBAL', isActive: true },
        ]);
        (fetchLatestRequirements as any).mockResolvedValue(null);
        (fetchRuleConflicts as any).mockResolvedValue([]);
        (runRuleEngine as any).mockResolvedValue({ evaluationId: 'eval-1' });
        vi.spyOn(window, 'alert').mockImplementation(() => undefined);

        renderWithCopilot();

        const runButton = await screen.findByText('Run Compliance Audit');
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(runRuleEngine).toHaveBeenCalledWith('project-123', { ruleSetIds: ['rs-1'] });
        });
    });

    it('falls back to compliance workspace when gap-analysis tab is requested', async () => {
        mockSearchParams.get.mockReturnValue('gap-analysis');
        (fetchNodes as any).mockResolvedValue([]);
        (fetchRuleSets as any).mockResolvedValue([]);
        (fetchLatestRequirements as any).mockResolvedValue(null);
        (fetchRuleConflicts as any).mockResolvedValue([]);

        renderWithCopilot();

        expect(await screen.findByText('Compliance Workspace')).toBeDefined();
    });

    it('respects the templates tab query parameter', async () => {
        mockSearchParams.get.mockReturnValue('templates');
        (fetchNodes as any).mockResolvedValue([]);
        (fetchRuleSets as any).mockResolvedValue([]);
        (fetchLatestRequirements as any).mockResolvedValue(null);
        (fetchRuleConflicts as any).mockResolvedValue([]);
        (fetchTemplates as any).mockResolvedValue([]);

        renderWithCopilot();

        expect(await screen.findByText('Loading templates...')).toBeDefined();
    });

    it('shows notification dropdown when the bell icon is clicked', async () => {
        (fetchNodes as any).mockResolvedValue([]);
        (fetchRuleSets as any).mockResolvedValue([]);
        (fetchLatestRequirements as any).mockResolvedValue(null);
        (fetchRuleConflicts as any).mockResolvedValue([]);

        renderWithCopilot();

        expect(await screen.findByText('Admin Control Tower')).toBeDefined();
        fireEvent.click(screen.getByRole('button', { name: /🔔/ }));

        expect(screen.getByText('No notifications')).toBeDefined();
    });

    it('displays upload progress when a batch upload starts', async () => {
        (fetchNodes as any).mockResolvedValue([]);
        (fetchRuleSets as any).mockResolvedValue([]);
        (fetchLatestRequirements as any).mockResolvedValue(null);
        (fetchRuleConflicts as any).mockResolvedValue([]);

        renderWithCopilot();

        act(() => {
            window.dispatchEvent(new CustomEvent('batch-upload-start', { detail: 'batch-1' }));
        });

        await waitFor(() => {
            expect(screen.getByText(/Uploading\.\.\. \d+ of \d+/)).toBeDefined();
            expect(screen.getByText(/\d+%/)).toBeDefined();
        });
    });
});
