import React from 'react';
import { Settings, Activity, Music, XCircle } from 'lucide-react';
import VoiceSelector from '../../../components/ui/VoiceSelector';
import ModelSelector from '../../../components/ui/ModelSelector';
import LanguageSelector from '../../../components/ui/LanguageSelector';
import { GenerationProgressDisplay } from './GenerationProgressDisplay';
import { useSubtitleContext } from '../context/SubtitleContext';
import type { SubtitleSegment } from '../context/SubtitleContext';
import { useGlobalContext } from '../../../context/GlobalContext';
import { ttsApi } from '../../../services/ttsApi';
import { API_BASE_URL } from '../../../services/apiClient';
import { base64ToBlobUrl } from '../../../utils/audio';
import { showConfirm } from '../../../utils/uiEvents';
import type { SseMessage, SseNewSegment } from '../../../types/sse';
import type { GeneratedSegment } from '../../../types/generated';

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
        isProcessing, 
        setIsProcessing, 
        setAudioUrl, 
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
        addLog,
        clearLogs,
        currentAudioUrl,
        setCurrentAudioUrl,
        setErrorMsg,
        groupByPunctuation,
        subtitleSegments,
        setSubtitleSegments,
        saveJobDraft,
        setGenerationProgress: setProgress,
        setGeneratedSegments,
        setCurrentTaskId,
        cancelGeneration,
        updateItemProgress,
        recordStartTime,
        resetProgress,
        totalItems,
        currentItems,
        estimatedTime,
        setShowReviewModal
    } = useSubtitleContext();

    const eventSourceRef = React.useRef<EventSource | null>(null);

    const [outputFormat, setOutputFormat] = React.useState<'mp3' | 'wav'>('mp3');
    const [voiceDescription, setVoiceDescription] = React.useState<string>('');

    /** Persists the active task to sessionStorage so it survives a page refresh. */
    const persistActiveTask = React.useCallback((taskId: string, jobId: number | null) => {
        sessionStorage.setItem('nispa_task_id', taskId);
        if (jobId != null) sessionStorage.setItem('nispa_job_id', String(jobId));
    }, []);

    /** Clears the persisted task from sessionStorage. */
    const clearPersistedTask = React.useCallback(() => {
        sessionStorage.removeItem('nispa_task_id');
        sessionStorage.removeItem('nispa_job_id');
    }, []);

    /** Connects an EventSource to an existing task_id and sets processing state. */
    const connectToTask = React.useCallback((task_id: string) => {
        if (eventSourceRef.current) return; // already connected
        setIsProcessing(true);
        setCurrentTaskId(task_id);
        setShowLogsModal(true);
        addLog(`Reconnecting to task ${task_id}...`);

        const eventSource = new EventSource(ttsApi.taskStreamUrl(task_id));
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data) as SseMessage;
            if (data.type === 'progress' || data.type === 'complete') {
                if (data.status) addLog(data.status);
                if (data.new_segments && data.new_segments.length > 0) {
                    const newPreviewSegments: GeneratedSegment[] = data.new_segments!.map((seg: SseNewSegment) => ({
                        index: seg.index, text: seg.text,
                        audioUrl: base64ToBlobUrl(seg.audio_b64), audioBase64: seg.audio_b64,
                        voice_id: seg.voice_id, model_name: seg.model_name, language: seg.language
                    }));
                    setGeneratedSegments(prev => [...prev, ...newPreviewSegments]);
                    setSubtitleSegments((prev: SubtitleSegment[]) => {
                        const updated = [...prev];
                        newPreviewSegments.forEach((newSeg: GeneratedSegment) => {
                            const idx = updated.findIndex(s => s.index === newSeg.index);
                            if (idx !== -1) updated[idx] = { ...updated[idx], audioUrl: newSeg.audioUrl, audioBase64: newSeg.audioBase64, voice_id: newSeg.voice_id, model_name: newSeg.model_name, language: newSeg.language };
                        });
                        return updated;
                    });
                }
                if (data.current_item != null && data.total_items != null) {
                    updateItemProgress(data.current_item, data.total_items);
                } else if (data.progress !== undefined) {
                    setProgress(data.progress);
                }
            }
            if (data.type === 'complete') {
                eventSource.close(); eventSourceRef.current = null;
                setCurrentTaskId(null); clearPersistedTask();
                setProgress(100);
                const url = data.audioUrl ? `${API_BASE_URL}${data.audioUrl}` : null;
                setCurrentAudioUrl(url); setAudioUrl(url); setIsProcessing(false);
                addLog('✓ Generation finished.');
                if (subtitleSegments.length > 0) saveJobDraft('Completed generation', subtitleSegments, subtitleFile?.name);
                setTimeout(() => setShowReviewModal(true), 500);
            }
            if (data.type === 'error') {
                eventSource.close(); eventSourceRef.current = null;
                setCurrentTaskId(null); clearPersistedTask();
                setErrorMsg(data.message || 'Generation error'); addLog(`✗ Error: ${data.message || 'Generation error'}`); setIsProcessing(false);
            }
        };
        eventSource.onerror = () => {
            eventSource.close(); eventSourceRef.current = null;
            setCurrentTaskId(null); clearPersistedTask();
            setErrorMsg("Lost connection to server while generating."); setIsProcessing(false);
        };
    }, [addLog, setIsProcessing, setCurrentTaskId, setShowLogsModal, setGeneratedSegments,
        setSubtitleSegments, updateItemProgress, setProgress, setCurrentAudioUrl, setAudioUrl,
        setErrorMsg, setShowReviewModal, saveJobDraft, subtitleSegments, subtitleFile, clearPersistedTask]);

    /** On mount: check if there's an active task in the backend and reconnect. */
    React.useEffect(() => {
        const savedTaskId = sessionStorage.getItem('nispa_task_id');
        if (!savedTaskId) return;
        ttsApi.getActiveTask().then(res => {
            if (res.active && res.task_id === savedTaskId) {
                connectToTask(savedTaskId);
            } else {
                clearPersistedTask();
            }
        }).catch(() => clearPersistedTask());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedModelData = models.find(m => m.id === selectedModel);
    const supportsVoiceDesign = selectedModelData?.supports_voice_design || false;

    /**
     * Submits the generation task to the backend and sets up an SSE stream for progress.
     */
    const handleGenerate = async () => {
        if (!subtitleFile) {
            setErrorMsg("Please upload a .srt or .vtt file first.");
            return;
        }

        if (!selectedVoiceId) {
            setErrorMsg("Please select a voice.");
            return;
        }

        if (selectedModelData?.requires_transcript) {
            const voice = voices.find(v => v.id === selectedVoiceId);
            if (!voice?.transcription?.trim()) {
                setErrorMsg(`The selected model (${selectedModelData.name}) requires a voice with a verified transcript (.txt). Please add a transcript in Voice Management first.`);
                return;
            }
        }

        // CONFIRM OVERWRITE
        if (currentAudioUrl) {
            const confirmOverwrite = await showConfirm({
                title: 'Replace existing audio?',
                message: 'A generated audio already exists. Starting a new generation will replace the current preview. The file is already saved in the outputs folder.',
                confirmLabel: 'Continue',
                cancelLabel: 'Cancel',
            });
            if (!confirmOverwrite) return;
        }

        setErrorMsg('');
        setIsProcessing(true);
        setAudioUrl(null);
        clearLogs();
        setProgress(0);
        setGeneratedSegments([]);
        setShowLogsModal(true);
        resetProgress();

        // AUTO-SAVE BEFORE GENERATION
        let currentJobId: number | null = null;
        try {
            currentJobId = await saveJobDraft('Initial save before generation', undefined, undefined, true);
        } catch (err) {
            console.warn("Failed to perform initial save:", err);
        }

        const formData = new FormData();
        
        if (currentJobId) {
            // BEST PRACTICE: If we have a saved job, just pass the ID.
            // The backend will fetch the segments directly from the database,
            // avoiding massive JSON payload uploads.
            formData.append('job_id', currentJobId.toString());
        } else if (subtitleSegments && subtitleSegments.length > 0) {
            // Fallback: send segments, but strip heavy base64 to avoid 1MB limits
            const strippedSegments = subtitleSegments.map(s => {
                const rest = { ...s };
                delete rest.audioBase64;
                return rest;
            });
            formData.append('subtitle_segments', JSON.stringify(strippedSegments));
        } else if (subtitleFile) {
            formData.append('subtitle_file', subtitleFile);
        }

        formData.append('voice_id', selectedVoiceId);
        formData.append('model_name', selectedModel);
        formData.append('group_by_punctuation', groupByPunctuation.toString());
        formData.append('output_format', outputFormat);
        formData.append('language', selectedLanguage);
        
        if (supportsVoiceDesign && voiceDescription) {
            formData.append('voice_description', voiceDescription);
        }

        try {
            addLog(`Submitting generation task (${outputFormat.toUpperCase()}) to server...`);
            const { task_id } = await ttsApi.submitGenerationTask(formData);
            setCurrentTaskId(task_id);
            persistActiveTask(task_id, currentJobId);
            addLog(`Task created: ${task_id}. Waiting for progress...`);

            // Connect to EventSource for progress updates
            const eventSource = new EventSource(ttsApi.taskStreamUrl(task_id));
            eventSourceRef.current = eventSource;

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data) as SseMessage;

                if (data.type === 'progress' || data.type === 'complete') {
                    if (data.status) addLog(data.status);
                    
                    // Handle new segments for preview and UPDATE CONTEXT
                    if (data.new_segments && data.new_segments.length > 0) {
                        const newPreviewSegments: GeneratedSegment[] = data.new_segments!.map((seg: SseNewSegment) => ({
                            index: seg.index,
                            text: seg.text,
                            audioUrl: base64ToBlobUrl(seg.audio_b64),
                            audioBase64: seg.audio_b64,
                            voice_id: seg.voice_id,
                            model_name: seg.model_name,
                            language: seg.language
                        }));

                        setGeneratedSegments(prev => [...prev, ...newPreviewSegments]);

                        // CRITICAL: Update the main subtitleSegments so that they can be saved/resumed
                        // We find each segment by index and attach its audioUrl AND metadata
                        setSubtitleSegments((prev: SubtitleSegment[]) => {
                            const updated = [...prev];
                            newPreviewSegments.forEach((newSeg: GeneratedSegment) => {
                                const idx = updated.findIndex(s => s.index === newSeg.index);
                                if (idx !== -1) {
                                    updated[idx] = { 
                                        ...updated[idx], 
                                        audioUrl: newSeg.audioUrl,
                                        audioBase64: newSeg.audioBase64,
                                        voice_id: newSeg.voice_id,
                                        model_name: newSeg.model_name,
                                        language: newSeg.language
                                    };
                                }
                            });
                            return updated;
                        });
                    }

                    // Progress calculation based on current_item / total_items from backend.
                    if (data.current_item != null && data.total_items != null) {
                        // Start the ETA clock on the first real segment
                        if (data.current_item === 1) recordStartTime();
                        updateItemProgress(data.current_item, data.total_items);
                    } else if (data.progress !== undefined) {
                        setProgress(data.progress);
                    }
                }

                if (data.type === 'complete') {
                    eventSource.close();
                    eventSourceRef.current = null;
                    setCurrentTaskId(null);
                    clearPersistedTask();
                    setProgress(100);
                    
                    const url = data.audioUrl ? `${API_BASE_URL}${data.audioUrl}` : null;

                    setCurrentAudioUrl(url);
                    setAudioUrl(url);
                    setIsProcessing(false);
                    addLog('✓ Generation finished.');

                    // Auto-archive
                    if (subtitleSegments.length > 0) {
                        saveJobDraft('Completed generation', subtitleSegments, subtitleFile?.name);
                    }
                    
                    // OPEN REVIEW MODAL
                    setTimeout(() => {
                        setShowReviewModal(true);
                    }, 500);
                }

                if (data.type === 'error') {
                    eventSource.close();
                    eventSourceRef.current = null;
                    setCurrentTaskId(null);
                    clearPersistedTask();
                    setErrorMsg(data.message || 'Generation error');
                    addLog(`✗ Error: ${data.message || 'Generation error'}`);
                    setIsProcessing(false);
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
                eventSourceRef.current = null;
                setCurrentTaskId(null);
                clearPersistedTask();
                setErrorMsg("Lost connection to server while generating.");
                setIsProcessing(false);
            };

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
            setErrorMsg(errorMessage);
            addLog(`✗ Submission failed: ${errorMessage}`);
            setIsProcessing(false);
        }
    };

    /**
     * Handles user request to cancel the generation task, with optional partial download.
     */
    const handleCancel = async () => {
        const choice = await showConfirm({
            title: 'Cancel generation?',
            message: 'Do you want to keep the audio generated so far, or discard everything?',
            confirmLabel: 'Keep partial audio',
            cancelLabel: 'Discard everything',
        });

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        try {
            if (choice) {
                // User chose to download partial audio
                await cancelGeneration(true);
                // The audio will be received via SSE and handled by the existing complete logic
            } else {
                // User chose to discard
                await cancelGeneration(false);
                setIsProcessing(false);
            }
            
            // NOTE: We no longer need to call saveJobDraft here.
            // The backend is now saving segments incrementally directly to the database.
            // A simple refresh of the job list or reloading the page will show the saved segments.
            console.log("[GenerationControls] Task cancelled. Segments were saved in real-time by the backend.");
            
        } catch (err) {
            console.error("Error during cancel:", err);
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
