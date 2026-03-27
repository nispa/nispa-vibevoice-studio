import { apiGet, apiFetch } from './apiClient';
import type { SystemInfoData } from '../hooks/useSystemInfo';

export interface StatusResponse {
    status: string;
}

export interface GpuDetailsResponse {
    gpu_devices: SystemInfoData['gpu']['gpu_devices'];
}

export interface MaintenanceStats {
    db_size_mb: number;
    job_count: number;
    audio_size_mb: number;
    audio_folder_count: number;
}

export interface VacuumResult {
    size_before_mb: number;
    size_after_mb: number;
    saved_mb: number;
}

export interface OrphanFolder {
    folder: string;
    job_id: number | null;
    size_mb: number;
}

export interface OrphanAudioResult {
    orphans: OrphanFolder[];
    total_mb: number;
}

export interface DeleteOrphanResult {
    deleted: OrphanFolder[];
    errors: { folder: string; error: string }[];
    total_freed_mb: number;
}

export interface ModelBatchInfo {
    id: string;
    recommended_batch: number;
    user_batch: number | null;
    effective_batch: number;
}

export interface VramInfo {
    vram_free_gb: number | null;
    vram_total_gb: number | null;
    cuda_available: boolean;
    models: ModelBatchInfo[];
}

export interface GpuDeviceInfo {
    index: number;
    device_str: string;
    name: string;
    total_gb: number;
    free_gb: number;
}

export interface MultiGpuInfo {
    gpu_count: number;
    devices: GpuDeviceInfo[];
    enabled: boolean;
    disabled_devices: number[];
}

export const systemApi = {
    getStatus: () => apiGet<StatusResponse>('/api/status'),
    getSystemInfo: () => apiGet<SystemInfoData>('/api/system-info'),
    getGpuDetails: () => apiGet<GpuDetailsResponse>('/api/system/gpu-details'),
    testQwen: () => apiFetch('/api/system/test-qwen', { method: 'POST' }),
    getMaintenanceStats: () => apiGet<MaintenanceStats>('/api/maintenance/stats'),
    vacuumDb: () => apiFetch('/api/maintenance/vacuum', { method: 'POST' }),
    listOrphanAudio: () => apiGet<OrphanAudioResult>('/api/maintenance/orphan-audio'),
    deleteOrphanAudio: () => apiFetch('/api/maintenance/orphan-audio', { method: 'DELETE' }),
    getVramInfo: () => apiGet<VramInfo>('/api/system/vram-info'),
    setBatchOverride: (model_id: string, batch_size: number | null) =>
        apiFetch('/api/system/batch-override', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model_id, batch_size }),
        }),
    getMultiGpu: () => apiGet<MultiGpuInfo>('/api/system/multi-gpu'),
    setMultiGpu: (disabled_devices: number[]) =>
        apiFetch('/api/system/multi-gpu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disabled_devices }),
        }),
};
