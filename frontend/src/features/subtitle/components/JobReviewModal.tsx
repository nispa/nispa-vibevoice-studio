import React, { useState } from 'react';
import { X, CheckCircle2, Download, Loader2, Music, FileText, AlertCircle } from 'lucide-react';
import { AudioWaveformPlayer } from '../../../components/ui/AudioWaveformPlayer';

interface SubtitleSegment {
    index: number;
    text: string;
    audioUrl?: string;
    start_ms: number;
    end_ms: number;
}

interface JobReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: number | null;
    jobName: string;
    segments: SubtitleSegment[];
}

export const JobReviewModal: React.FC<JobReviewModalProps> = ({ 
    isOpen, 
    onClose, 
    jobId, 
    jobName,
    segments 
}) => {
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleFinalize = async () => {
        if (!jobId) return;
        
        setIsFinalizing(true);
        setError(null);
        
        try {
            const response = await fetch(`http://localhost:8000/api/jobs/${jobId}/finalize?output_format=mp3`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || "Finalization failed");
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `final_voiceover_${jobId}.mp3`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        } catch (err: any) {
            setError(err.message || "An error occurred during finalization");
        } finally {
            setIsFinalizing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
            <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col text-slate-100 border-indigo-500/20">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                            <CheckCircle2 className="text-indigo-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Review & Finalize</h2>
                            <p className="text-sm text-slate-400 flex items-center gap-2">
                                <FileText size={14} /> {jobName} (Job #{jobId})
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2.5 hover:bg-slate-800 rounded-full text-slate-400 transition-all border border-transparent hover:border-slate-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content: Scrollable list of segments */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-950/30">
                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 mb-2">
                        <p className="text-xs text-indigo-300 leading-relaxed text-center">
                            Review each segment's audio below. The final output will align these segments perfectly with the original timing.
                        </p>
                    </div>

                    {segments.map((seg) => (
                        <div 
                            key={seg.index} 
                            className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-5 transition-all group shadow-sm"
                        >
                            <div className="flex flex-col md:flex-row gap-5 items-start md:items-center">
                                {/* Segment Info */}
                                <div className="w-full md:w-1/3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded uppercase tracking-wider">
                                            #{seg.index}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-500">
                                            {Math.floor(seg.start_ms / 1000)}s → {Math.floor(seg.end_ms / 1000)}s
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-300 leading-snug line-clamp-2 italic">
                                        "{seg.text}"
                                    </p>
                                </div>

                                {/* Audio Player */}
                                <div className="flex-1 w-full">
                                    {seg.audioUrl ? (
                                        <AudioWaveformPlayer 
                                            audioUrl={seg.audioUrl} 
                                            height={36}
                                            barColor="#818cf8"
                                        />
                                    ) : (
                                        <div className="h-12 bg-slate-950/50 rounded-xl border border-dashed border-slate-800 flex items-center justify-center gap-2 text-slate-600">
                                            <AlertCircle size={14} />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">No Audio Generated</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-slate-900/80 border-t border-slate-800 flex flex-col gap-4">
                    {error && (
                        <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/5 border border-rose-500/20 p-3 rounded-xl animate-shake">
                            <AlertCircle size={14} />
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-sm font-bold transition-all border border-slate-700/50"
                        >
                            Back to Editor
                        </button>
                        <button 
                            onClick={handleFinalize}
                            disabled={isFinalizing || segments.length === 0}
                            className={`flex-[2] py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-3 shadow-xl ${
                                isFinalizing 
                                ? 'bg-indigo-600/50 cursor-not-allowed text-white/50' 
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                            }`}
                        >
                            {isFinalizing ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>Assembling Audio...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={20} />
                                    <span>Download Final Voiceover</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
