import React, { useState, useEffect } from 'react';
import type { FC } from 'react';
import { FileUp, Settings, AudioWaveform, X, ChevronDown, ChevronRight, Database } from 'lucide-react';
import FileUploadArea from '../../components/ui/FileUploadArea';
import { ActivityLogsModal } from '../../components/ActivityLogs';
import { SubtitlePreviewModal } from './components/SubtitlePreviewModal';
import { SubtitleEditorModal } from './components/SubtitleEditorModal';
import { JobArchivePanel } from '../../components/JobArchivePanel';
import { TranslationProgressModal } from './components/TranslationProgressModal';
import { JobReviewModal } from './components/JobReviewModal';

import { SubtitleProvider, useSubtitleContext } from './context/SubtitleContext';
import { TranslationProvider, useTranslationContext } from './context/TranslationContext';
import { SubtitleGroupingControls } from './components/SubtitleGroupingControls';
import { SubtitleActionButtons } from './components/SubtitleActionButtons';
import { TranslationControls } from './components/TranslationControls';
import { GenerationControls } from './components/GenerationControls';

/**
 * Internal content component for Subtitle Mode.
 */
const SubtitleModeContent: FC = () => {
    const {
        subtitleFile,
        setSubtitleFile,
        subtitleInputRef,
        errorMsg,
        setErrorMsg,
        loadedJobId,
        setLoadedJobId,

        // Modals state
        showLogsModal, setShowLogsModal, activityLogs, setActivityLogs, currentAudioUrl,
        showPreview, setShowPreview, previewData,
        showEditor, setShowEditor, subtitleSegments, setSubtitleSegments,
        loadJobSegments, generationProgress,
        cancelGeneration,
        generatedSegments,
        showReviewModal, setShowReviewModal
    } = useSubtitleContext();

    const {
        showTranslationModal, setShowTranslationModal
    } = useTranslationContext();

    // UI state for collapse
    const [isRefiningCollapsed, setIsRefiningCollapsed] = useState(false);

    // Auto-collapse if a job is loaded
    useEffect(() => {
        if (loadedJobId) {
            setIsRefiningCollapsed(true);
        } else {
            setIsRefiningCollapsed(false);
        }
    }, [loadedJobId]);

    const handleReset = () => {
        setSubtitleFile(null);
        setLoadedJobId(null);
        setSubtitleSegments([]);
        setErrorMsg('');
    };

    return (
        <div className="space-y-8 animate-fade-in">

            {/* SECTION 1: INPUT STAGE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <FileUp size={18} className="text-indigo-400" />
                            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Step 1: Input Source</h3>
                        </div>
                        {subtitleFile && (
                            <button 
                                onClick={handleReset}
                                className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 uppercase transition-colors"
                            >
                                <X size={12} /> Clear / Reset
                            </button>
                        )}
                    </div>

                    {loadedJobId ? (
                        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-6 flex items-center gap-4 animate-fade-in h-full">
                            <div className="p-3 bg-indigo-500/20 rounded-full text-indigo-400">
                                <Database size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Archive Job Active</p>
                                <p className="text-lg font-medium text-slate-200 truncate max-w-[250px]">{subtitleFile?.name || `Job #${loadedJobId}`}</p>
                                <p className="text-[10px] text-slate-500 mt-1 italic">Editing existing job state. Upload is disabled.</p>
                            </div>
                        </div>
                    ) : (
                        <FileUploadArea
                            file={subtitleFile}
                            onFileChange={(file) => {
                                setSubtitleFile(file);
                                setLoadedJobId(null);
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
                    )}
                    
                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-md text-sm text-xs">
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

            {/* SECTION 2: EDITING & AI STAGE */}
            {subtitleFile && (
                <div className="space-y-6 pt-4 border-t border-slate-700/30">
                    <div className="flex items-center justify-between px-1 cursor-pointer group" onClick={() => setIsRefiningCollapsed(!isRefiningCollapsed)}>
                        <div className="flex items-center gap-2">
                            <Settings size={18} className="text-emerald-400" />
                            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Step 2: Refining & Translation</h3>
                            {loadedJobId && (
                                <span className="ml-2 px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-full border border-indigo-500/30">
                                    LOADED
                                </span>
                            )}
                        </div>
                        <div className="text-slate-500 group-hover:text-slate-300 transition-colors">
                            {isRefiningCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                        </div>
                    </div>
                    
                    {!isRefiningCollapsed && (
                        <div className="flex flex-col gap-6 animate-slide-down">
                            <SubtitleGroupingControls />
                            <SubtitleActionButtons />
                            <TranslationControls />
                        </div>
                    )}
                </div>
            )}

            {/* SECTION 3: VOICE & GENERATION STAGE */}
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
                generatedSegments={generatedSegments}
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
                    setLoadedJobId(null);
                    if (previewData?.segments) {
                        setSubtitleSegments(previewData.segments);
                    }
                    setShowPreview(false);
                }}
            />

            <SubtitleEditorModal
                key={showEditor ? 'editor-open' : 'editor-closed'}
                isOpen={showEditor}
                onClose={() => setShowEditor(false)}
                segments={subtitleSegments}
                onSegmentsSave={(updatedSegments) => {
                    setSubtitleSegments(updatedSegments);
                    saveJobDraft("Studio Manual Update", updatedSegments, undefined, true);
                }}
                filename={subtitleFile?.name || 'Subtitles'}
            />

            <TranslationProgressModal
                isOpen={showTranslationModal}
                onClose={() => setShowTranslationModal(false)}
            />

            <JobReviewModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                jobId={loadedJobId}
                jobName={subtitleFile?.name || 'Voiceover Job'}
                segments={subtitleSegments}
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
