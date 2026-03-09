import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSystemInfo } from '../hooks/useSystemInfo';
import type { SystemInfoData } from '../hooks/useSystemInfo';

/**
 * Available modes for the application.
 */
export type AppMode = 'subtitle' | 'script';

/**
 * Status of the connection to the backend API.
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'error';

/**
 * Metadata for a TTS voice.
 */
export interface Voice {
    id: string;
    filename: string;
    language: string;
    accent: string;
    name: string;
    gender: string;
}

/**
 * Properties provided by the GlobalContext.
 */
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

/**
 * Global Context Provider that manages shared application state.
 * 
 * Handles the application mode, processing state, audio URLs, system information,
 * and global TTS data (voices and models).
 * 
 * @param {object} props - Component props.
 * @param {ReactNode} props.children - Child components to be wrapped.
 */
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

    /**
     * Fetches available voices from the backend.
     */
    const fetchVoices = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/voices');
            const data = await res.json();
            if (data.voices) setVoices(data.voices);
        } catch (err) {
            console.error("Failed to fetch voices:", err);
        }
    };

    /**
     * Fetches available TTS models from the backend.
     */
    const fetchModels = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/models');
            const data = await res.json();
            if (data.models) setModels(data.models);
        } catch (err) {
            console.error("Failed to fetch models:", err);
        }
    };

    /**
     * Refreshes both voices and models data.
     */
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

/**
 * Hook to access the global context.
 * 
 * @returns {GlobalContextProps} The global context values.
 * @throws {Error} If used outside of a GlobalProvider.
 */
export function useGlobalContext() {
    const context = useContext(GlobalContext);
    if (context === undefined) {
        throw new Error('useGlobalContext must be used within a GlobalProvider');
    }
    return context;
}
