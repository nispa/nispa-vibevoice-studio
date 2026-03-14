import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GlobalProvider, useGlobalContext } from './GlobalContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the hook
vi.mock('../hooks/useSystemInfo', () => ({
    useSystemInfo: vi.fn(() => ({
        systemInfo: { system: { platform: 'test' } },
        isLoading: false,
        error: null,
        fetchSystemInfo: vi.fn().mockResolvedValue(undefined),
    }))
}));

const TestComponent = () => {
    const { appMode, setAppMode, isProcessing, setIsProcessing, connectionStatus, isBackendReady } = useGlobalContext();
    return (
        <div>
            <span data-testid="mode">{appMode}</span>
            <span data-testid="processing">{isProcessing.toString()}</span>
            <span data-testid="connection">{connectionStatus}</span>
            <span data-testid="ready">{isBackendReady.toString()}</span>
            <button onClick={() => setAppMode('script')}>Set Script</button>
            <button onClick={() => setIsProcessing(true)}>Set Processing</button>
        </div>
    );
};

describe('GlobalContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Global fetch mock to avoid real network calls
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url) => {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ voices: [], models: [], status: 'ready' }),
            });
        }));
    });

    it('provides default values and updates state when backend is ready', async () => {
        render(
            <GlobalProvider skipPolling={true}>
                <TestComponent />
            </GlobalProvider>
        );

        // Wait for initial ready state
        await waitFor(() => {
            expect(screen.getByTestId('ready')).toHaveTextContent('true');
        }, { timeout: 2000 });

        expect(screen.getByTestId('mode')).toHaveTextContent('subtitle');
        expect(screen.getByTestId('connection')).toHaveTextContent('connected');

        // Update state
        act(() => {
            screen.getByText('Set Script').click();
            screen.getByText('Set Processing').click();
        });

        // Verify updates
        expect(screen.getByTestId('mode')).toHaveTextContent('script');
        expect(screen.getByTestId('processing')).toHaveTextContent('true');
    });

    it('shows connecting status when backend is not ready', async () => {
        render(
            <GlobalProvider skipPolling={false}>
                <TestComponent />
            </GlobalProvider>
        );

        // Should start as false/connecting
        expect(screen.getByTestId('ready')).toHaveTextContent('false');
        expect(screen.getByTestId('connection')).toHaveTextContent('connecting');
    });
});
