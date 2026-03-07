import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Plus, Trash2, Globe, Loader2 } from 'lucide-react';

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
    targetLanguage?: string;
    selectedOllamaModel?: string;
}

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
    targetLanguage,
    selectedOllamaModel
}) => {
    const [segments, setSegments] = useState<Segment[]>(initialSegments);
    const [translatingIndex, setTranslatingIndex] = useState<number | null>(null);

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

    const handleTranslateSegment = async (index: number) => {
        if (!targetLanguage || !selectedOllamaModel) {
            alert('Please select a target language and model in the main screen first.');
            return;
        }

        setTranslatingIndex(index);
        const seg = segments[index];

        try {
            const fd = new FormData();
            fd.append('text', seg.text);
            fd.append('target_language', targetLanguage);
            fd.append('model_name', selectedOllamaModel);

            const res = await fetch('http://localhost:8000/api/translate-segment', {
                method: 'POST', body: fd
            });

            if (res.ok) {
                const data = await res.json();
                const updated = [...segments];
                updated[index].original_text = seg.original_text || seg.text;
                updated[index].text = data.translated_text;
                updated[index].is_translated = true;
                setSegments(updated);
            } else {
                alert('Translation failed.');
            }
        } catch (e) {
            console.error(e);
            alert('Error translating segment.');
        } finally {
            setTranslatingIndex(null);
        }
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
                            <div key={idx} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-4 hover:bg-slate-800/60 transition-colors">
                                <div className="grid grid-cols-12 gap-3 items-end">
                                    {/* Index */}
                                    <div className="col-span-1">
                                        <label className="text-xs text-slate-500 block mb-1">Index</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={seg.index}
                                            className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-600/30 rounded text-slate-400 text-sm text-center"
                                        />
                                    </div>
                                    {/* Start Time */}
                                    <div className="col-span-3">
                                        <label className="text-xs text-slate-500 block mb-1">Start</label>
                                        <input
                                            type="text"
                                            value={formatTime(seg.start_ms)}
                                            onChange={(e) => handleStartTimeChange(idx, e.target.value)}
                                            className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-600/50 text-slate-200 rounded text-sm font-mono font-bold"
                                        />
                                    </div>
                                    {/* End Time */}
                                    <div className="col-span-3">
                                        <label className="text-xs text-slate-500 block mb-1">End</label>
                                        <input
                                            type="text"
                                            value={formatTime(seg.end_ms)}
                                            onChange={(e) => handleEndTimeChange(idx, e.target.value)}
                                            className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-600/50 text-slate-200 rounded text-sm font-mono font-bold"
                                        />
                                    </div>
                                    {/* Duration (read-only) */}
                                    <div className="col-span-3">
                                        <label className="text-xs text-slate-500 block mb-1">Duration</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={(seg.end_ms - seg.start_ms) / 1000 + 's'}
                                            className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-600/30 rounded text-slate-400 text-sm text-center"
                                        />
                                    </div>
                                    {/* Translate Button */}
                                    <div className="col-span-1">
                                        <button
                                            onClick={() => handleTranslateSegment(idx)}
                                            disabled={translatingIndex !== null}
                                            title="Translate segment"
                                            className={`w-full px-2 py-1.5 text-indigo-400 rounded-lg transition border border-indigo-500/20 group ${translatingIndex !== null ? 'opacity-50 cursor-not-allowed bg-slate-800' : 'bg-indigo-500/10 hover:bg-indigo-500/20 hover:border-indigo-500/50'}`}
                                        >
                                            {translatingIndex === idx ? (
                                                <Loader2 size={16} className="mx-auto animate-spin" />
                                            ) : (
                                                <Globe size={16} className="mx-auto" />
                                            )}
                                        </button>
                                    </div>
                                    {/* Delete Button */}
                                    <div className="col-span-1">
                                        <button
                                            onClick={() => handleDeleteSegment(idx)}
                                            title="Delete segment"
                                            className="w-full px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition border border-red-500/20 hover:border-red-500/50"
                                        >
                                            <Trash2 size={16} className="mx-auto" />
                                        </button>
                                    </div>
                                </div>
                                {/* Text Area - Full Width Below */}
                                <div className="mt-3">
                                    <label className="text-xs text-slate-500 block mb-2">Text</label>
                                    <textarea
                                        value={seg.text}
                                        onChange={(e) => handleTextChange(idx, e.target.value)}
                                        placeholder="Subtitle text..."
                                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 text-slate-200 rounded text-sm resize-none focus:border-blue-500/50 focus:bg-slate-900 transition min-h-[60px]"
                                    />
                                </div>
                            </div>
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
