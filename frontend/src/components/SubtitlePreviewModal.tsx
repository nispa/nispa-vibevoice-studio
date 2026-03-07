import React, { useRef } from 'react';
import { X, Download, FileText } from 'lucide-react';

interface SubtitleSegment {
    index: number;
    start_ms: number;
    end_ms: number;
    text: string;
    duration_sec: number;
}

interface SubtitlePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    segments: SubtitleSegment[];
    originalCount: number;
    finalCount: number;
    onUseAsInput?: (file: File) => void;
    originalFilename?: string;
}

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatSrtTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor(ms % 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

function buildSrtContent(segments: SubtitleSegment[]): string {
    return segments.map(seg => {
        return `${seg.index}\n${formatSrtTime(seg.start_ms)} --> ${formatSrtTime(seg.end_ms)}\n${seg.text}\n`;
    }).join('\n');
}

export const SubtitlePreviewModal: React.FC<SubtitlePreviewModalProps> = ({
    isOpen,
    onClose,
    segments,
    originalCount,
    finalCount,
    onUseAsInput,
    originalFilename = 'subtitles.srt',
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const reductionPercentage = originalCount > 0
        ? Math.round(((originalCount - finalCount) / originalCount) * 100)
        : 0;

    const getExportFilename = () => {
        const baseName = originalFilename.replace(/\.[^/.]+$/, "");
        return `${baseName}_grouped.srt`;
    };

    const handleExportSrt = () => {
        const srtContent = buildSrtContent(segments);
        const blob = new Blob([srtContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getExportFilename();
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleUseAsInput = () => {
        if (!onUseAsInput) return;
        const srtContent = buildSrtContent(segments);
        const file = new File([srtContent], getExportFilename(), { type: 'text/plain' });
        onUseAsInput(file);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel relative bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in">

                {/* Header */}
                <div className="border-b border-slate-700/50 bg-slate-800/30 p-6 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[64px] -z-10" />
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-slate-100">
                            Subtitle Preview
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {finalCount} segments {reductionPercentage > 0 && `(reduced by ${reductionPercentage}%)`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="relative z-10 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Stats Bar */}
                {reductionPercentage > 0 && (
                    <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-3 flex items-center gap-3">
                        <div className="flex-1">
                            <p className="text-sm text-emerald-400">
                                ✓ Grouping reduced segments from {originalCount} to {finalCount} for smoother audio
                            </p>
                        </div>
                    </div>
                )}

                {/* Segments Scroll Area */}
                <div className="flex-1 overflow-auto p-6 bg-slate-950/50">
                    <div className="space-y-3" ref={scrollRef}>
                        {segments.length === 0 ? (
                            <div className="text-slate-500 italic flex items-center justify-center h-full min-h-[200px]">
                                No subtitle segments found
                            </div>
                        ) : (
                            segments.map((seg, idx) => (
                                <div key={idx} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-4 hover:bg-slate-800/60 transition-colors">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="inline-block px-3 py-1 bg-slate-700/60 text-slate-300 text-xs font-mono rounded font-bold">
                                                    #{seg.index}
                                                </span>
                                                <span className="text-xs text-slate-400 font-mono">
                                                    {formatTime(seg.start_ms)} → {formatTime(seg.end_ms)}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    ({seg.duration_sec.toFixed(2)}s)
                                                </span>
                                            </div>
                                            <p className="text-slate-200 text-sm leading-relaxed">
                                                {seg.text}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-700/50 bg-slate-900/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-400 hidden sm:block">
                        Total duration: {segments.length > 0
                            ? formatTime(segments[segments.length - 1].end_ms)
                            : '00:00:00'}
                    </p>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleExportSrt}
                            disabled={segments.length === 0}
                            className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-700 border border-slate-600 rounded-lg transition inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={16} />
                            Export SRT
                        </button>
                        {onUseAsInput && (
                            <button
                                onClick={handleUseAsInput}
                                disabled={segments.length === 0}
                                className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg transition inline-flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FileText size={16} />
                                Use as Input
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600 rounded-lg transition font-medium text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
