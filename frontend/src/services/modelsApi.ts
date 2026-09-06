import { apiGet, apiPostJson, apiFetch, apiStreamUrl } from './apiClient';

export interface ManagedModel {
    id: string;
    name: string;
    engine: string;
    description: string;
    folder_name: string;
    destination_folder: string;
    upstream_repo: string | null;
    pinned_revision: string | null;
    disk_size_gb: number;
    actual_size_gb: number;
    actual_size_bytes: number;
    vram_cost_gb: number;
    vram_peak_multiplier: number;
    max_batch_size: number;
    supports_voice_clone: boolean;
    supports_voice_design: boolean;
    supports_emotion_tags: boolean;
    requires_reference_audio: boolean;
    requires_reference_transcript: boolean;
    sample_rate: number;
    execution: string;
    installed: boolean;
    can_download: boolean;
    can_delete: boolean;
}

export interface SystemHealth {
    gpu: {
        available: boolean;
        device_name: string;
        cuda_version: string | null;
        vram_total_gb: number;
        vram_free_gb: number;
        vram_allocated_gb: number;
    };
    tools: {
        ffmpeg: {
            available: boolean;
            path: string | null;
        };
        sox: {
            available: boolean;
            path: string | null;
        };
    };
    worker_env: {
        name: string;
        available: boolean;
        path: string | null;
    };
    storage: {
        total_gb: number;
        free_gb: number;
        used_gb: number;
    };
}

export interface DownloadProgressState {
    model_id?: string;
    status: 'idle' | 'downloading' | 'verifying' | 'completed' | 'error' | 'cancelled' | 'cancelling';
    progress_percent: number;
    downloaded_bytes?: number;
    total_bytes?: number;
    speed_mb_s?: number;
    current_file?: string;
    message: string;
}

export const modelsApi = {
    getManageModels: () => apiGet<{ models: ManagedModel[] }>('/api/models/manage'),

    downloadModel: (modelId: string) =>
        apiPostJson<{ status: string; model_id: string; name: string; message: string }>(
            `/api/models/${modelId}/download`,
            {}
        ),

    cancelDownload: () =>
        apiPostJson<{ status: string; message: string }>('/api/models/download/cancel', {}),

    deleteModel: async (modelId: string) => {
        const res = await apiFetch(`/api/models/${modelId}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({})) as { detail?: string };
            throw new Error(err.detail || `Failed to delete model: ${res.status}`);
        }
        return res.json() as Promise<{ status: string; message: string }>;
    },

    getSystemHealth: () => apiGet<SystemHealth>('/api/system/health'),

    subscribeDownloadProgress: (
        onMessage: (state: DownloadProgressState) => void,
        onError?: (err: unknown) => void
    ): (() => void) => {
        const url = apiStreamUrl('/api/models/download/progress');
        const es = new EventSource(url);

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as DownloadProgressState;
                onMessage(data);
            } catch (err) {
                if (onError) onError(err);
            }
        };

        es.onerror = (err) => {
            if (onError) onError(err);
        };

        return () => {
            es.close();
        };
    }
};
