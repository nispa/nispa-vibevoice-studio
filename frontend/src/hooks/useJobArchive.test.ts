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
        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ jobs: mockJobs })
        });

        const { result } = renderHook(() => useJobArchive());

        await act(async () => {
            await result.current.loadJobs();
        });

        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/jobs?limit=100');
        expect(result.current.jobs).toEqual(mockJobs);
    });

    it('deletes job if confirmed', async () => {
        (confirm as any).mockReturnValue(true);
        (fetch as any).mockResolvedValue({ ok: true, json: async () => ({ jobs: [] }) });

        const { result } = renderHook(() => useJobArchive());

        await act(async () => {
            await result.current.deleteJob(1);
        });

        expect(confirm).toHaveBeenCalled();
        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/jobs/1', { method: 'DELETE' });
    });

    it('does not delete job if not confirmed', async () => {
        (confirm as any).mockReturnValue(false);

        const { result } = renderHook(() => useJobArchive());

        await act(async () => {
            await result.current.deleteJob(1);
        });

        expect(confirm).toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });
});
