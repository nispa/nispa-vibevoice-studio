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
        setShowLogsModal,
        setCurrentAudioUrl,
        setErrorMsg,
        groupByPunctuation,
        subtitleSegments
    } = useSubtitleContext();

    const handleGenerate = async () => {
        if (!subtitleFile) {
            setErrorMsg("Please upload a .srt or .vtt file first.");
            return;
        }

        if (!selectedVoiceId) {
            setErrorMsg("Please select a voice.");
            return;
        }

        setErrorMsg('');
        setIsProcessing(true);
        setAudioUrl(null);
        setActivityLogs([]); // Reset logs for new generation
        setShowLogsModal(true); // Open logs modal

        const addLog = (message: string) => {
            const timestamp = new Date().toLocaleTimeString();
            setActivityLogs(prev => [...prev, `[${timestamp}] ${message}`]);
        };

        addLog(`Starting audio generation for subtitle file: ${subtitleFile.name}`);
        addLog(`Selected voice: ${voices.find(v => v.id === selectedVoiceId)?.name || selectedVoiceId}`);
        addLog(`Selected model: ${selectedModel}`);

        // Check if subtitles have been edited
        const segmentsUsed = subtitleSegments.length > 0 ? subtitleSegments.length : 'original file';
        addLog(`Using ${segmentsUsed} subtitle segments`);

        if (groupByPunctuation) {
            addLog(`✓ Intelligent grouping: Segments will be grouped by punctuation marks`);
        }

        const formData = new FormData();
        if (subtitleSegments && subtitleSegments.length > 0) {
            formData.append('subtitle_segments', JSON.stringify(subtitleSegments));
        } else if (subtitleFile) {
            formData.append('subtitle_file', subtitleFile);
        }

        formData.append('voice_id', selectedVoiceId);
        formData.append('model_name', selectedModel);
        formData.append('group_by_punctuation', groupByPunctuation.toString());

        try {
            addLog('Sending request to server...');
            const res = await fetch('http://localhost:8000/api/generate-audio', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                addLog(`Server returned status code: ${res.status}`);
                const errData = await res.json().catch(() => ({}));
                const errorMsg = errData.detail || "Generation failed on the server.";
                addLog(`Error: ${errorMsg}`);
                throw new Error(errorMsg);
            }

            addLog('Server response received, processing audio...');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setCurrentAudioUrl(url); // Store for modal preview
            setAudioUrl(url);
            addLog(`✓ Audio generation completed successfully! (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);

            // Save job record
            if (subtitleSegments.length > 0) {
                addLog('Archiving job to database...');
                try {
                    const jobData = {
                        original_filename: subtitleFile.name,
                        subtitle_segments: subtitleSegments,
                        modified_segments: subtitleSegments,
                        voice_id: selectedVoiceId,
                        voice_name: voices.find(v => v.id === selectedVoiceId)?.name || selectedVoiceId,
                        model_name: selectedModel,
                        group_by_punctuation: groupByPunctuation,
                        notes: 'Completed generation'
                    };

                    const jobRes = await fetch('http://localhost:8000/api/jobs/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(jobData),
                    });

                    if (jobRes.ok) {
                        const savedJob = await jobRes.json();
                        addLog(`✓ Job #${savedJob.id} archived`);
                    }
                } catch (jobErr) {
                    addLog(`Note: Could not archive job: ${String(jobErr)}`);
                }
            }
        } catch (err: any) {
            const errorMessage = err.message || 'An unexpected error occurred.';
            setErrorMsg(errorMessage);
            addLog(`✗ Generation failed: ${errorMessage}`);
        } finally {
            setIsProcessing(false);
            addLog('Generation process finished.');
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

            {/* Action */}
            <div className="pt-4 border-t border-slate-800 flex justify-end items-center gap-4">
                {isProcessing && (
                    <div className="flex items-center gap-2 text-blue-400 animate-pulse">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-sm font-medium">Generating Audio... Connecting to local TTS engine</span>
                    </div>
                )}
                {activityLogs.length > 0 && (
                    <button
                        onClick={() => setShowLogsModal(true)}
                        title="View activity logs"
                        className="btn-secondary px-4 py-2 flex items-center gap-2"
                    >
                        <Activity size={18} />
                        <span className="text-sm">Logs ({activityLogs.length})</span>
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
