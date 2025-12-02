import { fetchDocuments, uploadDocument } from './api';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('API Client', () => {
    beforeEach(() => {
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
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/documents'));
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
});
