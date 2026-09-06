import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, AlertTriangle, ListMusic, Terminal, Copy, Check } from 'lucide-react';

import { ProgressBar } from '../../../../components/ui/ProgressBar';
import { SegmentPreviews } from '../../../../components/ActivityLogs/SegmentPreviews';
import type { GeneratedSegment } from '../../../../types/generated';

interface GenerationProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCancel?: () => void;
    progress?: number;
    logs?: string[];
    generatedSegments?: GeneratedSegment[];
}

export const GenerationProgressModal: React.FC<GenerationProgressModalProps> = ({
    isOpen,
    onClose,
    onCancel,
    progress = 0,
    logs = [],
    generatedSegments = [],
}) => {
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [showConfirmClose, setShowConfirmClose] = useState(false);
    const [activeTab, setActiveTab] = useState<'segments' | 'logs'>('logs');
    const [copied, setCopied] = useState(false);

    // Auto-switch to segments tab when first segment arrives if user hasn't manually switched
    const hasAutoSwitchedRef = useRef(false);
    useEffect(() => {
        if (generatedSegments.length > 0 && !hasAutoSwitchedRef.current) {
            hasAutoSwitchedRef.current = true;
            setActiveTab('segments');
        }
    }, [generatedSegments.length]);

    useEffect(() => {
        if (!isOpen) {
            hasAutoSwitchedRef.current = false;
        }
    }, [isOpen]);

    // Auto-scroll logs to bottom
    useEffect(() => {
        if (activeTab === 'logs') {
            logsEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }
    }, [logs, activeTab]);

    if (!isOpen) return null;

    const handleCloseClick = () => {
        if (progress < 100) {
            setShowConfirmClose(true);
        } else {
            setShowConfirmClose(false);
            onClose();
        }
    };

    const handleCopyLogs = () => {
        navigator.clipboard.writeText(logs.join('\n')).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const latestStatus = logs.length > 0 ? logs[logs.length - 1] : '';

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel relative bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in">

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
                    <ProgressBar 
                        progress={progress} 
                        label="System Activity Progress"
                        size="lg"
                    />
                </div>

                {/* Tabs Bar */}
                <div className="px-6 py-3 border-b border-slate-700/50 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {generatedSegments.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('segments')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                                    activeTab === 'segments'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <ListMusic size={14} />
                                <span>Generated Lines</span>
                                <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
                                    {generatedSegments.length}
                                </span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setActiveTab('logs')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                                activeTab === 'logs'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Terminal size={14} />
                            <span>Activity Logs</span>
                            <span className="px-1.5 py-0.5 bg-slate-700/80 rounded-full text-[10px]">
                                {logs.length}
                            </span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeTab === 'logs' && logs.length > 0 && (
                            <button
                                type="button"
                                onClick={handleCopyLogs}
                                className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-md border border-slate-700/50 flex items-center gap-1 transition"
                                title="Copy all logs"
                            >
                                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                <span>{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-[300px]">
                    {activeTab === 'segments' && generatedSegments.length > 0 ? (
                        <SegmentPreviews generatedSegments={generatedSegments} />
                    ) : (
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
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-700/50 bg-slate-900/80 px-6 py-4 flex items-center justify-between">
                    <p className="text-sm text-slate-400 truncate max-w-xl">
                        {progress === 100
                            ? <span className="text-emerald-400 flex items-center gap-2">✨ Generation complete! You can now download your audio.</span>
                            : latestStatus || 'Please wait while your conversation is being generated...'}
                    </p>
                    {progress < 100 && onCancel && (
                        <button
                            type="button"
                            onClick={() => setShowConfirmClose(true)}
                            className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition font-medium"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GenerationProgressModal;
