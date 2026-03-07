import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { GlobalProvider, useGlobalContext } from './GlobalContext';
import * as hooks from '../hooks/useSystemInfo';

// Mock the hook
vi.mock('../hooks/useSystemInfo', () => ({
    useSystemInfo: () => ({
        systemInfo: { system: { platform: 'test' } },
        isLoading: false,
        error: null,
        fetchSystemInfo: vi.fn(),
    })
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
    it('provides default values and updates state', () => {
        render(
            <GlobalProvider>
                <TestComponent />
            </GlobalProvider>
        );

        expect(screen.getByTestId('mode')).toHaveTextContent('subtitle');
        expect(screen.getByTestId('processing')).toHaveTextContent('false');
        expect(screen.getByTestId('connection')).toHaveTextContent('connected');
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('error')).toHaveTextContent('null');

        act(() => {
            screen.getByText('Set Script').click();
            screen.getByText('Set Processing').click();
        });

        expect(screen.getByTestId('mode')).toHaveTextContent('script');
        expect(screen.getByTestId('processing')).toHaveTextContent('true');
    });
});
