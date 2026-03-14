import React, { useState } from 'react';
import { Globe, Loader2, Info, Edit3, Save, Trash2, CheckCircle } from 'lucide-react';
import { useSubtitleContext, TARGET_LANGUAGES } from '../context/SubtitleContext';
import { useTranslationContext } from '../context/TranslationContext';

import { ProgressBar } from '../../../components/ui/ProgressBar';

export const TranslationControls: React.FC = () => {
    const {
        subtitleFile,
        subtitleSegments,
        setSubtitleSegments,
        groupByPunctuation,
        loadedJobId,
        updateJob,
        setShowEditor
    } = useSubtitleContext();

    const {
        isTranslating,
        ollamaModels,
        selectedOllamaModel,
        setSelectedOllamaModel,
        sourceLanguage,
        setSourceLanguage,
        targetLanguage,
        setTargetLanguage,
        translationProgress,
        setIsPausing,
        isPausedRef,
        setShowTranslationModal,
        setHasStartedTranslation,
        setTranslationProgress
    } = useTranslationContext();

    const [isSaving, setIsSaving] = useState(false);
    const [customTargetCode, setCustomTargetCode] = useState('');
    const [customSourceCode, setCustomSourceCode] = useState('');

    // Detect if already translated
    const isTranslated = subtitleSegments.length > 0 && subtitleSegments.some(s => s.is_translated);

    // Extract code if it's in the format "Language (code)"
    const getEffectiveCode = (lang: string, custom: string) => {
        if (lang === 'Other (Custom Code)') return custom;
        const match = lang.match(/\(([^)]+)\)/);
        return match ? match[1] : lang;
    };

    const effectiveTarget = getEffectiveCode(targetLanguage, customTargetCode);
    const effectiveSource = getEffectiveCode(sourceLanguage, customSourceCode);

    const handleStartTranslation = async () => {
        if (!subtitleFile || isTranslating) return;
        
        if (targetLanguage === 'Other (Custom Code)' && !customTargetCode) {
            alert("Please enter a custom target NLLB language code (e.g., 'ita_Latn')");
            return;
        }
        if (sourceLanguage === 'Other (Custom Code)' && !customSourceCode) {
            alert("Please enter a custom source NLLB language code (e.g., 'eng_Latn')");
            return;
        }

        setShowTranslationModal(true);
        setHasStartedTranslation(false);
    };

    const handlePauseTranslation = () => {
        isPausedRef.current = true;
        setIsPausing(true);
    };

    const handleClearTranslation = () => {
        if (confirm("Are you sure you want to clear the translation and start over?")) {
            const clearedSegments = subtitleSegments.map(seg => ({
                ...seg,
                text: seg.original_text || seg.text,
                is_translated: false
            }));
            setSubtitleSegments(clearedSegments);
            setTranslationProgress(0);
        }
    };

    const handleSaveTranslatedDraft = async () => {
        if (!loadedJobId) {
            alert("No job loaded to save into. Use 'Save as Draft' in Section 2 first if you want to create a new archive record.");
            return;
        }

        setIsSaving(true);
        try {
            await updateJob(loadedJobId, {
                modified_segments: subtitleSegments,
                notes: `Translated using ${selectedOllamaModel} to ${targetLanguage}`
            });
            alert("Translated segments saved to job archive!");
        } catch (err) {
            alert("Failed to save translated draft.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!subtitleFile) return null;

    return (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Globe size={18} className={`${isTranslated ? 'text-emerald-400' : 'text-indigo-400'}`} />
                    <h3 className="text-sm font-semibold text-slate-200">
                        {isTranslated ? "Translation Active" : "AI Translation (Optional)"}
                    </h3>
                </div>
                {isTranslated && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">
                        <CheckCircle size={12} /> Ready
                    </span>
                )}
            </div>
            
            <p className="text-xs text-slate-500 mb-4">
                {isTranslated 
                    ? "Subtitles are translated. You can edit them or clear to start over."
                    : "Translate your subtitles to another language using the integrated offline engine."}
            </p>

            {/* Model & Language Selection - Hidden if already translated (optional, user asked to obscure it) */}
            {!isTranslated && (
                <>
                    <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg flex items-start gap-2">
                        <Info size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                        <div className="text-[10px] sm:text-xs text-slate-300 leading-relaxed">
                            <p className="font-semibold text-indigo-300 mb-1">💡 AI Engines:</p>
                            <p>Supports <span className="text-emerald-400 font-mono">NLLB-200</span> (internal) and <span className="text-indigo-400 font-mono">Ollama</span>. 
                            Better results after using <span className="text-amber-400 font-bold">Intelligent Grouping</span>.</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mb-3">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Model</label>
                                <select
                                    value={selectedOllamaModel}
                                    onChange={(e) => setSelectedOllamaModel(e.target.value)}
                                    disabled={isTranslating}
                                    className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                                >
                                    {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Source</label>
                                <select
                                    value={sourceLanguage}
                                    onChange={(e) => setSourceLanguage(e.target.value)}
                                    disabled={isTranslating}
                                    className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                                >
                                    {TARGET_LANGUAGES.map((lang: string) => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Target</label>
                                <select
                                    value={targetLanguage}
                                    onChange={(e) => setTargetLanguage(e.target.value)}
                                    disabled={isTranslating}
                                    className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                                >
                                    {TARGET_LANGUAGES.map((lang: string) => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {(sourceLanguage === 'Other (Custom Code)' || targetLanguage === 'Other (Custom Code)') && (
                            <div className="grid grid-cols-2 gap-3 animate-fade-in">
                                {sourceLanguage === 'Other (Custom Code)' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Src NLLB Code</label>
                                        <input
                                            type="text"
                                            placeholder="eng_Latn"
                                            value={customSourceCode}
                                            onChange={(e) => setCustomSourceCode(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                )}
                                {targetLanguage === 'Other (Custom Code)' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Tgt NLLB Code</label>
                                        <input
                                            type="text"
                                            placeholder="ita_Latn"
                                            value={customTargetCode}
                                            onChange={(e) => setCustomTargetCode(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {isTranslating ? (
                            <button
                                onClick={handlePauseTranslation}
                                className="px-4 py-2.5 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg transition inline-flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-rose-500/20"
                            >
                                <Loader2 size={16} className="animate-spin" />
                                Pause
                            </button>
                        ) : (
                            <button
                                onClick={handleStartTranslation}
                                className="px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg transition inline-flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                            >
                                <Globe size={16} />
                                {translationProgress > 0 && translationProgress < 100 ? "Resume" : "Translate Subtitles"}
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* Translated State UI */}
            {isTranslated && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setShowEditor(true)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition"
                        >
                            <Edit3 size={14} /> Edit Translate
                        </button>
                        <button
                            onClick={handleSaveTranslatedDraft}
                            disabled={isSaving}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Save as Draft Translated
                        </button>
                    </div>
                    <button
                        onClick={handleClearTranslation}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition"
                    >
                        <Trash2 size={14} /> Clear / New Translation
                    </button>
                    <p className="text-[10px] text-slate-500 text-center italic">
                        Model used: {selectedOllamaModel} • Target: {targetLanguage}
                    </p>
                </div>
            )}

            {/* Warning if grouping is off */}
            {!isTranslated && !groupByPunctuation && (
                <p className="text-[10px] text-amber-500/80 italic mb-2">
                    * Hint: Grouping is currently disabled. Subtitles might be too short for optimal translation.
                </p>
            )}

            {/* Progress Bar (Only during translation) */}
            {(isTranslating || (translationProgress > 0 && translationProgress < 100)) && (
                <div className="mt-3">
                    <ProgressBar 
                        progress={translationProgress} 
                        label="Translation Progress"
                        containerClassName="bg-slate-900"
                        barClassName="bg-indigo-500"
                    />
                </div>
            )}
        </div>
    );
};
