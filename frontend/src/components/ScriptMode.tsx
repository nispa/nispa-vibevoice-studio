import { Settings } from 'lucide-react';
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

    return (
        <div className="space-y-6">
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

            <ScriptInputArea />

            <SpeakerVoiceSelector
                speakers={speakers}
                setSpeakers={setSpeakers}
            />

            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-md text-sm">
                    {errorMsg}
                </div>
            )}

            <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
            />

            <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                    onClick={isProcessing ? () => setShowProgressModal(true) : handleGenerate}
                    disabled={(!isProcessing && (!scriptFile && !scriptText.trim())) || speakers.length === 0}
                    className={`btn-primary w-full md:w-auto px-8 text-white ${isProcessing ? 'bg-emerald-600 hover:bg-emerald-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                >
                    <Settings size={18} className={isProcessing ? 'animate-spin' : ''} />
                    {isProcessing ? 'Generating in Background... (View)' : 'Generate Conversation'}
                </button>
            </div>
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

