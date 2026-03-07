import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';

interface GenerationProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCancel?: () => void;
    progress?: number;
    logs?: string[];
}

export const GenerationProgressModal: React.FC<GenerationProgressModalProps> = ({
    isOpen,
    onClose,
    onCancel,
    progress = 0,
    logs = [],
}) => {
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    // Auto-scroll logs to bottom
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [logs]);

    // Reset confirmation state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setShowConfirmClose(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCloseClick = () => {
        if (progress < 100) {
            setShowConfirmClose(true);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel relative bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in">

                {/* Confirmation Overlay */}
                {showConfirmClose && (
                    <div className="absolute inset-0 z-20 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                        <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4 border border-yellow-500/20">
                            <AlertTriangle size={32} className="text-yellow-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-100 mb-2">Generation in Progress</h3>
                        <p className="text-slate-400 mb-8 max-w-md">
                            Do you want to cancel the audio generation completely, or let it run in the background?
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <button
                                onClick={() => {
                                    setShowConfirmClose(false);
                                    if (onCancel) onCancel();
                                    onClose();
                                }}
                                className="px-5 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50 rounded-lg transition font-medium"
                            >
                                Cancel Generation
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmClose(false);
                                    onClose();
                                }}
                                className="px-5 py-2.5 bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600 rounded-lg transition font-medium"
                            >
                                Run in Background
                            </button>
                            <button
                                onClick={() => setShowConfirmClose(false)}
                                className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg transition font-medium shadow-lg shadow-indigo-500/20"
                            >
                                Keep Open
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="border-b border-slate-700/50 bg-slate-800/30 p-6 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[64px] -z-10" />
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100">
                            {progress < 100 && <Loader2 size={24} className="animate-spin text-indigo-400" />}
                            Generating Audio...
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Connecting to local TTS Engine
                        </p>
                    </div>
                    <button
                        onClick={handleCloseClick}
                        className="relative z-10 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 py-5 border-b border-slate-700/50 bg-slate-800/10">
                    <div className="flex justify-between text-sm mb-3">
                        <span className="font-semibold text-slate-300 flex items-center gap-2">
                            System Activity Progress
                        </span>
                        <span className="text-indigo-400 font-mono font-medium">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 border border-slate-700/50 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Logs TextArea */}
                <div className="flex-1 overflow-auto p-6 bg-slate-950/50 font-mono text-sm shadow-inner relative">
                    <div className="space-y-1.5 whitespace-pre-wrap break-words">
                        {logs.length === 0 ? (
                            <div className="text-slate-500 italic flex items-center justify-center h-full min-h-[100px]">
                                Waiting for system resources initialization...
                            </div>
                        ) : (
                            logs.map((log, idx) => (
                                <div key={idx} className="text-slate-300 border-l-2 border-slate-700/50 pl-3 py-0.5 hover:bg-slate-800/30 hover:border-indigo-500/50 transition-colors">
                                    {log}
                                </div>
                            ))
                        )}
                        <div ref={logsEndRef} />
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-700/50 bg-slate-900/80 px-6 py-4 flex items-center justify-between">
                    <p className="text-sm text-slate-400">
                        {progress === 100
                            ? <span className="text-emerald-400 flex items-center gap-2">✨ Generation complete! You can now download your audio.</span>
                            : 'Please wait while your conversation is being generated...'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GenerationProgressModal;
