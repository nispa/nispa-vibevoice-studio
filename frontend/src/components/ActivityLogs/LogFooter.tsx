import React from 'react';
import { Download } from 'lucide-react';

interface LogFooterProps {
    audioUrl?: string | null;
    logsCount: number;
    isProcessing: boolean;
    onCancel?: (finalize: boolean) => void;
    onClose: () => void;
    setShowCancelConfirm: (show: boolean) => void;
}

export const LogFooter: React.FC<LogFooterProps> = ({
    audioUrl,
    logsCount,
    isProcessing,
    onCancel,
    onClose,
    setShowCancelConfirm
}) => {
    return (
        <>
            {/* Audio Player Preview (FINAL RESULT) */}
            {audioUrl && (
                <div className="border-t border-slate-700/50 bg-slate-800/40 px-6 py-5 shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                                ✨ Final Combined Audio
                            </p>
                            <audio
                                controls
                                src={audioUrl}
                                className="w-full h-10 rounded-lg bg-slate-950 border border-slate-700/50"
                            />
                        </div>
                        <button
                            onClick={() => {
                                const a = document.createElement('a');
                                a.href = audioUrl;
                                a.download = `generated_audio_${new Date().getTime()}`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                            }}
                            className="px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl transition shadow-lg shadow-indigo-500/20 flex items-center gap-2 font-bold"
                        >
                            <Download size={18} />
                            Download Final
                        </button>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="border-t border-slate-700/50 bg-slate-900 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
                <p className="text-[11px] text-slate-500 font-medium">
                    Session: {new Date().toLocaleDateString()} • {logsCount} logs recorded
                </p>
                <div className="flex items-center gap-3">
                    {isProcessing && onCancel && (
                        <button
                            onClick={() => setShowCancelConfirm(true)}
                            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition font-medium text-xs"
                        >
                            Cancel Generation
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 rounded-lg transition font-medium text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </>
    );
};
