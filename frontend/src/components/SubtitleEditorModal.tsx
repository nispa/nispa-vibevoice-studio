import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Plus } from 'lucide-react';
import { SubtitleSegmentRow } from '../features/subtitle/components/editor/SubtitleSegmentRow';

interface Segment {
    index: number;
    start_ms: number;
    end_ms: number;
    text: string;
    is_translated?: boolean;
    original_text?: string;
}

interface SubtitleEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    segments: Segment[];
    onSegmentsSave: (segments: Segment[]) => void;
    filename: string;
}

function parseTimeToMs(timeStr: string): number {
    const parts = timeStr.split(':').map(p => parseInt(p, 10));
    if (parts.length !== 3) return 0;
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
}

export const SubtitleEditorModal: React.FC<SubtitleEditorModalProps> = ({
    isOpen,
    onClose,
    segments: initialSegments,
    onSegmentsSave,
    filename,
}) => {
    const [segments, setSegments] = useState<Segment[]>(initialSegments);

    useEffect(() => {
        setSegments(initialSegments);
    }, [initialSegments]);

    if (!isOpen) return null;

    const handleTextChange = (index: number, newText: string) => {
        const updated = [...segments];
        updated[index].text = newText;
        setSegments(updated);
    };

    const handleStartTimeChange = (index: number, newStart: string) => {
        const updated = [...segments];
        updated[index].start_ms = parseTimeToMs(newStart);
        setSegments(updated);
    };

    const handleEndTimeChange = (index: number, newEnd: string) => {
        const updated = [...segments];
        updated[index].end_ms = parseTimeToMs(newEnd);
        setSegments(updated);
    };

    const handleDeleteSegment = (index: number) => {
        setSegments(segments.filter((_, i) => i !== index));
    };

    const handleSegmentTranslated = (index: number, translatedSeg: Segment) => {
        const updated = [...segments];
        updated[index] = translatedSeg;
        setSegments(updated);
    };

    const handleAddSegment = () => {
        const lastSegment = segments[segments.length - 1];
        const newStart = lastSegment ? lastSegment.end_ms : 0;
        const newEnd = newStart + 5000;
        const newSegment: Segment = {
            index: segments.length + 1,
            start_ms: newStart,
            end_ms: newEnd,
            text: '',
        };
        setSegments([...segments, newSegment]);
    };

    const handleSave = () => {
        // Reindex segments
        const reindexed = segments.map((seg, idx) => ({
            ...seg,
            index: idx + 1,
        }));
        onSegmentsSave(reindexed);
        onClose();
    };

    const handleReset = () => {
        setSegments(initialSegments);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel relative bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
                {/* Header */}
                <div className="border-b border-slate-700/50 bg-slate-800/30 p-6 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[64px] -z-10" />
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-slate-100">Edit Subtitles</h2>
                        <p className="text-slate-400 text-sm mt-1">{filename}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="relative z-10 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                    >
                        <X size={24} />
                    </button>
                </div>
                {/* Segments Editor */}
                <div className="flex-1 overflow-auto p-6 bg-slate-950/50">
                    <div className="space-y-4">
                        {segments.map((seg, idx) => (
                            <SubtitleSegmentRow
                                key={idx}
                                segment={seg}
                                index={idx}
                                onTextChange={handleTextChange}
                                onStartTimeChange={handleStartTimeChange}
                                onEndTimeChange={handleEndTimeChange}
                                onDelete={handleDeleteSegment}
                                onTranslated={handleSegmentTranslated}
                            />
                        ))}
                    </div>
                </div>
                {/* Footer */}
                <div className="border-t border-slate-700/50 bg-slate-900/80 px-6 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleAddSegment}
                            className="px-4 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-slate-100 rounded-lg border border-slate-600/50 transition inline-flex items-center gap-2 text-sm"
                        >
                            <Plus size={16} />
                            Add Segment
                        </button>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-700 border border-slate-600 rounded-lg transition inline-flex items-center gap-2 text-sm"
                        >
                            <RotateCcw size={16} />
                            Reset
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600 rounded-lg transition font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg transition font-medium shadow-lg shadow-indigo-500/20 inline-flex items-center gap-2 text-sm"
                        >
                            <Save size={16} />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
