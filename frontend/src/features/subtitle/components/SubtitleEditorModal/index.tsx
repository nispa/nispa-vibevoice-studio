import React, { useState } from 'react';
import { X, Save, RotateCcw, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { SubtitleSegmentRow } from './SubtitleSegmentRow';
import type { SubtitleEditorModalProps } from './types';
import { useSubtitleEditor } from './useSubtitleEditor';

const ITEMS_PER_PAGE = 10;

export const SubtitleEditorModal: React.FC<SubtitleEditorModalProps> = ({
    isOpen,
    onClose,
    segments: initialSegments,
    onSegmentsSave,
    filename,
}) => {
    const {
        segments,
        isFinalizing,
        handleTextChange,
        handleAudioUpdated,
        handleApprovalToggle,
        handleStartTimeChange,
        handleEndTimeChange,
        handleDeleteSegment,
        handleSegmentTranslated,
        handleAddSegment,
        handleSave,
        handleFinalizeAudio,
        handleReset
    } = useSubtitleEditor(initialSegments, onSegmentsSave, onClose);

    const [currentPage, setCurrentPage] = useState(1);

    if (!isOpen) return null;

    const approvedCount = segments.filter(s => s.isApproved).length;
    const totalPages = Math.ceil(segments.length / ITEMS_PER_PAGE);
    
    // Pagination logic
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedSegments = segments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleExportSegments = async () => {
        const audioSegments = segments.filter(s => s.audioUrl);
        if (audioSegments.length === 0) {
            alert("No audio segments to export.");
            return;
        }

        try {
            const fd = new FormData();
            fd.append('segments_json', JSON.stringify(audioSegments));

            const res = await fetch('http://localhost:8000/api/export-audio-segments', {
                method: 'POST',
                body: fd
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audio_segments_${new Date().getTime()}.zip`;
                a.click();
            }
        } catch (err) {
            console.error(err);
            alert("Failed to export segments.");
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel relative bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
                {/* Header */}
                <div className="border-b border-slate-700/50 bg-slate-800/30 p-6 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[64px] -z-10" />
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-slate-100">Subtitle & Audio Studio</h2>
                        <p className="text-slate-400 text-sm mt-1">{filename} • {approvedCount}/{segments.length} verified</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="relative z-10 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                    >
                        <X size={24} />
                    </button>
                </div>
                {/* Segments Editor */}
                <div className="flex-1 overflow-auto p-6 bg-slate-950/50 custom-scrollbar">
                    <div className="space-y-6">
                        {paginatedSegments.map((seg) => (
                            <SubtitleSegmentRow
                                key={seg.index}
                                segment={seg}
                                index={segments.findIndex(s => s.index === seg.index)}
                                onTextChange={handleTextChange}
                                onStartTimeChange={handleStartTimeChange}
                                onEndTimeChange={handleEndTimeChange}
                                onDelete={handleDeleteSegment}
                                onTranslated={handleSegmentTranslated}
                                onAudioUpdated={handleAudioUpdated}
                                onApprovalToggle={handleApprovalToggle}
                            />
                        ))}
                    </div>
                </div>
                {/* Footer */}
                <div className="border-t border-slate-700/50 bg-slate-900/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleAddSegment}
                            className="px-4 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-slate-100 rounded-lg border border-slate-600/50 transition inline-flex items-center gap-2 text-sm"
                        >
                            <Plus size={16} />
                            Add
                        </button>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 hover:bg-slate-700 rounded-md disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-xs font-mono font-bold px-2 text-slate-400">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 hover:bg-slate-700 rounded-md disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-700 border border-slate-600 rounded-lg transition inline-flex items-center gap-2 text-sm"
                        >
                            <RotateCcw size={16} />
                            Reset
                        </button>
                        
                        <div className="h-8 w-px bg-slate-700 mx-1 hidden sm:block" />

                        <button
                            onClick={handleFinalizeAudio}
                            disabled={approvedCount === 0 || isFinalizing}
                            className={`px-6 py-2 rounded-lg font-bold transition flex items-center gap-2 text-sm ${approvedCount === segments.length ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/30'}`}
                        >
                            {isFinalizing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {approvedCount < segments.length ? `JOIN APPROVED (${approvedCount})` : 'FINALIZE & JOIN ALL'}
                        </button>

                        <button
                            onClick={handleExportSegments}
                            disabled={segments.filter(s => s.audioUrl).length === 0}
                            className="px-4 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-600/50 transition inline-flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                            EXPORT ZIP (INDIVIDUAL)
                        </button>

                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg transition font-medium shadow-lg shadow-indigo-500/20 inline-flex items-center gap-2 text-sm"
                        >
                            Save Subtitles
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
