import React, { useState } from 'react';
import { Loader2, Globe, Clock, CheckCircle } from 'lucide-react';
import { CustomPromptEditor } from './translation/CustomPromptEditor';
import { TranslationFeed } from './translation/TranslationFeed';
import { ExecutionLogs } from './translation/ExecutionLogs';

interface TranslationProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (prompt: string) => void;
    onPause: () => void;
    progress: number;
    logs: string[];
    currentOriginalText: string;
    currentTranslatedText: string;
    previousOriginalText?: string;
    previousTranslatedText?: string;
    estimatedTimeRemaining: number | null; // in seconds
    isPausing: boolean;
    hasStarted: boolean;
    targetLanguage: string;
}

export const TranslationProgressModal: React.FC<TranslationProgressModalProps> = ({
    isOpen,
    onClose,
    onStart,
    onPause,
    progress = 0,
    logs = [],
    currentOriginalText = '',
    currentTranslatedText = '',
    previousOriginalText = '',
    previousTranslatedText = '',
    estimatedTimeRemaining = null,
    isPausing = false,
    hasStarted = false,
    targetLanguage = 'Target Language'
}) => {
    const [customPrompt, setCustomPrompt] = useState(`You are a professional subtitle translator. Translate the following subtitle text to {target_language}. Keep the same tone. Return ONLY the translation, no extra text, no quotes, no explanations and don't add any additional information, and don't think:\n{text}`);

    if (!isOpen) return null;

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return 'Calculating...';
        if (seconds < 60) return `${Math.ceil(seconds)}s remain`;
        const mins = Math.floor(seconds / 60);
        const secs = Math.ceil(seconds % 60);
        return `${mins}m ${secs}s remain`;
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel relative bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col animate-fade-in">

                {/* Header */}
                <div className="border-b border-slate-700/50 bg-slate-800/30 p-6 flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[64px] -z-10" />
                    <div className="relative z-10 flex flex-col">
                        <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-100">
                            {progress < 100 && !isPausing && hasStarted && <Loader2 size={24} className="animate-spin text-indigo-400" />}
                            {!hasStarted ? (
                                <><Globe size={24} className="text-slate-400" /> Confirm Translation Options</>
                            ) : progress === 100 ? (
                                <><CheckCircle size={24} className="text-emerald-400" /> Translation Complete</>
                            ) : isPausing ? (
                                <><Globe size={24} className="text-amber-400" /> Pausing Translation...</>
                            ) : (
                                <><Globe size={24} className="text-indigo-400" /> Translating to {targetLanguage}...</>
                            )}
                        </h2>
                        {hasStarted && estimatedTimeRemaining !== null && progress < 100 && (
                            <div className="flex items-center gap-2 text-slate-400 text-sm mt-2">
                                <Clock size={16} />
                                <span>{formatTime(estimatedTimeRemaining)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="px-6 py-5 border-b border-slate-700/50 bg-slate-800/10 shrink-0">
                    <div className="flex justify-between text-sm mb-3">
                        <span className="font-semibold text-slate-300 flex items-center gap-2">
                            Completion Progress
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

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-700/50 min-h-0 bg-slate-950/30">
                    {!hasStarted ? (
                        <CustomPromptEditor
                            customPrompt={customPrompt}
                            setCustomPrompt={setCustomPrompt}
                        />
                    ) : (
                        <>
                            <TranslationFeed
                                progress={progress}
                                currentOriginalText={currentOriginalText}
                                currentTranslatedText={currentTranslatedText}
                                previousOriginalText={previousOriginalText}
                                previousTranslatedText={previousTranslatedText}
                            />
                            <ExecutionLogs logs={logs} />
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-700/50 bg-slate-900/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                    <p className="text-sm text-slate-400">
                        {progress === 100
                            ? <span className="text-emerald-400 font-medium">✨ Translation complete and saved to Job Archive!</span>
                            : isPausing
                                ? <span className="text-amber-500 font-medium">Stopping after current segment...</span>
                                : !hasStarted
                                    ? <span>Review the prompt and click Start when ready.</span>
                                    : <span>Translating subtitle segments iteratively. You may pause anytime.</span>}
                    </p>
                    <div className="flex gap-3">
                        {!hasStarted ? (
                            <button
                                onClick={() => onStart(customPrompt)}
                                className="px-5 py-2.5 bg-indigo-600/90 text-white hover:bg-indigo-500 rounded-lg transition font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                            >
                                Start Translation
                            </button>
                        ) : progress < 100 && (
                            <button
                                onClick={onPause}
                                disabled={isPausing}
                                className="px-5 py-2.5 bg-rose-600/90 text-white hover:bg-rose-500 rounded-lg transition font-medium shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isPausing ? (
                                    <><Loader2 size={16} className="animate-spin" /> Pausing...</>
                                ) : (
                                    'Pause & Save'
                                )}
                            </button>
                        )}
                        {(progress === 100 || isPausing || !hasStarted) && (
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 bg-slate-700 text-white hover:bg-slate-600 rounded-lg transition font-medium"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TranslationProgressModal;
