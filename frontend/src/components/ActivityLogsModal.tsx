import React, { useEffect, useRef } from 'react';
import { X, Copy, Trash2, Download } from 'lucide-react';

interface ActivityLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    logs: string[];
    title?: string;
    onClear?: () => void;
    audioUrl?: string | null;
}

export const ActivityLogsModal: React.FC<ActivityLogsModalProps> = ({
    isOpen,
    onClose,
    logs = [],
    title = 'Activity Logs',
    onClear,
    audioUrl,
}) => {
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs to bottom
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [logs]);

    if (!isOpen) return null;

    const handleCopyLogs = () => {
        const logsText = logs.join('\n');
        navigator.clipboard.writeText(logsText).then(() => {
            // You can add a toast notification here if needed
            console.log('Logs copied to clipboard');
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel relative bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col animate-fade-in">

                {/* Header */}
                <div className="border-b border-slate-700/50 bg-slate-800/30 p-6 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[64px] -z-10" />
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-slate-100">
                            {title}
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {logs.length} log entries
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
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

                {/* Logs TextArea */}
                <div className="flex-1 overflow-auto p-6 bg-slate-950/50 font-mono text-sm shadow-inner relative">
                    <div className="space-y-1.5 whitespace-pre-wrap break-words">
                        {logs.length === 0 ? (
                            <div className="text-slate-500 italic flex items-center justify-center h-full min-h-[200px]">
                                No activity logs yet. Start processing to see logs here.
                            </div>
                        ) : (
                            logs.map((log, idx) => (
                                <div
                                    key={idx}
                                    className="text-slate-300 border-l-2 border-slate-700/50 pl-3 py-0.5 hover:bg-slate-800/30 hover:border-purple-500/50 transition-colors"
                                >
                                    <span className="text-slate-500 text-xs">[{idx + 1}]</span> {log}
                                </div>
                            ))
                        )}
                        <div ref={logsEndRef} />
                    </div>
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
                            <a
                                href={audioUrl}
                                download="generated_audio.mp3"
                                title="Download the generated audio"
                                className="p-3 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg transition shadow-lg shadow-indigo-500/20 flex items-center gap-2 whitespace-nowrap"
                            >
                                <Download size={18} />
                            </a>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="border-t border-slate-700/50 bg-slate-900/80 px-6 py-4 flex items-center justify-between">
                    <p className="text-sm text-slate-400">
                        Showing {logs.length} log entries
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600 rounded-lg transition font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
