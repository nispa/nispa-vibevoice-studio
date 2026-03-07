import React from 'react';
import { FileUp } from 'lucide-react';
import FileUploadArea from './ui/FileUploadArea';
import { ActivityLogsModal } from './ActivityLogsModal';
import { SubtitlePreviewModal } from './SubtitlePreviewModal';
import { SubtitleEditorModal } from './SubtitleEditorModal';
import { JobArchiveModal } from './JobArchiveModal';
import { TranslationProgressModal } from './TranslationProgressModal';

import { SubtitleProvider, useSubtitleContext } from '../features/subtitle/context/SubtitleContext';
import { SubtitleGroupingControls } from '../features/subtitle/components/SubtitleGroupingControls';
import { SubtitleActionButtons } from '../features/subtitle/components/SubtitleActionButtons';
import { TranslationControls } from '../features/subtitle/components/TranslationControls';
import { GenerationControls } from '../features/subtitle/components/GenerationControls';

interface Props {
    isProcessing: boolean;
    setIsProcessing: (b: boolean) => void;
    setAudioUrl: (url: string | null) => void;
}

const SubtitleModeContent: React.FC = () => {
    const {
        subtitleFile,
        setSubtitleFile,
        subtitleInputRef,
        errorMsg,
        setErrorMsg,

        // Modals state
        showLogsModal, setShowLogsModal, activityLogs, setActivityLogs, currentAudioUrl,
        showPreview, setShowPreview, previewData,
        showEditor, setShowEditor, subtitleSegments, setSubtitleSegments, targetLanguage, selectedOllamaModel,
        showArchive, setShowArchive, loadJobSegments,

        // Translation Modal
        showTranslationModal, setShowTranslationModal, isPausing, setIsPausing, isPausedRef,
        isTranslating, setIsTranslating,
        translationProgress, setTranslationProgress, translationLogs, setTranslationLogs,
        currentOriginalText, setCurrentOriginalText, currentTranslatedText, setCurrentTranslatedText,
        previousOriginalText, setPreviousOriginalText, previousTranslatedText, setPreviousTranslatedText,
        estimatedTimeRemaining, setEstimatedTimeRemaining, hasStartedTranslation, setHasStartedTranslation,
        saveJobDraft
    } = useSubtitleContext();

    // From translation loop hook
    const runTranslationLoop = async (customPrompt: string) => {
        let currentSegments = [...subtitleSegments];

        setIsTranslating(true);
        setHasStartedTranslation(true);
        setIsPausing(false);
        isPausedRef.current = false;
        setTranslationProgress(0);
        setTranslationLogs([]);
        setEstimatedTimeRemaining(null);

        const addTransLog = (msg: string) => {
            const time = new Date().toLocaleTimeString();
            setTranslationLogs(prev => [...prev, `[${time}] ${msg}`]);
        };

        addTransLog(`Starting translation to ${targetLanguage} using model ${selectedOllamaModel}...`);

        let translatedCount = currentSegments.filter(s => s.is_translated).length;
        setTranslationProgress(Math.round((translatedCount / currentSegments.length) * 100));
        let hasError = false;

        const startTime = Date.now();
        let sessionTranslatedCount = 0;

        for (let i = 0; i < currentSegments.length; i++) {
            if (isPausedRef.current) break;

            const seg = currentSegments[i];
            if (seg.is_translated) continue;

            const prevTranslated = currentSegments.slice(0, i).reverse().find(s => s.is_translated);
            if (prevTranslated) {
                setPreviousOriginalText(prevTranslated.original_text || prevTranslated.text);
                setPreviousTranslatedText(prevTranslated.text);
            } else {
                setPreviousOriginalText('');
                setPreviousTranslatedText('');
            }

            setCurrentOriginalText(seg.text);
            setCurrentTranslatedText('');
            addTransLog(`Translating segment ${seg.index}...`);

            try {
                const fd = new FormData();
                fd.append('text', seg.text);
                fd.append('target_language', targetLanguage);
                fd.append('model_name', selectedOllamaModel);
                fd.append('prompt', customPrompt);

                const res = await fetch('http://localhost:8000/api/translate-segment', {
                    method: 'POST', body: fd
                });

                if (res.ok) {
                    const data = await res.json();
                    currentSegments[i] = {
                        ...seg,
                        original_text: seg.original_text || seg.text,
                        text: data.translated_text,
                        is_translated: true
                    };

                    setSubtitleSegments([...currentSegments]); // force update
                    setCurrentTranslatedText(data.translated_text);
                    addTransLog(`✓ Segment ${seg.index} translated.`);

                    translatedCount++;
                    sessionTranslatedCount++;
                    setTranslationProgress(Math.round((translatedCount / currentSegments.length) * 100));

                    const elapsed = Date.now() - startTime;
                    const avgTime = elapsed / sessionTranslatedCount;
                    const remainingSegments = currentSegments.length - translatedCount;
                    setEstimatedTimeRemaining((avgTime * remainingSegments) / 1000);
                } else {
                    console.error(`Failed to translate segment ${seg.index}`);
                    addTransLog(`✗ Failed to translate segment ${seg.index}`);
                    hasError = true;
                    break;
                }
            } catch (e) {
                console.error(e);
                addTransLog(`✗ Error translating segment ${seg.index}: ${String(e)}`);
                hasError = true;
                break;
            }
        }

        setIsTranslating(false);

        // Auto-save logic
        const baseName = subtitleFile ? subtitleFile.name.replace(/\.[^/.]+$/, "") : "translated_subtitles";
        const newFilename = `${baseName}_${targetLanguage}.srt`;

        // Update pseudo file so user knows translation is attached
        const translatedFile = new File([], newFilename, { type: 'text/plain' });
        setSubtitleFile(translatedFile);

        if (isPausedRef.current) {
            saveJobDraft('Translation Paused Draft', currentSegments, newFilename);
        } else if (!hasError) {
            saveJobDraft(`Fully translated to ${targetLanguage}`, currentSegments, newFilename);
            alert(`Translation to ${targetLanguage} complete! Saved to Job Archive.`);
        } else {
            alert('Translation encountered an error and paused. State saved.');
            saveJobDraft('Translation Error Draft', currentSegments, newFilename);
        }
    };

    return (
        <div className="space-y-6">

            {/* 1. Subtitle Drag Area */}
            <FileUploadArea
                file={subtitleFile}
                onFileChange={(file) => {
                    setSubtitleFile(file);
                    setErrorMsg('');
                }}
                inputRef={subtitleInputRef}
                accept=".srt,.vtt"
                icon={FileUp}
                titleDefault="Upload Subtitles"
                subtitleDefault="Drag and drop or click to select .srt / .vtt"
                activeColorClass="blue-500"
                activeBgClass="bg-blue-500/5"
                activeTextClass="text-blue-500"
            />

            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-md text-sm">
                    {errorMsg}
                </div>
            )}

            {/* Subtitle Modular Components */}
            <SubtitleGroupingControls />
            <SubtitleActionButtons />
            <TranslationControls />
            <GenerationControls />

            {/* Activity Logs Modal */}
            <ActivityLogsModal
                isOpen={showLogsModal}
                onClose={() => setShowLogsModal(false)}
                logs={activityLogs}
                title="Subtitle Generation Activity Logs"
                onClear={() => setActivityLogs([])}
                audioUrl={currentAudioUrl}
            />

            {/* Subtitle Preview Modal */}
            <SubtitlePreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                segments={previewData?.segments || []}
                originalCount={previewData?.original_count || 0}
                finalCount={previewData?.final_count || 0}
                originalFilename={subtitleFile?.name}
                onUseAsInput={(file) => {
                    setSubtitleFile(file);
                    setShowPreview(false);
                }}
            />

            {/* Subtitle Editor Modal */}
            <SubtitleEditorModal
                isOpen={showEditor}
                onClose={() => setShowEditor(false)}
                segments={subtitleSegments}
                onSegmentsSave={(updatedSegments) => setSubtitleSegments(updatedSegments)}
                filename={subtitleFile?.name || 'Subtitles'}
                targetLanguage={targetLanguage}
                selectedOllamaModel={selectedOllamaModel}
            />

            {/* Job Archive Modal */}
            <JobArchiveModal
                isOpen={showArchive}
                onClose={() => setShowArchive(false)}
                onLoadJob={loadJobSegments}
            />

            {/* Translation Progress Modal */}
            <TranslationProgressModal
                isOpen={showTranslationModal}
                onClose={() => setShowTranslationModal(false)}
                onStart={runTranslationLoop}
                onPause={() => {
                    setIsPausing(true);
                    isPausedRef.current = true;
                }}
                progress={translationProgress}
                logs={translationLogs}
                currentOriginalText={currentOriginalText}
                currentTranslatedText={currentTranslatedText}
                previousOriginalText={previousOriginalText}
                previousTranslatedText={previousTranslatedText}
                estimatedTimeRemaining={estimatedTimeRemaining}
                isPausing={isPausing}
                hasStarted={hasStartedTranslation}
                targetLanguage={targetLanguage}
            />

        </div>
    );
};

export default function SubtitleMode(props: Props) {
    return (
        <SubtitleProvider {...props}>
            <SubtitleModeContent />
        </SubtitleProvider>
    );
}
