import { Settings, FileText, UserCheck, AudioWaveform } from 'lucide-react';
import SpeakerVoiceSelector from './SpeakerVoiceSelector';
import GenerationProgressModal from './GenerationProgressModal';
import ModelSelector from './ui/ModelSelector';
import LanguageSelector from './ui/LanguageSelector';
import { ScriptProvider, useScriptContext } from '../features/script/context/ScriptContext';
import { useScriptGeneration } from '../hooks/useScriptGeneration';
import ScriptInputArea from './script/ScriptInputArea';
import { useGlobalContext } from '../context/GlobalContext';

/**
 * Internal component for Script Mode.
 * 
 * Manages the workflow for untimed script generation:
 * 1. Script Input (Paste or Upload)
 * 2. Speaker Mapping (Assigning voices to detected speakers)
 * 3. Generation (Model selection and synthesis)
 * 
 * @returns {JSX.Element} The rendered script mode UI.
 */
function ScriptModeInner() {
    const { isProcessing, models } = useGlobalContext();
    const {
        scriptFile, scriptText, speakers, setSpeakers,
        selectedModel, setSelectedModel, 
        selectedLanguage, setSelectedLanguage,
        voiceDescription, setVoiceDescription,
        errorMsg
    } = useScriptContext();

    const {
        showProgressModal, setShowProgressModal,
        progressMessages, setProgressMessages,
        progressValue, setProgressValue,
        handleGenerate, handleCancelGeneration
    } = useScriptGeneration();

    const hasInput = scriptFile || scriptText.trim().length > 0;

    return (
        <div className="space-y-8 animate-fade-in">
            <GenerationProgressModal
                isOpen={showProgressModal}
                onClose={() => {
                    setShowProgressModal(false);
                    if (progressValue === 100 || !isProcessing) {
                        setProgressMessages([]);
                        setProgressValue(0);
                    }
                }}
                onCancel={handleCancelGeneration}
                progress={progressValue}
                logs={progressMessages}
            />

            {/* SECTION 1: INPUT STAGE */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <FileText size={18} className="text-indigo-400" />
                    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Step 1: Script Input</h3>
                </div>
                <ScriptInputArea />
            </div>

            {/* SECTION 2: SPEAKER CONFIGURATION (Visible once input is present) */}
            {hasInput && (
                <div className="space-y-6 pt-4 border-t border-slate-700/30">
                    <div className="flex items-center gap-2 px-1">
                        <UserCheck size={18} className="text-emerald-400" />
                        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Step 2: Speaker Voice Mapping</h3>
                    </div>
                    
                    <div className="bg-slate-800/20 border border-slate-700/50 rounded-xl p-6 shadow-inner">
                        <SpeakerVoiceSelector
                            speakers={speakers}
                            setSpeakers={setSpeakers}
                        />
                        {errorMsg && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-md text-sm mt-4">
                                {errorMsg}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SECTION 3: MODEL & GENERATION (Visible once input is present) */}
            {hasInput && (
                <div className="space-y-6 pt-4 border-t border-slate-700/30">
                    <div className="flex items-center gap-2 px-1">
                        <AudioWaveform size={18} className="text-indigo-400" />
                        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Step 3: Model & Final Synthesis</h3>
                    </div>
                    
                    <div className="bg-slate-800/20 border border-slate-700/50 rounded-xl p-6 shadow-inner space-y-6">
                        <ModelSelector
                            models={models}
                            selectedModel={selectedModel}
                            onModelSelect={setSelectedModel}
                        />

                        <LanguageSelector 
                            selectedLanguage={selectedLanguage}
                            onLanguageSelect={setSelectedLanguage}
                        />

                        {/* Voice Design (Conditional) */}
                        {models.find(m => m.id === selectedModel)?.supports_voice_design && (
                            <div className="bg-indigo-500/5 rounded-lg p-5 border border-indigo-500/20 space-y-3">
                                <div className="flex items-center gap-2">
                                    <AudioWaveform size={18} className="text-indigo-400" />
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

                        <div className="flex justify-end pt-4 border-t border-slate-700/30">
                            <button
                                onClick={isProcessing ? () => setShowProgressModal(true) : handleGenerate}
                                disabled={(!isProcessing && !hasInput) || speakers.length === 0}
                                className={`px-8 py-3 rounded-lg transition font-bold text-white shadow-lg flex items-center justify-center gap-2 w-full md:w-auto ${
                                    isProcessing 
                                    ? 'bg-emerald-600 hover:bg-emerald-500 animate-pulse shadow-emerald-500/20' 
                                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
                                }`}
                            >
                                <Settings size={18} className={isProcessing ? 'animate-spin' : ''} />
                                {isProcessing ? 'Generating in Background... (View)' : 'Generate Conversation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Script Mode entry point.
 * Wraps the script workflow with the ScriptProvider context.
 */
export default function ScriptMode() {
    return (
        <ScriptProvider>
            <ScriptModeInner />
        </ScriptProvider>
    );
}
