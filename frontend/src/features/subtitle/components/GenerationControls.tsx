import React from 'react';
import { Settings, Activity, Music, XCircle } from 'lucide-react';
import VoiceSelector from '../../../components/ui/VoiceSelector';
import ModelSelector from '../../../components/ui/ModelSelector';
import LanguageSelector from '../../../components/ui/LanguageSelector';
import { GenerationProgressDisplay } from './GenerationProgressDisplay';
import { useSubtitleContext } from '../context/SubtitleContext';
import { useGlobalContext } from '../../../context/GlobalContext';
import { useSubtitleGeneration } from '../hooks/useSubtitleGeneration';

/**
 * Component that provides controls for synthesizing audio from subtitles.
 * 
 * Includes voice selection, model selection, output format choice, and 
 * the main action button to trigger the backend generation task.
 * 
 * @returns {JSX.Element} The rendered generation control panel.
 */
export const GenerationControls: React.FC = () => {
    const { 
        voices, 
        models,
        refreshTtsData,
        isLoadingTtsData
    } = useGlobalContext();

    const {
        subtitleFile,
        selectedVoiceId,
        setSelectedVoiceId,
        selectedModel,
        setSelectedModel,
        selectedLanguage,
        setSelectedLanguage,
        activityLogs,
        setShowLogsModal,
        subtitleSegments,
        totalItems,
        currentItems,
        estimatedTime,
        setShowReviewModal
    } = useSubtitleContext();

    const {
        outputFormat,
        setOutputFormat,
        voiceDescription,
        setVoiceDescription,
        supportsVoiceDesign,
        handleGenerate,
        handleCancel,
        isProcessing
    } = useSubtitleGeneration();

    return (
        <>
            {/* 4. Voice Selection (Required) */}
            <VoiceSelector
                voices={voices}
                selectedVoiceId={selectedVoiceId}
                onVoiceSelect={setSelectedVoiceId}
                onRefresh={refreshTtsData}
                isLoading={isLoadingTtsData}
                description="Choose which voice to use for this subtitle."
            />

            {/* 5. Model Selection */}
            <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
            />

            {/* 6. Language Selection */}
            <LanguageSelector 
                selectedLanguage={selectedLanguage}
                onLanguageSelect={setSelectedLanguage}
            />

            {/* Voice Design (Conditional) */}
            {supportsVoiceDesign && (
                <div className="bg-indigo-500/5 rounded-lg p-5 border border-indigo-500/20 space-y-3">
                    <div className="flex items-center gap-2">
                        <Activity size={18} className="text-indigo-400" />
                        <h4 className="font-medium text-slate-200">Voice Design</h4>
                    </div>
                    <p className="text-xs text-slate-400">Describe the voice you want (e.g., "a deep, warm male voice with a calm tone").</p>
                    <textarea
                        value={voiceDescription}
                        onChange={(e) => setVoiceDescription(e.target.value)}
                        placeholder="Enter voice description..."
                        className="input-style w-full h-20 resize-none bg-slate-900/50 text-sm"
                    />
                </div>
            )}

            {/* 6. Output Format */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Output Format</h4>
                </div>
                <div className="flex gap-3">
                    {(['mp3', 'wav'] as const).map((fmt) => (
                        <button
                            key={fmt}
                            onClick={() => setOutputFormat(fmt)}
                            className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                                outputFormat === fmt
                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                    : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                        >
                            {fmt.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Action */}
            <div className="pt-4 border-t border-slate-800 flex justify-end items-center gap-4">
                <GenerationProgressDisplay 
                    current={currentItems}
                    total={totalItems}
                    eta={estimatedTime}
                    isProcessing={isProcessing}
                    variant="compact"
                />
                
                {activityLogs.length > 0 && (
                    <button
                        onClick={() => setShowLogsModal(true)}
                        title="Visualizza dettagli operazione"
                        className={`px-4 py-2 flex items-center gap-2 rounded-lg border transition-all duration-300 ${
                            isProcessing 
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        <Activity size={18} className={isProcessing ? 'animate-pulse' : ''} />
                        <span className="text-sm font-medium">
                            {isProcessing ? 'In corso...' : 'Dettagli Operazione'}
                        </span>
                    </button>
                )}

                {subtitleSegments.some(s => s.audioUrl || s.audioBase64) && (
                    <button
                        onClick={() => setShowReviewModal(true)}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                    >
                        <Music size={18} />
                        Review Audio ({subtitleSegments.filter(s => s.audioUrl || s.audioBase64).length})
                    </button>
                )}

                {isProcessing ? (
                    <button
                        onClick={handleCancel}
                        className="px-6 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                    >
                        <XCircle size={18} />
                        Cancel
                    </button>
                ) : (
                    <button
                        onClick={handleGenerate}
                        disabled={!subtitleFile || !selectedVoiceId || isProcessing}
                        className="btn-primary w-full md:w-auto px-8"
                    >
                        <Settings size={18} />
                        Generate Voice-over
                    </button>
                )}
            </div>
        </>
    );
};
