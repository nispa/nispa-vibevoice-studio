import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GlobalProvider, useGlobalContext } from './GlobalContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the hook
vi.mock('../hooks/useSystemInfo', () => ({
    useSystemInfo: vi.fn(() => ({
        systemInfo: { system: { platform: 'test' } },
        isLoading: false,
        error: null,
        fetchSystemInfo: vi.fn(),
    }))
}));

const TestComponent = () => {
    const { appMode, setAppMode, isProcessing, setIsProcessing, connectionStatus, isLoadingSystemInfo, systemInfoError } = useGlobalContext();
    return (
        <div>
            <span data-testid="mode">{appMode}</span>
            <span data-testid="processing">{isProcessing.toString()}</span>
            <span data-testid="connection">{connectionStatus}</span>
            <span data-testid="loading">{isLoadingSystemInfo.toString()}</span>
            <span data-testid="error">{systemInfoError || 'null'}</span>
            <button onClick={() => setAppMode('script')}>Set Script</button>
            <button onClick={() => setIsProcessing(true)}>Set Processing</button>
        </div>
    );
};

describe('GlobalContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Global fetch mock to avoid real network calls
        vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ voices: [], models: [] }),
            })
        ));
    });

    it('provides default values and updates state', async () => {
        render(
            <GlobalProvider>
                <TestComponent />
            </GlobalProvider>
        );

        expect(screen.getByTestId('mode')).toHaveTextContent('subtitle');
        
        act(() => {
            screen.getByText('Set Script').click();
            screen.getByText('Set Processing').click();
        });

        expect(screen.getByTestId('mode')).toHaveTextContent('script');
        expect(screen.getByTestId('processing')).toHaveTextContent('true');
    });
});
