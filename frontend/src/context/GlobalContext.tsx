import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useSystemInfo } from '../hooks/useSystemInfo';
import type { SystemInfoData } from '../hooks/useSystemInfo';
import { ttsApi } from '../services/ttsApi';
import { systemApi } from '../services/systemApi';

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
    engine: 'vibevoice' | 'qwen' | 'omnivoice' | string;
    supports_voice_design: boolean;
    requires_reference?: boolean;
    requires_transcript?: boolean;
    max_speakers?: number;
    sample_rate?: number;
    execution?: string;
    installed?: boolean;
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
     * Refreshes all global data in a single logical batch.
     */
    const refreshTtsData = useCallback(async () => {
        setIsLoadingTtsData(true);
        try {
            const [vData, mData] = await Promise.all([
                ttsApi.getVoices(),
                ttsApi.getModels()
            ]);
            
            // Batch state updates
            if (vData.voices) setVoices(vData.voices);
            if (mData.models) setModels(mData.models);
        } catch (err) {
            console.error("Failed to fetch global TTS data:", err);
        } finally {
            setIsLoadingTtsData(false);
        }
    }, []);

    // Initial load handler
    const initializeAppData = useCallback(async () => {
        await Promise.all([
            fetchSystemInfo(),
            refreshTtsData()
        ]);
    }, [fetchSystemInfo, refreshTtsData]);

    // Poll for backend readiness
    useEffect(() => {
        if (skipPolling) return;

        let isMounted = true;
        let pollInterval: ReturnType<typeof setInterval> | undefined;
        let isChecking = false;

        const checkStatus = async () => {
            if (isChecking) return;
            isChecking = true;
            try {
                const data = await systemApi.getStatus();
                if (data.status === 'ready' && isMounted) {
                    setIsBackendReady(true);
                    if (pollInterval) clearInterval(pollInterval);
                }
            } catch (e) {
                if (isMounted) setIsBackendReady(false);
            } finally {
                isChecking = false;
            }
        };

        checkStatus(); 
        pollInterval = setInterval(checkStatus, 3000); // Relaxed to 3s

        return () => {
            isMounted = false;
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [skipPolling]);

    // Reset processing state if backend becomes unavailable
    useEffect(() => {
        if (!isBackendReady && isProcessing) {
            setIsProcessing(false);
            setAudioUrl(null);
        }
    }, [isBackendReady, isProcessing]);

    // Fetch data ONCE when backend becomes ready
    const hasInitialized = useRef(false);
    const hasTriggeredInitialization = useRef(false);

    useEffect(() => {
        if (isBackendReady && !hasTriggeredInitialization.current) {
            hasTriggeredInitialization.current = true;
            initializeAppData().then(() => {
                hasInitialized.current = true;
            });
        }
    }, [isBackendReady, initializeAppData]);

    const contextValue = useMemo(() => ({
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
    }), [
        appMode,
        isProcessing,
        audioUrl,
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
    ]);

    return (
        <GlobalContext.Provider value={contextValue}>
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
