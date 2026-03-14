import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
 * Metadata for a TTS model.
 */
export interface Model {
    id: string;
    name: string;
    engine: 'vibevoice' | 'qwen';
    supports_voice_design: boolean;
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
    isBackendReady: boolean;
    
    // Shared TTS Data
    voices: Voice[];
    models: Model[];
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
 * @param {boolean} [props.skipPolling] - Optional: Skip backend polling (useful for tests).
 */
export function GlobalProvider({ children, skipPolling = false }: { children: ReactNode, skipPolling?: boolean }) {
    const [appMode, setAppMode] = useState<AppMode>('subtitle');
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isBackendReady, setIsBackendReady] = useState(skipPolling);
    
    // Shared TTS Data
    const [voices, setVoices] = useState<Voice[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [isLoadingTtsData, setIsLoadingTtsData] = useState(false);

    const { systemInfo, isLoading: isLoadingSystemInfo, error: systemInfoError, fetchSystemInfo } = useSystemInfo();

    const connectionStatus: ConnectionStatus = !isBackendReady ? 'connecting' : systemInfoError ? 'error' : 'connected';

    /**
     * Fetches available voices from the backend.
     */
    const fetchVoices = useCallback(async () => {
        try {
            const res = await fetch('http://127.0.0.1:8000/api/voices');
            const data = await res.json();
            if (data.voices) setVoices(data.voices);
        } catch (err) {
            console.error("Failed to fetch voices:", err);
        }
    }, []);

    /**
     * Fetches available TTS models from the backend.
     */
    const fetchModels = useCallback(async () => {
        try {
            const res = await fetch('http://127.0.0.1:8000/api/models');
            const data = await res.json();
            if (data.models) setModels(data.models);
        } catch (err) {
            console.error("Failed to fetch models:", err);
        }
    }, []);

    /**
     * Refreshes both voices and models data.
     */
    const refreshTtsData = useCallback(async () => {
        setIsLoadingTtsData(true);
        await Promise.all([fetchVoices(), fetchModels()]);
        setIsLoadingTtsData(false);
    }, [fetchVoices, fetchModels]);

    // Poll for backend readiness
    useEffect(() => {
        if (skipPolling) return;

        let isMounted = true;
        let pollInterval: any;

        const checkStatus = async () => {
            try {
                const res = await fetch('http://127.0.0.1:8000/api/status');
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'ready') {
                        if (isMounted) {
                            setIsBackendReady(true);
                            clearInterval(pollInterval);
                        }
                    }
                }
            } catch (e) {
                // Ignore errors during polling
                if (isMounted) setIsBackendReady(false);
            }
        };

        checkStatus(); // Check immediately
        pollInterval = setInterval(checkStatus, 2000); // Then poll every 2s

        return () => {
            isMounted = false;
            clearInterval(pollInterval);
        };
    }, [skipPolling]);

    // Reset processing state if backend becomes unavailable
    useEffect(() => {
        if (!isBackendReady && isProcessing) {
            setIsProcessing(false);
            setAudioUrl(null);
            console.log("[Global] Backend disconnected. Resetting processing state.");
        }
    }, [isBackendReady, isProcessing]);

    // Fetch data once backend is ready
    useEffect(() => {
        if (isBackendReady) {
            fetchSystemInfo();
            refreshTtsData();
        }
    }, [isBackendReady, fetchSystemInfo, refreshTtsData]);

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
                isLoadingSystemInfo,
                systemInfoError,
                isBackendReady,
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
