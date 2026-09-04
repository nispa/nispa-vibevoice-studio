import React, { useState } from 'react';
import { Globe, Loader2, Trash2 } from 'lucide-react';
import { useTranslationContext } from '../../context/TranslationContext';
import type { Segment } from './types';
import { formatMsToTime } from './utils';
import { ttsApi } from '../../../../services/ttsApi';

interface SubtitleSegmentRowProps {
    segment: Segment;
    index: number;
    onTextChange: (index: number, text: string) => void;
    onStartTimeChange: (index: number, time: string) => void;
    onEndTimeChange: (index: number, time: string) => void;
    onDelete: (index: number) => void;
    onTranslated: (index: number, translatedSeg: Segment) => void;
}

export const SubtitleSegmentRow: React.FC<SubtitleSegmentRowProps> = React.memo(({
    segment,
    index,
    onTextChange,
    onStartTimeChange,
    onEndTimeChange,
    onDelete,
    onTranslated
}) => {
    const [isTranslating, setIsTranslating] = useState(false);

    const { targetLanguage } = useTranslationContext();

    const handleTranslate = async () => {
        if (!targetLanguage) {
            alert('Please select a target language first.');
            return;
        }

        setIsTranslating(true);
        try {
            const fd = new FormData();
            fd.append('text', segment.text);
            fd.append('target_language', targetLanguage);
            fd.append('model_name', 'NLLB-200-Distilled-600M');

            const data = await ttsApi.translateSegment(fd);
            const updated = {
                ...segment,
                original_text: segment.original_text || segment.text,
                text: data.translated_text,
                is_translated: true
            };
            onTranslated(index, updated);
        } catch (e) {
            console.error(e);
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className={`border rounded-xl p-5 transition-all space-y-4 ${segment.isApproved ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-800/40 border-slate-700/30 hover:bg-slate-800/60'}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold font-mono ${segment.isApproved ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        #{segment.index}
                    </span>
                    <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1 rounded-lg border border-slate-700/50">
                        <input
                            type="text"
                            value={formatMsToTime(segment.start_ms)}
                            onChange={(e) => onStartTimeChange(index, e.target.value)}
                            className="w-20 bg-transparent text-slate-200 text-xs font-mono text-center focus:outline-none"
                        />
                        <span className="text-slate-600">→</span>
                        <input
                            type="text"
                            value={formatMsToTime(segment.end_ms)}
                            onChange={(e) => onEndTimeChange(index, e.target.value)}
                            className="w-20 bg-transparent text-slate-200 text-xs font-mono text-center focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleTranslate}
                        disabled={isTranslating}
                        title="Translate segment"
                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition border border-indigo-500/20"
                    >
                        {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                    </button>

                    <button
                        onClick={() => onDelete(index)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition border border-rose-500/20"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <textarea
                value={segment.text}
                onChange={(e) => onTextChange(index, e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700/50 text-slate-200 rounded-xl text-sm resize-none focus:border-indigo-500/50 transition min-h-[80px]"
                placeholder="Subtitle text..."
            />
        </div>
    );
});
