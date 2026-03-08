import { useState, useRef } from 'react';
import { useScriptContext } from '../features/script/context/ScriptContext';
import { useGlobalContext } from '../context/GlobalContext';

export const useScriptGeneration = () => {
    const { scriptFile, scriptText, speakers, selectedModel, setErrorMsg } = useScriptContext();
    const { setIsProcessing, setAudioUrl } = useGlobalContext();

    const [showProgressModal, setShowProgressModal] = useState(false);
    const [progressMessages, setProgressMessages] = useState<string[]>([]);
    const [progressValue, setProgressValue] = useState(0);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

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

        try {
            const response = await fetch('http://localhost:8000/api/tasks/generate', {
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
            const streamResponse = await fetch(`http://localhost:8000/api/tasks/${taskId}/stream`, {
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

    const handleCancelGeneration = async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (currentTaskId) {
            try {
                await fetch(`http://localhost:8000/api/tasks/${currentTaskId}/cancel`, {
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
