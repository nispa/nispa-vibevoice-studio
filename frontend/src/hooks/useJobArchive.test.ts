import { renderHook, act } from '@testing-library/react';
import { useJobArchive } from './useJobArchive';

global.fetch = vi.fn();
global.confirm = vi.fn();

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
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ jobs: mockJobs })
        });

        const { result } = renderHook(() => useJobArchive());

        await act(async () => {
            await result.current.loadJobs();
        });

        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/jobs?limit=100');
        expect(result.current.jobs).toEqual(mockJobs);
    });

    it('deletes job if confirmed', async () => {
        (global.confirm as any).mockReturnValue(true);
        (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ jobs: [] }) });

        const { result } = renderHook(() => useJobArchive());

        await act(async () => {
            await result.current.deleteJob(1);
        });

        expect(global.confirm).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/jobs/1', { method: 'DELETE' });
    });

    it('does not delete job if not confirmed', async () => {
        (global.confirm as any).mockReturnValue(false);

        const { result } = renderHook(() => useJobArchive());

        await act(async () => {
            await result.current.deleteJob(1);
        });

        expect(global.confirm).toHaveBeenCalled();
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
