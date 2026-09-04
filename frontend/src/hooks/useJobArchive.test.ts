import { renderHook, act } from '@testing-library/react';
import { useJobArchive } from './useJobArchive';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.stubGlobal('fetch', vi.fn());
vi.stubGlobal('confirm', vi.fn());

describe('useJobArchive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with empty jobs', () => {
        const { result } = renderHook(() => useJobArchive());
        expect(result.current.jobs).toEqual([]);
        expect(result.current.loading).toBe(false);
    });

    it('fetches jobs', async () => {
        const mockJobs = [{ id: 1, original_filename: 'test.wav' }];
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ jobs: mockJobs })
        } as Response);

        const { result } = renderHook(() => useJobArchive());

        await act(async () => {
            await result.current.loadJobs();
        });

        expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/jobs?limit=100&workflow_type=subtitle', undefined);
        expect(result.current.jobs).toEqual(mockJobs);
    });

    it('fetches script jobs when workflow_type is script', async () => {
        const mockJobs = [{ id: 2, original_filename: 'dialogue.txt', workflow_type: 'script' }];
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ jobs: mockJobs })
        } as Response);

        const { result } = renderHook(() => useJobArchive('script'));

        await act(async () => {
            await result.current.loadJobs();
        });

        expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/jobs?limit=100&workflow_type=script', undefined);
        expect(result.current.jobs).toEqual(mockJobs);
    });

    it('deletes job if confirmed', async () => {
        vi.mocked(confirm).mockReturnValue(true);
        vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ jobs: [] }) } as Response);

        const { result } = renderHook(() => useJobArchive());

        await act(async () => {
            await result.current.deleteJob(1);
        });

        expect(confirm).toHaveBeenCalled();
        expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/jobs/1', { method: 'DELETE' });
        // Note: loadJobs is called after delete, so fetch is called twice
    });

    it('does not delete job if not confirmed', async () => {
        vi.mocked(confirm).mockReturnValue(false);

        const { result } = renderHook(() => useJobArchive());

        await act(async () => {
            await result.current.deleteJob(1);
        });

        expect(confirm).toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });
});
