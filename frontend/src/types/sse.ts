/**
 * Types for Server-Sent Events (SSE) messages from generation tasks.
 */

export interface SseNewSegment {
    index: number;
    text: string;
    audio_b64: string;
    voice_id: string;
    model_name: string;
    language: string;
}

export interface SseMessage {
    type: 'progress' | 'complete' | 'error';
    status?: string;
    progress?: number;
    current_item?: number;
    total_items?: number;
    audioUrl?: string;
    message?: string;
    new_segments?: SseNewSegment[];
}
