import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    modelsApi,
    type ManagedModel,
    type SystemHealth,
    type DownloadProgressState
} from '../../../services/modelsApi';
import { useGlobalContext } from '../../../context/GlobalContext';
import { showConfirm } from '../../../utils/uiEvents';

export interface UseModelsManagerReturn {
    // Tabs & Filters
    activeTab: 'models' | 'health';
    setActiveTab: (tab: 'models' | 'health') => void;
    engineFilter: string;
    setEngineFilter: (filter: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;

    // Data
    models: ManagedModel[];
    filteredModels: ManagedModel[];
    health: SystemHealth | null;
    isLoading: boolean;
    errorMsg: string | null;
    setErrorMsg: (msg: string | null) => void;

    // Active download
    downloadState: DownloadProgressState | null;
    isDownloading: boolean;

    // Actions
    loadData: () => Promise<void>;
    handleDownload: (modelId: string) => Promise<void>;
    handleCancelDownload: () => Promise<void>;
    handleDelete: (model: ManagedModel) => Promise<void>;
}

export function useModelsManager(isOpen: boolean): UseModelsManagerReturn {
    const { refreshTtsData } = useGlobalContext();
    const [activeTab, setActiveTab] = useState<'models' | 'health'>('models');
    const [engineFilter, setEngineFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const [models, setModels] = useState<ManagedModel[]>([]);
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [downloadState, setDownloadState] = useState<DownloadProgressState | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const [modelsRes, healthRes] = await Promise.all([
                modelsApi.getManageModels(),
                modelsApi.getSystemHealth()
            ]);
            setModels(modelsRes.models);
            setHealth(healthRes);
        } catch (err: unknown) {
            setErrorMsg((err as Error).message || 'Failed to load model catalog.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        loadData();

        // Subscribe to real-time SSE download progress
        const unsubscribe = modelsApi.subscribeDownloadProgress(
            (state) => {
                setDownloadState(state);
                if (state.status === 'completed') {
                    // Refresh model status on completion
                    loadData();
                    refreshTtsData();
                }
            },
            (err) => {
                console.error('[SSE Models] Error:', err);
            }
        );

        return () => {
            unsubscribe();
        };
    }, [isOpen, loadData, refreshTtsData]);

    const handleDownload = useCallback(async (modelId: string) => {
        setErrorMsg(null);
        try {
            await modelsApi.downloadModel(modelId);
        } catch (err: unknown) {
            setErrorMsg((err as Error).message || 'Failed to initiate download.');
        }
    }, []);

    const handleCancelDownload = useCallback(async () => {
        try {
            await modelsApi.cancelDownload();
        } catch (err: unknown) {
            setErrorMsg((err as Error).message || 'Failed to cancel download.');
        }
    }, []);

    const handleDelete = useCallback(async (m: ManagedModel) => {
        const confirmed = await showConfirm({
            title: `Delete ${m.name}?`,
            message: `Are you sure you want to delete weights for "${m.name}"? This will free up approximately ${m.actual_size_gb || m.disk_size_gb} GB of disk space.`,
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            variant: 'danger'
        });
        if (!confirmed) return;

        setErrorMsg(null);
        try {
            await modelsApi.deleteModel(m.id);
            await loadData();
            refreshTtsData();
        } catch (err: unknown) {
            setErrorMsg((err as Error).message || 'Failed to delete model weights.');
        }
    }, [loadData, refreshTtsData]);

    const filteredModels = useMemo(() => {
        return models.filter((m) => {
            const matchesEngine =
                engineFilter === 'all' ||
                (engineFilter === 'translation' ? m.engine === 'translation' : m.engine === engineFilter);
            const matchesSearch =
                !searchQuery.trim() ||
                m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.id.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesEngine && matchesSearch;
        });
    }, [models, engineFilter, searchQuery]);

    const isDownloading =
        downloadState?.status === 'downloading' || downloadState?.status === 'verifying';

    return {
        activeTab,
        setActiveTab,
        engineFilter,
        setEngineFilter,
        searchQuery,
        setSearchQuery,
        models,
        filteredModels,
        health,
        isLoading,
        errorMsg,
        setErrorMsg,
        downloadState,
        isDownloading,
        loadData,
        handleDownload,
        handleCancelDownload,
        handleDelete
    };
}
