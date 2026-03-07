import React from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { useSubtitleContext, TARGET_LANGUAGES } from '../context/SubtitleContext';

export const TranslationControls: React.FC = () => {
    const {
        subtitleFile,
        isTranslating,
        ollamaModels,
        selectedOllamaModel,
        setSelectedOllamaModel,
        targetLanguage,
        setTargetLanguage,
        translationProgress,
        setIsPausing,
        isPausedRef,
        subtitleSegments,
        setSubtitleSegments,
        setShowTranslationModal,
        setHasStartedTranslation
    } = useSubtitleContext();

    const handleStartTranslation = async () => {
        if (!subtitleFile || isTranslating) return;

        let currentSegments = [...subtitleSegments];

        // If segments aren't loaded yet, parse the file
        if (currentSegments.length === 0) {
            try {
                const formData = new FormData();
                formData.append('subtitle_file', subtitleFile);
                const res = await fetch('http://localhost:8000/api/preview-subtitles?group_by_punctuation=false', {
                    method: 'POST', body: formData
                });
                if (res.ok) {
                    const data = await res.json();
                    currentSegments = data.segments;
                    setSubtitleSegments(currentSegments);
                } else {
                    alert('Failed to parse subtitles for translation.');
                    return;
                }
            } catch (err) {
                alert('Error parsing subtitles.');
                return;
            }
        }

        // Open the modal but do not start the loop yet
        setShowTranslationModal(true);
        setHasStartedTranslation(false);
    };

    const handlePauseTranslation = () => {
        isPausedRef.current = true;
        setIsPausing(true);
    };

    if (!subtitleFile) return null;

    return (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
                <Globe size={18} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-200">AI Translation (Optional)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
                Translate your subtitles to another language using local LLModels. You can pause and resume later.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <select
                    value={selectedOllamaModel}
                    onChange={(e) => setSelectedOllamaModel(e.target.value)}
                    disabled={isTranslating}
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                >
                    {ollamaModels.length === 0 && <option value="">Loading models...</option>}
                    {ollamaModels.map((model: string) => (
                        <option key={model} value={model}>{model}</option>
                    ))}
                </select>

                <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    disabled={isTranslating}
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                >
                    {TARGET_LANGUAGES.map((lang: string) => (
                        <option key={lang} value={lang}>{lang}</option>
                    ))}
                </select>

                {isTranslating ? (
                    <button
                        onClick={handlePauseTranslation}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg transition inline-flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-rose-500/20"
                    >
                        <Loader2 size={16} className="animate-spin" />
                        Pause
                    </button>
                ) : (
                    <button
                        onClick={handleStartTranslation}
                        disabled={!selectedOllamaModel}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg transition inline-flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Globe size={16} />
                        {translationProgress > 0 && translationProgress < 100 ? "Resume" : "Translate"}
                    </button>
                )}
            </div>

            {/* Progress Bar */}
            {(isTranslating || (translationProgress > 0 && translationProgress < 100)) && (
                <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Translation Progress</span>
                        <span>{translationProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700/50">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                            style={{ width: `${translationProgress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
