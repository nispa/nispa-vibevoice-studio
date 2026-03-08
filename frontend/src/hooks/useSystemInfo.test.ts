import { renderHook, act } from '@testing-library/react';
import { useSystemInfo } from './useSystemInfo';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn());

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
        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockData
        });

        const { result } = renderHook(() => useSystemInfo());

        await act(async () => {
            await result.current.fetchSystemInfo();
        });

        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/system-info');
        expect(result.current.systemInfo).toEqual(mockData);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('handles fetch error', async () => {
        (fetch as any).mockResolvedValue({
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
