import React from 'react';
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
 * Custom hook to manage subtitle audio generation workflow:
 * - Session task recovery on page reload
 * - Validation of inputs, transcript requirements, and installed status
 * - Task submission, progress tracking via Server-Sent Events (SSE)
 * - Real-time segment updates and cancellation
 */
export const useSubtitleGeneration = () => {
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
        selectedModel,
        selectedLanguage,
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
        setShowReviewModal
    } = useSubtitleContext();

    const eventSourceRef = React.useRef<EventSource | null>(null);
    const [outputFormat, setOutputFormat] = React.useState<'mp3' | 'wav'>('mp3');
    const [voiceDescription, setVoiceDescription] = React.useState<string>('');

    const selectedModelData = models.find(m => m.id === selectedModel);
    const supportsVoiceDesign = selectedModelData?.supports_voice_design || false;

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

    /**
     * Subscribes to SSE progress stream for an active task.
     */
    const subscribeToTaskStream = React.useCallback((taskId: string) => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const eventSource = new EventSource(ttsApi.taskStreamUrl(taskId));
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data) as SseMessage;

            if (data.type === 'progress' || data.type === 'complete') {
                if (data.status) addLog(data.status);

                if (data.new_segments && data.new_segments.length > 0) {
                    const newPreviewSegments: GeneratedSegment[] = data.new_segments.map((seg: SseNewSegment) => ({
                        index: seg.index,
                        text: seg.text,
                        audioUrl: base64ToBlobUrl(seg.audio_b64),
                        audioBase64: seg.audio_b64,
                        voice_id: seg.voice_id,
                        model_name: seg.model_name,
                        language: seg.language
                    }));

                    setGeneratedSegments(prev => [...prev, ...newPreviewSegments]);

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

                if (data.current_item != null && data.total_items != null) {
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

                if (subtitleSegments.length > 0) {
                    saveJobDraft('Completed generation', subtitleSegments, subtitleFile?.name);
                }

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
    }, [
        addLog,
        clearPersistedTask,
        recordStartTime,
        saveJobDraft,
        setAudioUrl,
        setCurrentAudioUrl,
        setCurrentTaskId,
        setErrorMsg,
        setGeneratedSegments,
        setIsProcessing,
        setProgress,
        setShowReviewModal,
        setSubtitleSegments,
        subtitleFile?.name,
        subtitleSegments,
        updateItemProgress
    ]);

    /** Connects to an existing task */
    const connectToTask = React.useCallback((taskId: string) => {
        if (eventSourceRef.current) return;
        setIsProcessing(true);
        setCurrentTaskId(taskId);
        setShowLogsModal(true);
        addLog(`Reconnecting to task ${taskId}...`);
        subscribeToTaskStream(taskId);
    }, [addLog, setCurrentTaskId, setIsProcessing, setShowLogsModal, subscribeToTaskStream]);

    /** On mount: check if active task exists in backend and reconnect */
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

    /**
     * Submits the generation task to backend.
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

        if (selectedModelData?.installed === false) {
            setErrorMsg(`The selected model (${selectedModelData.name}) is not installed yet. Please open the Models Manager or run download_model.py to install it.`);
            return;
        }

        if (selectedModelData?.requires_transcript) {
            const voice = voices.find(v => v.id === selectedVoiceId);
            if (!voice?.transcription?.trim()) {
                setErrorMsg(`The selected model (${selectedModelData.name}) requires a voice with a verified transcript (.txt). Please add a transcript in Voice Management first.`);
                return;
            }
        }

        // Confirm overwrite if audio already exists
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

        // Save job draft before generation
        let currentJobId: number | null = null;
        try {
            currentJobId = await saveJobDraft('Initial save before generation', undefined, undefined, true);
        } catch (err) {
            console.warn("Failed to perform initial save:", err);
        }

        const formData = new FormData();

        if (currentJobId) {
            formData.append('job_id', currentJobId.toString());
        } else if (subtitleSegments && subtitleSegments.length > 0) {
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

            subscribeToTaskStream(task_id);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
            setErrorMsg(errorMessage);
            addLog(`✗ Submission failed: ${errorMessage}`);
            setIsProcessing(false);
        }
    };

    /**
     * Cancels generation task.
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
                await cancelGeneration(true);
            } else {
                await cancelGeneration(false);
                setIsProcessing(false);
            }
        } catch (err) {
            console.error("Error during cancel:", err);
            setIsProcessing(false);
        }
    };

    return {
        outputFormat,
        setOutputFormat,
        voiceDescription,
        setVoiceDescription,
        supportsVoiceDesign,
        handleGenerate,
        handleCancel,
        isProcessing
    };
};
