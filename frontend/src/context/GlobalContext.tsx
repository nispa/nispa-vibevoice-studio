import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSystemInfo } from '../hooks/useSystemInfo';
import type { SystemInfoData } from '../hooks/useSystemInfo';

export type AppMode = 'subtitle' | 'script';

export type ConnectionStatus = 'connecting' | 'connected' | 'error';

interface GlobalContextProps {
    appMode: AppMode;
    setAppMode: (mode: AppMode) => void;
    isProcessing: boolean;
    setIsProcessing: (processing: boolean) => void;
    audioUrl: string | null;
    setAudioUrl: (url: string | null) => void;
    systemInfo: SystemInfoData | null;
    fetchSystemInfo: () => Promise<void>;
    connectionStatus: ConnectionStatus;
    isLoadingSystemInfo: boolean;
    systemInfoError: string | null;
}

const GlobalContext = createContext<GlobalContextProps | undefined>(undefined);

export function GlobalProvider({ children }: { children: ReactNode }) {
    const [appMode, setAppMode] = useState<AppMode>('subtitle');
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const { systemInfo, isLoading, error, fetchSystemInfo } = useSystemInfo();

    const connectionStatus: ConnectionStatus = isLoading ? 'connecting' : error ? 'error' : 'connected';

    // Fetch once on mount
    useEffect(() => {
        fetchSystemInfo();
    }, [fetchSystemInfo]);

    return (
        <GlobalContext.Provider
            value={{
                appMode,
                setAppMode,
                isProcessing,
                setIsProcessing,
                audioUrl,
                setAudioUrl,
                systemInfo,
                fetchSystemInfo,
                connectionStatus,
                isLoadingSystemInfo: isLoading,
                systemInfoError: error
            }}
        >
            {children}
        </GlobalContext.Provider>
    );
}

export function useGlobalContext() {
    const context = useContext(GlobalContext);
    if (context === undefined) {
        throw new Error('useGlobalContext must be used within a GlobalProvider');
    }
    return context;
}
