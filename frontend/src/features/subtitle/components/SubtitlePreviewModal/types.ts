export interface SubtitleSegment {
    index: number;
    start_ms: number;
    end_ms: number;
    text: string;
    duration_sec: number;
}

export interface SubtitlePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    segments: SubtitleSegment[];
    originalCount: number;
    finalCount: number;
    onUseAsInput?: (file: File) => void;
    originalFilename?: string;
}
