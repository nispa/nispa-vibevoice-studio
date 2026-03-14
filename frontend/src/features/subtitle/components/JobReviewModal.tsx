import React, { useState } from 'react';
import { X, CheckCircle2, Download, Loader2, Music, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { AudioWaveformPlayer } from '../../../components/ui/AudioWaveformPlayer';
import { useSubtitleContext } from '../context/SubtitleContext';
import type { SubtitleSegment } from '../context/SubtitleContext';
import { useGlobalContext } from '../../../context/GlobalContext';

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
    const [regeneratingIds, setRegeneratingIds] = useState<Record<number, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [filterGenerated, setFilterGenerated] = useState(true);
    const itemsPerPage = 10;
    
    const { setSubtitleSegments, updateJob, selectedVoiceId, selectedModel, selectedLanguage } = useSubtitleContext();

    if (!isOpen) return null;

    // Filter segments based on toggle
    const filteredSegments = filterGenerated 
        ? segments.filter(s => s.audioUrl || s.audioBase64)
        : segments;

    // Calculate pagination
    const totalPages = Math.max(1, Math.ceil(filteredSegments.length / itemsPerPage));
    const paginatedSegments = filteredSegments.slice(
        (currentPage - 1) * itemsPerPage, 
        currentPage * itemsPerPage
    );

    // Reset page if filter changes
    const handleToggleFilter = () => {
        setFilterGenerated(!filterGenerated);
        setCurrentPage(1);
    };

    // Helper to get a valid audio URL (either existing or reconstructed from base64)
    const getActiveAudioUrl = (seg: SubtitleSegment) => {
        if (seg.audioUrl && !seg.audioUrl.startsWith('blob:') && seg.audioUrl.startsWith('data:audio/')) {
            return seg.audioUrl;
        }
        
        if (seg.audioUrl && seg.audioUrl.startsWith('blob:')) {
            return seg.audioUrl;
        }

        if (seg.audioBase64) {
            try {
                const binaryString = atob(seg.audioBase64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'audio/wav' });
                return URL.createObjectURL(blob);
            } catch (e) {
                console.error("Failed to reconstruct audio in modal:", e);
            }
        }
        
        return seg.audioUrl;
    };

    const handleRegenerate = async (seg: SubtitleSegment) => {
        // Use segment specific settings if available, else fallback to current context
        const voiceId = seg.voice_id || selectedVoiceId;
        const modelName = seg.model_name || selectedModel;
        const lang = seg.language || selectedLanguage;

        if (!voiceId) {
            setError("Cannot regenerate: No voice selected.");
            return;
        }

        setRegeneratingIds(prev => ({ ...prev, [seg.index]: true }));
        setError(null);

        try {
            const fd = new FormData();
            fd.append('text', seg.text);
            fd.append('voice_id', voiceId);
            fd.append('model_name', modelName);
            fd.append('language', lang);

            const res = await fetch('http://localhost:8000/api/generate-segment', {
                method: 'POST',
                body: fd
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "Regeneration failed");
            }

            const data = await res.json();
            const newBase64 = data.audio_base64;
            const newAudioUrl = `data:audio/wav;base64,${newBase64}`;

            // Update local state in context
            const updatedSegments = segments.map(s => {
                if (s.index === seg.index) {
                    return { 
                        ...s, 
                        audioBase64: newBase64, 
                        audioUrl: newAudioUrl,
                        voice_id: voiceId,
                        model_name: modelName,
                        language: lang
                    };
                }
                return s;
            });

            setSubtitleSegments(updatedSegments);

            // Update database immediately
            if (jobId) {
                await updateJob(jobId, {
                    modified_segments: updatedSegments
                });
            }

        } catch (e: any) {
            console.error("Regeneration error:", e);
            setError(`Failed to regenerate segment #${seg.index}: ${e.message}`);
        } finally {
            setRegeneratingIds(prev => ({ ...prev, [seg.index]: false }));
        }
    };

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
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleToggleFilter}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                                filterGenerated 
                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' 
                                : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}
                        >
                            {filterGenerated ? 'Showing: Generated Only' : 'Showing: All Segments'}
                        </button>
                        <button 
                            onClick={onClose} 
                            className="p-2.5 hover:bg-slate-800 rounded-full text-slate-400 transition-all border border-transparent hover:border-slate-700"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content: Scrollable list of segments */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-950/30">
                    <div className="flex items-center justify-between mb-2">
                        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 flex-1 mr-4">
                            <p className="text-xs text-indigo-300 leading-relaxed">
                                Review segments below. Total segments in this view: <span className="font-bold">{filteredSegments.length}</span>
                            </p>
                        </div>
                        
                        {/* Pagination Controls Top */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-xl border border-slate-700/50">
                                <button 
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                    className="p-1.5 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition"
                                >
                                    <Music size={16} className="rotate-180" />
                                </button>
                                <span className="text-[10px] font-bold font-mono px-2">
                                    {currentPage} / {totalPages}
                                </span>
                                <button 
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    className="p-1.5 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition"
                                >
                                    <Music size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {paginatedSegments.map((seg) => (
                        <div 
                            key={seg.index} 
                            className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-5 transition-all group shadow-sm flex flex-col gap-4"
                        >
                            {/* Segment Info (Top) */}
                            <div className="w-full space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded uppercase tracking-wider">
                                        #{seg.index}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500">
                                        {Math.floor(seg.start_ms / 1000)}s → {Math.floor(seg.end_ms / 1000)}s
                                    </span>
                                    {(seg.voice_id || seg.model_name) && (
                                        <span className="text-[10px] text-indigo-400/70 border border-indigo-500/20 px-2 py-0.5 rounded-full ml-auto">
                                            {seg.model_name || 'TTS'} • {seg.voice_id?.split('-').pop() || 'Voice'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm font-medium text-slate-300 leading-snug italic">
                                    "{seg.text}"
                                </p>
                            </div>

                            {/* Audio Player & Actions (Bottom) */}
                            <div className="flex items-center gap-4 w-full">
                                <div className="flex-1">
                                    {getActiveAudioUrl(seg) ? (
                                        <AudioWaveformPlayer 
                                            audioUrl={getActiveAudioUrl(seg)!} 
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
                                <button
                                    onClick={() => handleRegenerate(seg)}
                                    disabled={regeneratingIds[seg.index]}
                                    className="shrink-0 p-3 bg-slate-800 hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-400 border border-slate-700 hover:border-indigo-500/30 rounded-xl transition-all flex items-center justify-center disabled:opacity-50"
                                    title="Regenerate this segment"
                                >
                                    {regeneratingIds[seg.index] ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <RefreshCw size={18} />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Pagination Controls Bottom */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 pt-4">
                            <button 
                                disabled={currentPage === 1}
                                onClick={() => {
                                    setCurrentPage(prev => prev - 1);
                                    document.querySelector('.overflow-y-auto')?.scrollTo(0, 0);
                                }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl transition text-xs font-bold"
                            >
                                Previous Page
                            </button>
                            <span className="text-xs font-bold font-mono">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button 
                                disabled={currentPage === totalPages}
                                onClick={() => {
                                    setCurrentPage(prev => prev + 1);
                                    document.querySelector('.overflow-y-auto')?.scrollTo(0, 0);
                                }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl transition text-xs font-bold"
                            >
                                Next Page
                            </button>
                        </div>
                    )}
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
