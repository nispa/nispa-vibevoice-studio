import { useState, useRef } from 'react';
import { useScriptContext } from '../features/script/context/ScriptContext';
import { useGlobalContext } from '../context/GlobalContext';

/**
 * Custom hook to manage the script-based audio generation workflow.
 * 
 * Handles state for the progress modal, SSE stream consumption for real-time updates,
 * and communication with the backend for generation and cancellation.
 * 
 * @returns {object} An object containing state and handlers for script generation.
 */
export const useScriptGeneration = () => {
    const { 
        scriptFile, scriptText, speakers, 
        selectedModel, selectedLanguage, 
        voiceDescription, setErrorMsg 
    } = useScriptContext();
    const { setIsProcessing, setAudioUrl, models } = useGlobalContext();

    const [showProgressModal, setShowProgressModal] = useState(false);
    const [progressMessages, setProgressMessages] = useState<string[]>([]);
    const [progressValue, setProgressValue] = useState(0);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Internal handler to process individual messages from the SSE stream.
     * 
     * @param {any} message - The parsed message from the SSE stream.
     */
    const handleProgressMessage = (message: any) => {
        const timestamp = new Date().toLocaleTimeString();

        if (message.type === 'progress') {
            if (message.current_item && message.total_items) {
                const calcProgress = (message.current_item / message.total_items) * 100;
                setProgressValue(calcProgress);
            } else if (message.progress !== undefined) {
                setProgressValue(message.progress);
            }
            
            if (message.status) {
                setProgressMessages(prev => [...prev, `[${timestamp}] ${message.status}`]);
            }
        } else if (message.type === 'complete' && message.audioBase64) {
            setProgressValue(100);
            setProgressMessages(prev => [...prev, `[${timestamp}] ✓ Complete!`]);

            const binaryString = atob(message.audioBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);

            setTimeout(() => {
                setShowProgressModal(false);
            }, 1000);
        } else if (message.type === 'error') {
            setProgressMessages(prev => [...prev, `[${timestamp}] ✗ Error: ${message.message}`]);
            setErrorMsg(message.message || 'An unexpected error occurred');
        }
    };

    /**
     * Initiates the script generation process by sending a request to the backend.
     * Validates script content and speaker mappings before starting.
     */
    const handleGenerate = async () => {
        const scriptContent = scriptFile || scriptText.trim();

        if (!scriptContent) {
            setErrorMsg("Please upload a script file or paste script text.");
            return;
        }

        if (speakers.length === 0) {
            setErrorMsg("No speakers detected in the script.");
            return;
        }

        const missingSpeakers = speakers.filter(s => !s.voiceId);
        if (missingSpeakers.length > 0) {
            setErrorMsg(`Please assign voices to all speakers: ${missingSpeakers.map(s => s.name).join(', ')}`);
            return;
        }

        setErrorMsg('');
        setIsProcessing(true);
        setAudioUrl(null);
        setShowProgressModal(true);
        setProgressMessages([]);
        setProgressValue(0);

        const speakerVoiceMap: Record<string, string> = {};
        speakers.forEach(speaker => {
            speakerVoiceMap[speaker.name] = speaker.voiceId;
        });

        const formData = new FormData();
        if (scriptFile) {
            formData.append('script_file', scriptFile);
        } else {
            formData.append('script_text', scriptText);
        }
        formData.append('model_name', selectedModel);
        formData.append('speaker_voice_map', JSON.stringify(speakerVoiceMap));
        formData.append('language', selectedLanguage);

        // Voice Design support
        const selectedModelData = models.find(m => m.id === selectedModel);
        if (selectedModelData?.supports_voice_design && voiceDescription) {
            formData.append('voice_description', voiceDescription);
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/api/tasks/generate', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || `HTTP Error: ${response.status}`);
            }

            const data = await response.json();
            const taskId = data.task_id;
            setCurrentTaskId(taskId);

            abortControllerRef.current = new AbortController();
            const streamResponse = await fetch(`http://127.0.0.1:8000/api/tasks/${taskId}/stream`, {
                signal: abortControllerRef.current.signal,
            });

            if (!streamResponse.ok) {
                throw new Error(`Stream Error: ${streamResponse.status}`);
            }

            const reader = streamResponse.body?.getReader();
            if (!reader) {
                throw new Error('Could not read response body');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const message = JSON.parse(line.slice(6));
                            handleProgressMessage(message);
                        } catch (e) {
                            console.error('Failed to parse SSE message:', e);
                        }
                    }
                }
            }

            if (buffer.startsWith('data: ')) {
                try {
                    const message = JSON.parse(buffer.slice(6));
                    handleProgressMessage(message);
                } catch (e) {
                    console.error('Failed to parse final SSE message:', e);
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('Generation stream disconnected.');
                return;
            }
            setErrorMsg(err.message || 'An unexpected error occurred.');
            setShowProgressModal(false);
        } finally {
            setIsProcessing(false);
            abortControllerRef.current = null;
            setCurrentTaskId(null);
        }
    };

    /**
     * Aborts the current generation process both locally and on the backend.
     */
    const handleCancelGeneration = async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (currentTaskId) {
            try {
                await fetch(`http://127.0.0.1:8000/api/tasks/${currentTaskId}/cancel`, {
                    method: 'POST'
                });
            } catch (e) {
                console.error("Failed to cancel task on backend:", e);
            }
            setCurrentTaskId(null);
        }

        setIsProcessing(false);
        const timestamp = new Date().toLocaleTimeString();
        setProgressMessages(prev => [...prev, `[${timestamp}] ✗ Generation canceled by user.`]);
    };

    return {
        showProgressModal,
        setShowProgressModal,
        progressMessages,
        setProgressMessages,
        progressValue,
        setProgressValue,
        handleGenerate,
        handleCancelGeneration
    };
};
