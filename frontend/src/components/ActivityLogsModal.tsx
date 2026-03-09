import React, { useEffect, useRef } from 'react';
import { X, Copy, Trash2, Download, Loader2 } from 'lucide-react';

interface ActivityLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    logs: string[];
    title?: string;
    onClear?: () => void;
    audioUrl?: string | null;
    progress?: number;
    onCancel?: () => void;
}

export const ActivityLogsModal: React.FC<ActivityLogsModalProps> = ({
    isOpen,
    onClose,
    logs = [],
    title = 'Activity Logs',
    onClear,
    audioUrl,
    progress = 0,
    onCancel,
}) => {
    const logsEndRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const handleCopyLogs = () => {
        const logsText = logs.join('\n');
        navigator.clipboard.writeText(logsText).then(() => {
            console.log('Logs copied to clipboard');
        });
    };

    const isProcessing = progress > 0 && progress < 100;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel relative bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col animate-fade-in">

                {/* Header */}
                <div className="border-b border-slate-700/50 bg-slate-800/30 p-6 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[64px] -z-10" />
                    <div className="relative z-10 flex-1">
                        <h2 className="text-2xl font-bold text-slate-100">
                            {title}
                        </h2>
                        
                        {/* Progress Bar */}
                        <div className="mt-4 max-w-md">
                            <div className="flex justify-between text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">
                                <span>{progress === 100 ? 'Completed' : 'Overall Progress'}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden border border-slate-600/30">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-start pt-1">
                        <button
                            onClick={handleCopyLogs}
                            title="Copy all logs to clipboard"
                            className="relative z-10 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                        >
                            <Copy size={20} />
                        </button>
                        {onClear && (
                            <button
                                onClick={onClear}
                                title="Clear logs"
                                className="relative z-10 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="relative z-10 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Logs Area - Show ONLY the current sentence */}
                <div className="flex-1 overflow-auto p-8 bg-slate-950/50 font-mono shadow-inner relative flex flex-col items-center justify-center text-center">
                    {logs.length === 0 ? (
                        <div className="text-slate-500 italic">
                            Initializing...
                        </div>
                    ) : (
                        <div className="animate-fade-in space-y-3">
                            <div className="flex items-center justify-center gap-2">
                                <p className="text-indigo-400 text-[10px] uppercase tracking-[0.2em] font-bold opacity-70">
                                    Current Task
                                </p>
                                {isProcessing && (
                                    <Loader2 size={12} className="text-indigo-400 animate-spin" />
                                )}
                            </div>
                            <div className="text-xs md:text-sm text-slate-400 font-mono leading-relaxed max-w-2xl mx-auto italic">
                                {logs[logs.length - 1].replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '')}
                            </div>
                        </div>
                    )}
                </div>

                {/* Audio Player Preview */}
                {audioUrl && (
                    <div className="border-t border-slate-700/50 bg-slate-800/20 px-6 py-5">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                    🎵 Audio Preview
                                </p>
                                <audio
                                    controls
                                    src={audioUrl}
                                    className="w-full h-10 rounded-lg bg-slate-900 border border-slate-700/50"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = audioUrl;
                                    // Try to guess format from blob type or just use .wav as safe default if it's high quality
                                    // But here we can just use a generic name, the browser will handle the blob extension
                                    a.download = `generated_audio_${new Date().getTime()}`;
                                    // If we want to be precise, we'd need to know the format from the parent
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                }}
                                title="Download the generated audio"
                                className="p-3 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg transition shadow-lg shadow-indigo-500/20 flex items-center gap-2 whitespace-nowrap"
                            >
                                <Download size={18} />
                                Download
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="border-t border-slate-700/50 bg-slate-900/80 px-6 py-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-400">
                        Showing {logs.length} log entries
                    </p>
                    <div className="flex items-center gap-3">
                        {isProcessing && onCancel && (
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition font-medium text-sm"
                            >
                                Cancel Generation
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600 rounded-lg transition font-medium text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
