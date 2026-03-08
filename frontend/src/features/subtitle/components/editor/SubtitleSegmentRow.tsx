import React, { useState } from 'react';
import { Globe, Loader2, Trash2 } from 'lucide-react';
import { useTranslationContext } from '../../context/TranslationContext';

interface Segment {
    index: number;
    start_ms: number;
    end_ms: number;
    text: string;
    is_translated?: boolean;
    original_text?: string;
}

interface SubtitleSegmentRowProps {
    segment: Segment;
    index: number;
    onTextChange: (index: number, text: string) => void;
    onStartTimeChange: (index: number, time: string) => void;
    onEndTimeChange: (index: number, time: string) => void;
    onDelete: (index: number) => void;
    onTranslated: (index: number, translatedSeg: Segment) => void;
}

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export const SubtitleSegmentRow: React.FC<SubtitleSegmentRowProps> = ({
    segment,
    index,
    onTextChange,
    onStartTimeChange,
    onEndTimeChange,
    onDelete,
    onTranslated
}) => {
    const [isTranslating, setIsTranslating] = useState(false);
    const { targetLanguage, selectedOllamaModel } = useTranslationContext();

    const handleTranslate = async () => {
        if (!targetLanguage || !selectedOllamaModel) {
            alert('Please select a target language and model in the main screen first.');
            return;
        }

        setIsTranslating(true);
        try {
            const fd = new FormData();
            fd.append('text', segment.text);
            fd.append('target_language', targetLanguage);
            fd.append('model_name', selectedOllamaModel);

            const res = await fetch('http://localhost:8000/api/translate-segment', {
                method: 'POST', body: fd
            });

            if (res.ok) {
                const data = await res.json();
                const updated = {
                    ...segment,
                    original_text: segment.original_text || segment.text,
                    text: data.translated_text,
                    is_translated: true
                };
                onTranslated(index, updated);
            } else {
                alert('Translation failed.');
            }
        } catch (e) {
            console.error(e);
            alert('Error translating segment.');
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-4 hover:bg-slate-800/60 transition-colors">
            <div className="grid grid-cols-12 gap-3 items-end">
                {/* Index */}
                <div className="col-span-1">
                    <label className="text-xs text-slate-500 block mb-1">Index</label>
                    <input
                        type="text"
                        disabled
                        value={segment.index}
                        className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-600/30 rounded text-slate-400 text-sm text-center"
                    />
                </div>
                {/* Start Time */}
                <div className="col-span-3">
                    <label className="text-xs text-slate-500 block mb-1">Start</label>
                    <input
                        type="text"
                        value={formatTime(segment.start_ms)}
                        onChange={(e) => onStartTimeChange(index, e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-600/50 text-slate-200 rounded text-sm font-mono font-bold"
                    />
                </div>
                {/* End Time */}
                <div className="col-span-3">
                    <label className="text-xs text-slate-500 block mb-1">End</label>
                    <input
                        type="text"
                        value={formatTime(segment.end_ms)}
                        onChange={(e) => onEndTimeChange(index, e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-600/50 text-slate-200 rounded text-sm font-mono font-bold"
                    />
                </div>
                {/* Duration (read-only) */}
                <div className="col-span-3">
                    <label className="text-xs text-slate-500 block mb-1">Duration</label>
                    <input
                        type="text"
                        disabled
                        value={(segment.end_ms - segment.start_ms) / 1000 + 's'}
                        className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-600/30 rounded text-slate-400 text-sm text-center"
                    />
                </div>
                {/* Translate Button */}
                <div className="col-span-1">
                    <button
                        onClick={handleTranslate}
                        disabled={isTranslating}
                        title="Translate segment"
                        className={`w-full px-2 py-1.5 text-indigo-400 rounded-lg transition border border-indigo-500/20 group ${isTranslating ? 'opacity-50 cursor-not-allowed bg-slate-800' : 'bg-indigo-500/10 hover:bg-indigo-500/20 hover:border-indigo-500/50'}`}
                    >
                        {isTranslating ? (
                            <Loader2 size={16} className="mx-auto animate-spin" />
                        ) : (
                            <Globe size={16} className="mx-auto" />
                        )}
                    </button>
                </div>
                {/* Delete Button */}
                <div className="col-span-1">
                    <button
                        onClick={() => onDelete(index)}
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
                    value={segment.text}
                    onChange={(e) => onTextChange(index, e.target.value)}
                    placeholder="Subtitle text..."
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600/50 text-slate-200 rounded text-sm resize-none focus:border-blue-500/50 focus:bg-slate-900 transition min-h-[60px]"
                />
            </div>
        </div>
    );
};
