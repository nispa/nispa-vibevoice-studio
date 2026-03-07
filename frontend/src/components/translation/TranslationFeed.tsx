import React from 'react';

interface TranslationFeedProps {
    progress: number;
    currentOriginalText: string;
    currentTranslatedText: string;
    previousOriginalText?: string;
    previousTranslatedText?: string;
}

export const TranslationFeed: React.FC<TranslationFeedProps> = ({
    progress,
    currentOriginalText,
    currentTranslatedText,
    previousOriginalText,
    previousTranslatedText
}) => {
    return (
        <div className="flex-1 flex flex-col overflow-hidden min-h-[300px] md:min-h-0 bg-slate-900/20">
            <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700/30 text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center justify-between">
                <span>Translation Feed</span>
                {progress > 0 && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                        Live Sync
                    </span>
                )}
            </div>
            <div className="flex-1 p-4 md:p-6 flex flex-col gap-5 overflow-y-auto">

                {/* Previous Segment (If exists) */}
                {previousOriginalText && (
                    <div className="opacity-60 hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2">
                        {/* Original */}
                        <div className="bg-slate-900/30 rounded-lg p-3 border border-slate-700/20 relative">
                            <span className="absolute -top-2 left-3 bg-slate-800 px-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-widest rounded shadow-sm text-xs">
                                Previous Original
                            </span>
                            <p className="text-slate-400 text-sm leading-relaxed mt-1">
                                {previousOriginalText}
                            </p>
                        </div>

                        {/* Translated */}
                        <div className="bg-slate-800/20 rounded-lg p-3 border border-slate-700/30 relative shadow-inner">
                            <span className="absolute -top-2 left-3 bg-slate-800 px-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-widest rounded shadow-sm text-xs">
                                Previous Translated
                            </span>
                            <p className="text-slate-300 text-sm leading-relaxed mt-1">
                                {previousTranslatedText}
                            </p>
                        </div>
                    </div>
                )}

                {/* Divider if previous exists */}
                {previousOriginalText && (
                    <div className="flex items-center justify-center -my-1 opacity-40">
                        <div className="w-1 h-3 bg-indigo-500/20 rounded-full" />
                    </div>
                )}

                {/* Current Segment */}
                <div className="flex flex-col gap-3 relative before:absolute before:-inset-2 before:bg-indigo-500/5 before:rounded-xl before:-z-10 before:animate-pulse">
                    {/* Original */}
                    <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-600/40 relative transform transition-all duration-300 hover:scale-[1.01]">
                        <span className="absolute -top-3 left-4 bg-slate-800 px-2 text-[10px] text-slate-300 font-bold uppercase tracking-widest rounded shadow-sm border border-slate-600 text-xs">
                            Working Original
                        </span>
                        <p className="text-slate-200 text-lg leading-relaxed pt-1">
                            {currentOriginalText || <span className="italic text-slate-600">Waiting for text...</span>}
                        </p>
                    </div>

                    {/* Translated */}
                    <div className="bg-indigo-900/30 rounded-xl p-4 border border-indigo-500/30 relative shadow-inner transform transition-all duration-300 hover:scale-[1.01]">
                        <span className="absolute -top-3 left-4 bg-indigo-900 px-2 text-[10px] text-indigo-300 font-bold uppercase tracking-widest rounded shadow-sm border border-indigo-500/50 text-xs">
                            Translating...
                        </span>
                        <p className="text-indigo-100 text-lg leading-relaxed pt-1">
                            {currentTranslatedText || <span className="italic text-indigo-900/40 animate-pulse">Waiting for model reasoning...</span>}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
