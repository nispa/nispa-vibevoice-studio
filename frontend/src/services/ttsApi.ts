import { apiGet, apiPostForm, apiFetch, apiStreamUrl, API_BASE_URL } from './apiClient';
import type { Voice, Model } from '../context/GlobalContext';

export interface VoicesResponse {
    voices: Voice[];
}

export interface ModelsResponse {
    models: Model[];
}

export interface GenerateSegmentResponse {
    audio_base64: string;
    audio_path: string | null;
}

export const ttsApi = {
    getVoices: () => apiGet<VoicesResponse>('/api/voices'),
    getModels: (includeAll: boolean = true) =>
        apiGet<ModelsResponse>(`/api/models?include_all=${includeAll}`),

    generateSegment: (body: FormData) =>
        apiPostForm<GenerateSegmentResponse>('/api/generate-segment', body),

    submitGenerationTask: (body: FormData) =>
        apiPostForm<{ task_id: string }>('/api/tasks/generate-subtitles', body),

    getActiveTask: () =>
        apiGet<{ active: boolean; task_id?: string; status?: string; progress?: number; current_item?: number; total_items?: number }>('/api/tasks/active'),

    cancelTask: (taskId: string, finalize: boolean) =>
        apiFetch(`/api/tasks/${taskId}/cancel?finalize=${finalize}`, { method: 'POST' }),

    taskStreamUrl: (taskId: string) => apiStreamUrl(`/api/tasks/${taskId}/stream`),

    previewSubtitles: (body: FormData, groupByPunctuation: boolean) =>
        apiPostForm<{ segments: unknown[] }>(
            `/api/preview-subtitles?group_by_punctuation=${groupByPunctuation}`,
            body
        ),

    finalizeJob: (jobId: number, outputFormat: string): Promise<Response> =>
        fetch(`${API_BASE_URL}/api/jobs/${jobId}/finalize?output_format=${outputFormat}`, {
            method: 'POST'
        }),

    exportAudioSegments: (body: FormData) =>
        apiFetch('/api/export-audio-segments', { method: 'POST', body }),

    translateSegment: (body: FormData) =>
        apiPostForm<{ translated_text: string }>('/api/translate-segment', body),

    finalizeAudio: (body: FormData) =>
        apiFetch('/api/finalize-audio', { method: 'POST', body }),

    previewSubtitlesRaw: (body: FormData, groupByPunctuation: boolean): Promise<Response> =>
        apiFetch(`/api/preview-subtitles?group_by_punctuation=${groupByPunctuation}`, {
            method: 'POST',
            body
        }),

    submitScriptTask: (body: FormData) =>
        apiPostForm<{ task_id: string }>('/api/tasks/generate', body),

    trimAudio: (audioBase64: string, startSec: number, endSec: number) =>
        apiFetch('/api/system/trim-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_base64: audioBase64, start_sec: startSec, end_sec: endSec })
        }),
};
