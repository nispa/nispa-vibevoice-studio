import React, { useState } from 'react';
import { Globe, Loader2, Trash2, Mic2, CheckCircle2, Scissors } from 'lucide-react';
import { useTranslationContext } from '../../context/TranslationContext';
import { useGlobalContext } from '../../../../context/GlobalContext';
import type { Segment } from './types';
import { formatMsToTime } from './utils';
import { AudioWaveformPlayer } from '../../../../components/ui/AudioWaveformPlayer';
import { AudioTrimmer } from '../../../../components/ui/AudioTrimmer';

interface SubtitleSegmentRowProps {
    segment: Segment;
    index: number;
    onTextChange: (index: number, text: string) => void;
    onStartTimeChange: (index: number, time: string) => void;
    onEndTimeChange: (index: number, time: string) => void;
    onDelete: (index: number) => void;
    onTranslated: (index: number, translatedSeg: Segment) => void;
    onAudioUpdated: (index: number, audioUrl: string) => void;
    onApprovalToggle: (index: number) => void;
}

export const SubtitleSegmentRow: React.FC<SubtitleSegmentRowProps> = React.memo(({
    segment,
    index,
    onTextChange,
    onStartTimeChange,
    onEndTimeChange,
    onDelete,
    onTranslated,
    onAudioUpdated,
    onApprovalToggle
}) => {
    const [isTranslating, setIsTranslating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showTrimmer, setShowTrimmer] = useState(false);
    
    const { targetLanguage } = useTranslationContext();
    const { selectedVoiceId, selectedModel } = useGlobalContext();

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
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsTranslating(false);
        }
    };

    const handleGenerateAudio = async () => {
        if (!selectedVoiceId) {
            alert('Please select a voice in the main panel first.');
            return;
        }

        setIsGenerating(true);
        try {
            const fd = new FormData();
            fd.append('text', segment.text);
            fd.append('voice_id', selectedVoiceId);
            fd.append('model_name', selectedModel || 'VibeVoice-1.5B');

            const res = await fetch('http://localhost:8000/api/generate-segment', {
                method: 'POST', body: fd
            });

            if (res.ok) {
                const data = await res.json();
                onAudioUpdated(index, `data:audio/wav;base64,${data.audio_base64}`);
            } else {
                const err = await res.json();
                console.error("Synthesis failed:", err.detail);
                alert(`Synthesis error: ${err.detail}`);
            }
        } catch (e) {
            console.error(e);
            alert("Error connecting to synthesis server.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTrimmed = (newB64: string) => {
        onAudioUpdated(index, `data:audio/wav;base64,${newB64}`);
        setShowTrimmer(false);
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
                        onClick={handleGenerateAudio}
                        disabled={isGenerating}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${segment.audioUrl ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'}`}
                    >
                        {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Mic2 size={14} />}
                        {segment.audioUrl ? 'RE-GENERATE' : 'GENERATE AUDIO'}
                    </button>

                    <button
                        onClick={() => onApprovalToggle(index)}
                        disabled={!segment.audioUrl}
                        className={`p-2 rounded-lg transition border flex items-center gap-2 ${segment.isApproved ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-slate-700/50 text-slate-500 border-slate-600 hover:text-emerald-400 hover:border-emerald-500/30'}`}
                        title={segment.isApproved ? "Approved" : "Verify Segment"}
                    >
                        <CheckCircle2 size={18} />
                        {segment.isApproved && <span className="text-[10px] font-bold">VERIFIED</span>}
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

            {segment.audioUrl && (
                <div className="pt-2 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                            <AudioWaveformPlayer 
                                audioUrl={segment.audioUrl} 
                                height={40}
                                barColor={segment.isApproved ? "#10b981" : "#6366f1"}
                            />
                        </div>
                        <button
                            onClick={() => setShowTrimmer(!showTrimmer)}
                            className={`p-2 rounded-lg transition border flex items-center gap-2 text-xs font-bold ${showTrimmer ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700'}`}
                        >
                            <Scissors size={14} />
                            {showTrimmer ? 'CLOSE EDITOR' : 'TRIM'}
                        </button>
                    </div>

                    {showTrimmer && (
                        <AudioTrimmer 
                            audioUrl={segment.audioUrl}
                            onTrimmed={handleTrimmed}
                            onCancel={() => setShowTrimmer(false)}
                        />
                    )}
                </div>
            )}
        </div>
    );
});
