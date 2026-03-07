import { renderHook, act } from '@testing-library/react';
import { useSystemInfo } from './useSystemInfo';

// Mock fetch globally
global.fetch = vi.fn();

describe('useSystemInfo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with default state', () => {
        const { result } = renderHook(() => useSystemInfo());
        expect(result.current.systemInfo).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('fetches system info successfully', async () => {
        const mockData = { system: { platform: 'win32' } };
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockData
        });

        const { result } = renderHook(() => useSystemInfo());

        await act(async () => {
            await result.current.fetchSystemInfo();
        });

        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/system-info');
        expect(result.current.systemInfo).toEqual(mockData);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('handles fetch error', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false
        });

        const { result } = renderHook(() => useSystemInfo());

        await act(async () => {
            await result.current.fetchSystemInfo();
        });

        expect(result.current.error).toBe('Failed to fetch system info');
        expect(result.current.isLoading).toBe(false);
    });
});
