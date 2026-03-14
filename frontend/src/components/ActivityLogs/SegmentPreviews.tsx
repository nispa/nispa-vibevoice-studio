import React, { useState } from 'react';
import { AudioWaveformPlayer } from '../ui/AudioWaveformPlayer';
import { AudioTrimmer } from '../ui/AudioTrimmer';
import { Scissors } from 'lucide-react';

interface SegmentPreviewsProps {
    generatedSegments: any[];
}

export const SegmentPreviews: React.FC<SegmentPreviewsProps> = ({ generatedSegments }) => {
    const [editingIndex, setEditingId] = useState<number | null>(null);

    // Show only the latest 4 segments
    const displaySegments = [...generatedSegments].reverse().slice(0, 4);

    const handleTrimmed = (segIndex: number, newAudioBase64: string) => {
        // Find the segment in the original array and update its audio
        const seg = generatedSegments.find(s => s.index === segIndex);
        if (seg) {
            seg.audioUrl = `data:audio/wav;base64,${newAudioBase64}`;
            setEditingId(null);
        }
    };

    return (
        <div className="flex-1 bg-slate-900/50 flex flex-col overflow-hidden min-h-[300px]">
            <div className="p-4 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Recent Generated Segments</h4>
                </div>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] rounded-full font-bold border border-indigo-500/30">
                    {generatedSegments.length} total
                </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900/20">
                {generatedSegments.length === 0 ? (
                    <div className="text-center py-20 opacity-30 italic text-xs text-slate-500 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                        Awaiting generated audio segments...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
                        {displaySegments.map((seg, i) => (
                            <div key={seg.index || i} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 space-y-4 animate-slide-in-right shadow-xl hover:border-indigo-500/30 transition-all">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/10">
                                        SEGMENT #{seg.index}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setEditingId(editingIndex === seg.index ? null : seg.index)}
                                            className={`p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase ${editingIndex === seg.index ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400 hover:text-indigo-400'}`}
                                            title="Trim Audio"
                                        >
                                            <Scissors size={12} />
                                            {editingIndex === seg.index ? 'Editing...' : 'Trim'}
                                        </button>
                                        <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-tighter flex items-center gap-1">
                                            <div className="w-1 h-1 bg-emerald-500 rounded-full" /> Ready
                                        </span>
                                    </div>
                                </div>
                                
                                <p className="text-xs md:text-sm text-slate-200 leading-relaxed italic bg-slate-900/40 p-3 rounded-lg border border-slate-700/30">
                                    "{seg.text}"
                                </p>
                                
                                {editingIndex === seg.index ? (
                                    <AudioTrimmer 
                                        audioUrl={seg.audioUrl}
                                        onTrimmed={(base64) => handleTrimmed(seg.index, base64)}
                                        onCancel={() => setEditingId(null)}
                                    />
                                ) : (
                                    <div className="pt-1">
                                        <AudioWaveformPlayer 
                                            audioUrl={seg.audioUrl} 
                                            height={40}
                                            barColor="#6366f1"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
