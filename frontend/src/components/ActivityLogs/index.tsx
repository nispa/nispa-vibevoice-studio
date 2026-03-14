import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LogHeader } from './LogHeader';
import { ActivityFeed } from './ActivityFeed';
import { SegmentPreviews } from './SegmentPreviews';
import { LogFooter } from './LogFooter';

interface ActivityLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    logs: string[];
    title?: string;
    onClear?: () => void;
    audioUrl?: string | null;
    progress?: number;
    onCancel?: (finalize: boolean) => void;
    generatedSegments?: any[];
    totalItems?: number;
    currentItems?: number;
    estimatedTime?: string;
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
    generatedSegments = [],
    totalItems,
    currentItems,
    estimatedTime
}) => {
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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
            <div className="glass-panel relative bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in">
                
                {/* Cancel Confirmation Overlay */}
                {showCancelConfirm && (
                    <div className="absolute inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
                            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-100">Cancel Generation?</h3>
                                <p className="text-slate-400 text-sm mt-2">
                                    Do you want to stop now? You can choose to keep what has been generated so far or discard everything.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => {
                                        onCancel?.(true);
                                        setShowCancelConfirm(false);
                                    }}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={18} />
                                    Finalize Current Progress
                                </button>
                                <button
                                    onClick={() => {
                                        onCancel?.(false);
                                        setShowCancelConfirm(false);
                                        onClose();
                                    }}
                                    className="px-6 py-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl font-bold transition"
                                >
                                    Discard & Stop Completely
                                </button>
                                <button
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition"
                                >
                                    Continue Generating
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <LogHeader 
                    title={title}
                    progress={progress}
                    handleCopyLogs={handleCopyLogs}
                    onClear={onClear}
                    onClose={onClose}
                    totalItems={totalItems}
                    currentItems={currentItems}
                    estimatedTime={estimatedTime}
                />

                <div className="flex-1 overflow-hidden flex flex-col">
                    <ActivityFeed logs={logs} isProcessing={isProcessing} />
                    <SegmentPreviews generatedSegments={generatedSegments} />
                </div>

                <LogFooter 
                    audioUrl={audioUrl}
                    logsCount={logs.length}
                    isProcessing={isProcessing}
                    onCancel={onCancel}
                    onClose={onClose}
                    setShowCancelConfirm={setShowCancelConfirm}
                />
            </div>
        </div>
    );
};
