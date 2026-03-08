import { Settings, FileText, UserCheck, AudioWaveform } from 'lucide-react';
import SpeakerVoiceSelector from './SpeakerVoiceSelector';
import GenerationProgressModal from './GenerationProgressModal';
import ModelSelector from './ui/ModelSelector';
import { ScriptProvider, useScriptContext } from '../features/script/context/ScriptContext';
import { useScriptGeneration } from '../hooks/useScriptGeneration';
import ScriptInputArea from './script/ScriptInputArea';
import { useGlobalContext } from '../context/GlobalContext';

function ScriptModeInner() {
    const { isProcessing } = useGlobalContext();
    const {
        scriptFile, scriptText, speakers, setSpeakers,
        models, selectedModel, setSelectedModel, errorMsg
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

export default function ScriptMode() {
    return (
        <ScriptProvider>
            <ScriptModeInner />
        </ScriptProvider>
    );
}
