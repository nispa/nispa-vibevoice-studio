import React from 'react';
import { Settings, Loader2, Activity } from 'lucide-react';
import VoiceSelector from '../../../components/ui/VoiceSelector';
import ModelSelector from '../../../components/ui/ModelSelector';
import { useSubtitleContext } from '../context/SubtitleContext';
import { useGlobalContext } from '../../../context/GlobalContext';

export const GenerationControls: React.FC = () => {
    const { 
        isProcessing, 
        setIsProcessing, 
        setAudioUrl, 
        voices, 
        models 
    } = useGlobalContext();

    const {
        subtitleFile,
        selectedVoiceId,
        setSelectedVoiceId,
        selectedModel,
        setSelectedModel,
        activityLogs,
        setActivityLogs,
        showLogsModal,
        setShowLogsModal,
        currentAudioUrl,
        setCurrentAudioUrl,
        setErrorMsg,
        groupByPunctuation,
        subtitleSegments,
        saveJobDraft,
        generationProgress: progress,
        setGenerationProgress: setProgress,
        currentTaskId,
        setCurrentTaskId,
        cancelGeneration
    } = useSubtitleContext();

    const lastLogRef = React.useRef<string>('');
    const eventSourceRef = React.useRef<EventSource | null>(null);

    const [outputFormat, setOutputFormat] = React.useState<'mp3' | 'wav'>('mp3');

    const handleGenerate = async () => {
        if (!subtitleFile) {
            setErrorMsg("Please upload a .srt or .vtt file first.");
            return;
        }

        if (!selectedVoiceId) {
            setErrorMsg("Please select a voice.");
            return;
        }

        // CONFIRM OVERWRITE
        if (currentAudioUrl) {
            const confirmOverwrite = window.confirm("A generated audio already exists. Starting a new generation will replace it in the current preview. (The file is already saved in the backend outputs folder). Do you want to continue?");
            if (!confirmOverwrite) return;
        }

        setErrorMsg('');
        setIsProcessing(true);
        setAudioUrl(null);
        setActivityLogs([]); 
        setProgress(0);
        lastLogRef.current = '';
        setShowLogsModal(true);

        const addLog = (message: string) => {
            if (message === lastLogRef.current) return;
            lastLogRef.current = message;
            const timestamp = new Date().toLocaleTimeString();
            setActivityLogs(prev => [...prev, `[${timestamp}] ${message}`]);
        };

        const formData = new FormData();
        if (subtitleSegments && subtitleSegments.length > 0) {
            formData.append('subtitle_segments', JSON.stringify(subtitleSegments));
        } else if (subtitleFile) {
            formData.append('subtitle_file', subtitleFile);
        }

        formData.append('voice_id', selectedVoiceId);
        formData.append('model_name', selectedModel);
        formData.append('group_by_punctuation', groupByPunctuation.toString());
        formData.append('output_format', outputFormat);

        try {
            addLog(`Submitting generation task (${outputFormat.toUpperCase()}) to server...`);
            const res = await fetch('http://localhost:8000/api/tasks/generate-subtitles', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "Failed to submit task.");
            }

            const { task_id } = await res.json();
            setCurrentTaskId(task_id);
            addLog(`Task created: ${task_id}. Waiting for progress...`);

            // Connect to EventSource for progress updates
            const eventSource = new EventSource(`http://localhost:8000/api/tasks/${task_id}/stream`);
            eventSourceRef.current = eventSource;

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'progress' || data.type === 'complete') {
                    if (data.status) addLog(data.status);
                    
                    // CRITICAL: Progress calculation must be independent and based on 
                    // current_item / total_items received from the backend.
                    if (data.current_item && data.total_items) {
                        const calcProgress = (data.current_item / data.total_items) * 100;
                        setProgress(calcProgress);
                    } else if (data.progress !== undefined) {
                        // Fallback if specialized fields are missing
                        setProgress(data.progress);
                    }
                }

                if (data.type === 'complete') {
                    eventSource.close();
                    eventSourceRef.current = null;
                    setCurrentTaskId(null);
                    setProgress(100);
                    
                    const byteCharacters = atob(data.audioBase64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'audio/mpeg' });
                    const url = URL.createObjectURL(blob);
                    
                    setCurrentAudioUrl(url);
                    setAudioUrl(url);
                    setIsProcessing(false);
                    addLog('✓ Generation finished.');

                    // Auto-archive
                    if (subtitleSegments.length > 0) {
                        saveJobDraft('Completed generation', subtitleSegments, subtitleFile.name);
                    }
                }

                if (data.type === 'error') {
                    eventSource.close();
                    eventSourceRef.current = null;
                    setCurrentTaskId(null);
                    setErrorMsg(data.message);
                    addLog(`✗ Error: ${data.message}`);
                    setIsProcessing(false);
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
                eventSourceRef.current = null;
                setCurrentTaskId(null);
                setErrorMsg("Lost connection to server while generating.");
                setIsProcessing(false);
            };

        } catch (err: any) {
            const errorMessage = err.message || 'An unexpected error occurred.';
            setErrorMsg(errorMessage);
            addLog(`✗ Submission failed: ${errorMessage}`);
            setIsProcessing(false);
        }
    };

    const handleCancel = async () => {
        const choice = window.confirm(
            "Vuoi scaricare l'audio generato finora prima di interrompere?\n\n" +
            "OK = Scarica audio parziale e interrompi\n" +
            "Annulla = Interrompi senza scaricare nulla"
        );

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        if (choice) {
            // User chose to download partial audio
            await cancelGeneration(true);
            // The audio will be received via SSE and handled by the existing complete logic
        } else {
            // User chose to discard
            await cancelGeneration(false);
            setIsProcessing(false);
        }
    };

    return (
        <>
            {/* 4. Voice Selection (Required) */}
            <VoiceSelector
                voices={voices}
                selectedVoiceId={selectedVoiceId}
                onVoiceSelect={setSelectedVoiceId}
                description="Choose which voice to use for this subtitle."
            />

            {/* 5. Model Selection */}
            <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
            />

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
                {isProcessing && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-blue-400 animate-pulse">
                            <Loader2 size={20} className="animate-spin" />
                            <span className="text-sm font-medium text-slate-300">Generating Audio...</span>
                        </div>
                        <button
                            onClick={handleCancel}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium transition"
                        >
                            Cancel
                        </button>
                    </div>
                )}
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
                <button
                    onClick={handleGenerate}
                    disabled={!subtitleFile || !selectedVoiceId || isProcessing}
                    className="btn-primary w-full md:w-auto px-8"
                >
                    <Settings size={18} />
                    Synchronize Audio
                </button>
            </div>
        </>
    );
};
