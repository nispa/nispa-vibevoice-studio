import React, { useState } from 'react';
import { Loader2, Globe, Clock, CheckCircle } from 'lucide-react';
import { CustomPromptEditor } from '../../../../components/translation/CustomPromptEditor';
import { TranslationFeed } from '../../../../components/translation/TranslationFeed';
import { ExecutionLogs } from '../../../../components/translation/ExecutionLogs';
import { useTranslationContext } from '../../context/TranslationContext';
import { useTranslationLoop } from '../../hooks/useTranslationLoop';

interface TranslationProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const formatTime = (seconds: number | null) => {
    if (seconds === null) return 'Calculating...';
    if (seconds < 60) return `${Math.ceil(seconds)}s remain`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${mins}m ${secs}s remain`;
};

export const TranslationProgressModal: React.FC<TranslationProgressModalProps> = ({
    isOpen,
    onClose,
}) => {
    const {
        translationProgress: progress,
        translationLogs: logs,
        isTranslating,
        isPausing,
        hasStartedTranslation: hasStarted,
        sourceLanguage,
        targetLanguage,
        selectedOllamaModel
    } = useTranslationContext();

    const { runTranslationLoop } = useTranslationLoop();

    const [customPrompt, setCustomPrompt] = useState(`NLLB-200 Internal engine. Automated batch translation.`);

    // Re-calculating codes for the loop call
    const getEffectiveCode = (lang: string) => {
        const match = lang.match(/\(([^)]+)\)/);
        return match ? match[1] : lang;
    };

    const handleStart = () => {
        // Source Code logic: Extract from (code) or use directly
        const src = getEffectiveCode(sourceLanguage);
        const tgt = getEffectiveCode(targetLanguage);
        
        // Note: For 'Other (Custom Code)', we'd need to access the custom inputs.
        // For now, let's assume the user selects from the list.
        runTranslationLoop(customPrompt, src, tgt);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel relative bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl h-[70vh] overflow-hidden flex flex-col animate-fade-in">

                {/* Header */}
                <div className="border-b border-slate-700/50 bg-slate-800/30 p-6 flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[64px] -z-10" />
                    <div className="relative z-10 flex flex-col">
                        <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100">
                            {progress < 100 && isTranslating && hasStarted && <Loader2 size={24} className="animate-spin text-indigo-400" />}
                            {!hasStarted ? (
                                <><Globe size={24} className="text-slate-400" /> Start Offline Translation</>
                            ) : progress === 100 ? (
                                <><CheckCircle size={24} className="text-emerald-400" /> Translation Complete</>
                            ) : (
                                <><Globe size={24} className="text-indigo-400" /> Processing {targetLanguage}...</>
                            )}
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Using integrated NLLB-200 Distilled model</p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-slate-950/30 p-6">
                    {!hasStarted ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
                            <div className="p-4 bg-indigo-500/10 rounded-full">
                                <Globe size={48} className="text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-200">Ready to Translate</h3>
                            <p className="text-slate-400 text-sm">
                                The subtitles will be translated to <span className="text-indigo-400 font-bold">{targetLanguage}</span> using our high-performance offline engine. This process is fast and runs entirely on your hardware.
                            </p>
                        </div>
                    ) : (
                        <TranslationFeed
                            progress={progress}
                            logs={logs}
                            isTranslating={isTranslating}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-700/50 bg-slate-900/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                    <p className="text-sm text-slate-400">
                        {progress === 100
                            ? <span className="text-emerald-400 font-medium">✨ Success! State saved to Job Archive.</span>
                            : !hasStarted
                                ? <span>Click Start to begin the process.</span>
                                : <span>Batch translation in progress...</span>}
                    </p>
                    <div className="flex gap-3">
                        {!hasStarted ? (
                            <button
                                onClick={handleStart}
                                className="px-5 py-2.5 bg-indigo-600/90 text-white hover:bg-indigo-500 rounded-lg transition font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                            >
                                <Globe size={18} />
                                Start Translation
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 bg-slate-700 text-white hover:bg-slate-600 rounded-lg transition font-medium"
                            >
                                {progress === 100 ? 'Finish' : 'Close'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TranslationProgressModal;
