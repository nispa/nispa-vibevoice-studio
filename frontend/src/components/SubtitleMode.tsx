import type { FC } from 'react';
import { FileUp, Settings, AudioWaveform } from 'lucide-react';
import FileUploadArea from './ui/FileUploadArea';
import { ActivityLogsModal } from './ActivityLogsModal';
import { SubtitlePreviewModal } from './SubtitlePreviewModal';
import { SubtitleEditorModal } from './SubtitleEditorModal';
import { JobArchivePanel } from './JobArchivePanel';
import { TranslationProgressModal } from './TranslationProgressModal';

import { SubtitleProvider, useSubtitleContext } from '../features/subtitle/context/SubtitleContext';
import { TranslationProvider, useTranslationContext } from '../features/subtitle/context/TranslationContext';
import { SubtitleGroupingControls } from '../features/subtitle/components/SubtitleGroupingControls';
import { SubtitleActionButtons } from '../features/subtitle/components/SubtitleActionButtons';
import { TranslationControls } from '../features/subtitle/components/TranslationControls';
import { GenerationControls } from '../features/subtitle/components/GenerationControls';

/**
 * Internal content component for Subtitle Mode.
 * 
 * Orchestrates the 3-step workflow:
 * 1. Input (Upload or Load from Archive)
 * 2. Refining (Grouping, Editing, Translation)
 * 3. Synthesis (Voice selection and audio generation)
 * 
 * @returns {JSX.Element} The rendered subtitle mode UI.
 */
const SubtitleModeContent: FC = () => {
    const {
        subtitleFile,
        setSubtitleFile,
        subtitleInputRef,
        errorMsg,
        setErrorMsg,

        // Modals state
        showLogsModal, setShowLogsModal, activityLogs, setActivityLogs, currentAudioUrl,
        showPreview, setShowPreview, previewData,
        showEditor, setShowEditor, subtitleSegments, setSubtitleSegments,
        loadJobSegments, generationProgress,
        cancelGeneration
    } = useSubtitleContext();

    const {
        showTranslationModal, setShowTranslationModal
    } = useTranslationContext();

    return (
        <div className="space-y-8 animate-fade-in">

            {/* SECTION 1: INPUT STAGE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 px-1">
                        <FileUp size={18} className="text-indigo-400" />
                        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Step 1: Input Source</h3>
                    </div>
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
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 px-1">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Or Load from Archive</h3>
                    </div>
                    <JobArchivePanel onLoadJob={loadJobSegments} />
                </div>
            </div>

            {/* SECTION 2: EDITING & AI STAGE (Visible once input is present) */}
            {subtitleFile && (
                <div className="space-y-6 pt-4 border-t border-slate-700/30">
                    <div className="flex items-center gap-2 px-1">
                        <Settings size={18} className="text-emerald-400" />
                        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Step 2: Refining & Translation</h3>
                    </div>
                    
                    <div className="flex flex-col gap-6">
                        <SubtitleGroupingControls />
                        <SubtitleActionButtons />
                        <TranslationControls />
                    </div>
                </div>
            )}

            {/* SECTION 3: VOICE & GENERATION STAGE (Visible once input is present) */}
            {subtitleFile && (
                <div className="space-y-6 pt-4 border-t border-slate-700/30">
                    <div className="flex items-center gap-2 px-1">
                        <AudioWaveform size={18} className="text-indigo-400" />
                        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Step 3: Voice Selection & Synthesis</h3>
                    </div>
                    
                    <div className="bg-slate-800/20 border border-slate-700/50 rounded-xl p-6 shadow-inner">
                        <GenerationControls />
                    </div>
                </div>
            )}

            {/* MODALS */}
            <ActivityLogsModal
                isOpen={showLogsModal}
                onClose={() => setShowLogsModal(false)}
                logs={activityLogs}
                title="Subtitle Generation Activity Logs"
                onClear={() => setActivityLogs([])}
                audioUrl={currentAudioUrl}
                progress={generationProgress}
                onCancel={cancelGeneration}
            />

            <SubtitlePreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                segments={previewData?.segments || []}
                originalCount={previewData?.original_count || 0}
                finalCount={previewData?.final_count || 0}
                originalFilename={subtitleFile?.name}
                onUseAsInput={(file) => {
                    setSubtitleFile(file);
                    if (previewData?.segments) {
                        setSubtitleSegments(previewData.segments);
                    }
                    setShowPreview(false);
                }}
            />

            <SubtitleEditorModal
                key={subtitleSegments.length > 0 ? `editor-${subtitleSegments.length}-${subtitleSegments[0].text.substring(0, 5)}` : 'editor-empty'}
                isOpen={showEditor}
                onClose={() => setShowEditor(false)}
                segments={subtitleSegments}
                onSegmentsSave={(updatedSegments) => setSubtitleSegments(updatedSegments)}
                filename={subtitleFile?.name || 'Subtitles'}
            />

            <TranslationProgressModal
                isOpen={showTranslationModal}
                onClose={() => setShowTranslationModal(false)}
            />

        </div>
    );
};

/**
 * Subtitle Mode entry point.
 * Wraps the content with specialized providers for subtitle and translation state.
 */
export default function SubtitleMode() {
    return (
        <SubtitleProvider>
            <TranslationProvider>
                <SubtitleModeContent />
            </TranslationProvider>
        </SubtitleProvider>
    );
}
