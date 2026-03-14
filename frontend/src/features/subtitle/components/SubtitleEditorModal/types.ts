export interface Segment {
    index: number;
    start_ms: number;
    end_ms: number;
    text: string;
    is_translated?: boolean;
    original_text?: string;
    audioUrl?: string;
    isApproved?: boolean;
}

export interface SubtitleEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    segments: Segment[];
    onSegmentsSave: (segments: Segment[]) => void;
    filename: string;
}
