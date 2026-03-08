import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSystemInfo } from '../hooks/useSystemInfo';
import type { SystemInfoData } from '../hooks/useSystemInfo';

export type AppMode = 'subtitle' | 'script';

export type ConnectionStatus = 'connecting' | 'connected' | 'error';

export interface Voice {
    id: string;
    filename: string;
    language: string;
    accent: string;
    name: string;
    gender: string;
}

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
    
    // Shared TTS Data
    voices: Voice[];
    models: string[];
    isLoadingTtsData: boolean;
    refreshTtsData: () => Promise<void>;
}

const GlobalContext = createContext<GlobalContextProps | undefined>(undefined);

export function GlobalProvider({ children }: { children: ReactNode }) {
    const [appMode, setAppMode] = useState<AppMode>('subtitle');
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    
    // Shared TTS Data
    const [voices, setVoices] = useState<Voice[]>([]);
    const [models, setModels] = useState<string[]>([]);
    const [isLoadingTtsData, setIsLoadingTtsData] = useState(false);

    const { systemInfo, isLoading, error, fetchSystemInfo } = useSystemInfo();

    const connectionStatus: ConnectionStatus = isLoading ? 'connecting' : error ? 'error' : 'connected';

    const fetchVoices = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/voices');
            const data = await res.json();
            if (data.voices) setVoices(data.voices);
        } catch (err) {
            console.error("Failed to fetch voices:", err);
        }
    };

    const fetchModels = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/models');
            const data = await res.json();
            if (data.models) setModels(data.models);
        } catch (err) {
            console.error("Failed to fetch models:", err);
        }
    };

    const refreshTtsData = async () => {
        setIsLoadingTtsData(true);
        await Promise.all([fetchVoices(), fetchModels()]);
        setIsLoadingTtsData(false);
    };

    // Fetch once on mount
    useEffect(() => {
        fetchSystemInfo();
        refreshTtsData();
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
                systemInfoError: error,
                voices,
                models,
                isLoadingTtsData,
                refreshTtsData
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
