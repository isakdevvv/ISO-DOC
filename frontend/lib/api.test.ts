import { fetchDocuments, uploadDocument, runRuleEngine } from './api';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSession, signOut } from 'next-auth/react';

vi.mock('next-auth/react', () => ({
    getSession: vi.fn().mockResolvedValue({ accessToken: 'test-token' }),
    signOut: vi.fn().mockResolvedValue(undefined),
}));

const mockGetSession = getSession as unknown as ReturnType<typeof vi.fn>;
const mockSignOut = signOut as unknown as ReturnType<typeof vi.fn>;

describe('API Client', () => {
    beforeEach(() => {
        mockGetSession.mockResolvedValue({ accessToken: 'test-token' });
        mockSignOut.mockResolvedValue(undefined);
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('fetchDocuments', () => {
        it('should fetch documents successfully', async () => {
            const mockDocs = [{ id: '1', title: 'Test Doc' }];
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockDocs,
            });

            const docs = await fetchDocuments();
            expect(docs).toEqual(mockDocs);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/documents'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer test-token',
                    }),
                })
            );
        });

        it('should throw error on failure', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
            });

            await expect(fetchDocuments()).rejects.toThrow('Failed to fetch documents');
        });
    });

    describe('uploadDocument', () => {
        it('should upload document successfully', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => ({ batchId: 'batch-1', documents: [] }),
            });

            const file = new File(['content'], 'test.txt', { type: 'text/plain' });
            await uploadDocument(file);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/documents'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(FormData),
                })
            );
        });

        it('should throw error on upload failure', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
            });

            const file = new File(['content'], 'test.txt', { type: 'text/plain' });
            await expect(uploadDocument(file)).rejects.toThrow('Failed to upload document');
        });
    });

    describe('runRuleEngine', () => {
        it('should trigger backend rule engine run', async () => {
            const mockResponse = { evaluationId: 'eval-1' };
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });

            const payload = { scope: 'FULL', facts: { medium: 'CO2' } };
            const response = await runRuleEngine('project-123', payload);

            expect(response).toEqual(mockResponse);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/rule-engine/projects/project-123/run'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer test-token',
                    }),
                })
            );
        });

        it('should throw on failed run', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
            });

            await expect(runRuleEngine('project-123')).rejects.toThrow('Failed to run rule engine');
        });
    });
});
