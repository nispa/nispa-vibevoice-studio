import { createContext, useContext, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useGenerationProgress } from '../hooks/useGenerationProgress';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { useTtsSelection } from '../hooks/useTtsSelection';
import { useJobPersistence } from '../hooks/useJobPersistence';
import type { ReactNode, RefObject, Dispatch, SetStateAction, FC } from 'react';
import { useGlobalContext } from '../../../context/GlobalContext';
import type { Job, Segment } from '../../../hooks/useJobArchive';
import { ttsApi } from '../../../services/ttsApi';
import { serializeAudioUrl, filePathToHttpUrl } from '../../../utils/audio';
import { API_BASE_URL } from '../../../services/apiClient';
import type { GeneratedSegment, PreviewData } from '../../../types/generated';
import { showToast } from '../../../utils/uiEvents';

// --- Interfaces ---

/**
 * Represents a single subtitle segment with its timing and content.
 */
export interface SubtitleSegment {
    index: number;
    start_ms: number;
    end_ms: number;
    text: string;
    is_translated?: boolean;
    original_text?: string | null;
    audioUrl?: string;
    audioBase64?: string;
    voice_id?: string;
    model_name?: string;
    language?: string;
    isApproved?: boolean;
    duration_sec?: number;
}

/**
 * Supported target languages for translation.
 */
export const TARGET_LANGUAGES = [
    'English', 'Italian', 'French', 'German', 'Spanish', 'Portuguese', 
    'Chinese', 'Japanese', 'Korean', 'Russian', 'Arabic',
    'Sicilian (scn_Latn)', 'Friulian (fur_Latn)', 'Sardinian (srd_Latn)',
    'Lombard (lmo_Latn)', 'Venetian (vec_Latn)', 'Neapolitan (nap_Latn)',
    'Other (Custom Code)'
];

// --- Context Definition ---

/**
 * Properties provided by the SubtitleContext.
 */
interface SubtitleContextProps {
    // 1. Core State (File, Parent App Props)
    subtitleFile: File | null;
    setSubtitleFile: (f: File | null) => void;
    subtitleInputRef: RefObject<HTMLInputElement | null>;
    errorMsg: string;
    setErrorMsg: (msg: string) => void;

    // 2. TTS Voice & Model
    selectedVoiceId: string;
    setSelectedVoiceId: (id: string) => void;
    selectedModel: string;
    setSelectedModel: (m: string) => void;
    selectedLanguage: string;
    setSelectedLanguage: (l: string) => void;

    // 3. Audio Generation Logs
    activityLogs: string[];
    showLogsModal: boolean;
    setShowLogsModal: (b: boolean) => void;
    addLog: (message: string) => void;
    clearLogs: () => void;
    currentAudioUrl: string | null;
    setCurrentAudioUrl: (url: string | null) => void;

    // 4. Subtitle Grouping & Editor
    groupByPunctuation: boolean;
    setGroupByPunctuation: (b: boolean) => void;
    previewData: PreviewData | null;
    setPreviewData: (d: PreviewData | null) => void;
    showPreview: boolean;
    setShowPreview: (b: boolean) => void;
    loadingPreview: boolean;
    setLoadingPreview: (b: boolean) => void;

    subtitleSegments: SubtitleSegment[];
    setSubtitleSegments: Dispatch<SetStateAction<SubtitleSegment[]>>;
    loadedJobId: number | null;
    setLoadedJobId: (id: number | null) => void;
    showEditor: boolean;
    setShowEditor: (b: boolean) => void;
    showArchive: boolean;
    setShowArchive: (b: boolean) => void;

    generationProgress: number;
    setGenerationProgress: (p: number) => void;
    generatedSegments: GeneratedSegment[];
    setGeneratedSegments: Dispatch<SetStateAction<GeneratedSegment[]>>;

    showReviewModal: boolean;
    setShowReviewModal: (b: boolean) => void;

    // Progress details
    totalItems: number;
    currentItems: number;
    estimatedTime: string;
    updateItemProgress: (current: number, total: number) => void;
    recordStartTime: () => void;
    resetProgress: () => void;

    // Task Management
    currentTaskId: string | null;
    setCurrentTaskId: (id: string | null) => void;
    cancelGeneration: (finalize?: boolean) => Promise<void>;

    // Callbacks
    loadJobSegments: (job: Job) => Promise<void>;
    saveJobDraft: (customNote?: string, customSegments?: SubtitleSegment[], customFilename?: string, silent?: boolean) => Promise<number | null>;
    updateJob: (jobId: number, updateData: Record<string, unknown>) => Promise<Job | null>;
}

const SubtitleContext = createContext<SubtitleContextProps | undefined>(undefined);

// --- Provider Component ---

/**
 * Context Provider for managing the subtitle-to-audio generation workflow.
 * 
 * Tracks the subtitle file, processing state, grouping options, 
 * audio logs, and provides handlers for task management and draft saving.
 * 
 * @param {object} props - Component props.
 * @param {ReactNode} props.children - Child components to be wrapped.
 */
export const SubtitleProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { voices } = useGlobalContext();
    const { loadedJobId, setLoadedJobId, saveJobAction, updateJob } = useJobPersistence();

    // 1. Core State
    const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
    const subtitleInputRef = useRef<HTMLInputElement>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // 2. TTS Voice & Model
    const { selectedVoiceId, setSelectedVoiceId, selectedModel, setSelectedModel, selectedLanguage, setSelectedLanguage } = useTtsSelection(voices);

    // 3. Audio Generation Logs
    const { activityLogs, setActivityLogs, showLogsModal, setShowLogsModal, addLog, clearLogs } = useActivityLogs();
    const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

    // 4. Subtitle Grouping
    const [groupByPunctuation, setGroupByPunctuation] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Subtitle Editor & Job Archive
    const [subtitleSegments, setSubtitleSegmentsState] = useState<SubtitleSegment[]>([]);
    const segmentsRef = useRef<SubtitleSegment[]>([]);

    const setSubtitleSegments = useCallback((s: SubtitleSegment[] | ((prev: SubtitleSegment[]) => SubtitleSegment[])) => {
        if (typeof s === 'function') {
            setSubtitleSegmentsState(prev => {
                const next = s(prev);
                segmentsRef.current = next;
                return next;
            });
        } else {
            setSubtitleSegmentsState(s);
            segmentsRef.current = s;
        }
    }, []);
    const [showEditor, setShowEditor] = useState(false);
    const [showArchive, setShowArchive] = useState(false);
    const {
        generationProgress, setGenerationProgress,
        totalItems, currentItems, estimatedTime,
        updateItemProgress, recordStartTime, resetProgress,
    } = useGenerationProgress();
    const [generatedSegments, setGeneratedSegments] = useState<GeneratedSegment[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);

    // Task Management
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

    /**
     * Resets loadedJobId when a new file is manually uploaded.
     */
    useEffect(() => {
        if (subtitleFile && !loadedJobId) {
            // New file upload logic could go here if needed
        }
    }, [subtitleFile, loadedJobId]);

    // --- Complex Callbacks ---

    /**
     * Cancels the current background task via the backend API.
     * 
     * @param {boolean} finalize - Whether to request the backend to finalize partial results.
     */
    const cancelGeneration = useCallback(async (finalize: boolean = false) => {
        if (!currentTaskId) return;

        try {
            const res = await ttsApi.cancelTask(currentTaskId, finalize);
            if (res.ok) {
                const timestamp = new Date().toLocaleTimeString();
                const logMsg = finalize
                    ? `[${timestamp}] ✗ Generation interrupted. Finalizing what was generated...`
                    : `[${timestamp}] ✗ Generation cancelled and discarded.`;

                setActivityLogs(prev => [...prev, logMsg]);
                if (!finalize) {
                    setCurrentTaskId(null);
                }
            }
        } catch (err) {
            console.error("Failed to cancel task:", err);
        }
    }, [currentTaskId, setActivityLogs]);

    /**
     * Saves the current subtitle configuration and segments as a draft job.
     * If segments are not yet loaded, it attempts to parse them from the file first.
     */
    const saveJobDraft = useCallback(async (customNote?: string, customSegments?: SubtitleSegment[], customFilename?: string, silent = false) => {
        // Use provided segments, or the latest segments from our Ref, or the state as fallback
        let segmentsToSave = customSegments || segmentsRef.current || subtitleSegments;
        const fileToSave = customFilename || (subtitleFile ? subtitleFile.name : 'Unknown');

        // If segments are missing but we have a file, try to parse it first
        if (segmentsToSave.length === 0 && subtitleFile) {
            try {
                const formData = new FormData();
                formData.append('subtitle_file', subtitleFile);
                const data = await ttsApi.previewSubtitles(formData, groupByPunctuation);
                segmentsToSave = data.segments as SubtitleSegment[];
                setSubtitleSegments(segmentsToSave);
            } catch (err) {
                console.error("Auto-parsing failed during save:", err);
            }
        }

        if (segmentsToSave.length === 0) {
            if (!silent) showToast('Please load subtitles first', 'info');
            return null;
        }

        // If we are updating an existing job
        if (loadedJobId) {
            try {
                const updated = await updateJob(loadedJobId, {
                    modified_segments: segmentsToSave.map(s => ({
                        ...s,
                        audioUrl: serializeAudioUrl(s.audioUrl),
                    })),
                    notes: customNote || 'Updated from UI',
                    language: selectedLanguage || undefined,
                    voice_id: selectedVoiceId || undefined,
                    model_name: selectedModel || undefined,
                });
                if (updated && !silent && !customNote) showToast(`Job #${loadedJobId} updated!`, 'success');
                return loadedJobId;
            } catch (err) {
                console.error("Failed to update job:", err);
                return null;
            }
        }

        const jobData = {
            original_filename: fileToSave,
            subtitle_segments: segmentsToSave.map(s => ({
                ...s,
                text: s.original_text || s.text,
                is_translated: false,
                audioUrl: null,
                voice_id: s.voice_id || null,
                model_name: s.model_name || null,
                language: s.language || null,
                isApproved: !!s.isApproved
            })),
            modified_segments: segmentsToSave.map(s => ({
                ...s,
                audioUrl: serializeAudioUrl(s.audioUrl),
                voice_id: s.voice_id || null,
                model_name: s.model_name || null,
                language: s.language || null,
                isApproved: !!s.isApproved
            })),
            voice_id: selectedVoiceId || "None",
            voice_name: voices.find(v => v.id === selectedVoiceId)?.name || selectedVoiceId || "None",
            model_name: selectedModel || "None",
            language: selectedLanguage || null,
            group_by_punctuation: groupByPunctuation,
            notes: customNote || 'Draft saved from UI'
        };

        const newJob = await saveJobAction(jobData, silent || !!customNote);
        if (newJob) {
            setLoadedJobId(newJob.id);
            return newJob.id;
        }

        return null;
    }, [subtitleSegments, subtitleFile, groupByPunctuation, loadedJobId, updateJob, selectedLanguage, selectedVoiceId, selectedModel, voices, saveJobAction, setLoadedJobId, setSubtitleSegments]);

    /**
     * Loads a specific job from the archive into the current context.
     * 
     * @param {any} job - The job object from the database (might be Lite).
     */
    const loadJobSegments = useCallback(async (job: Job) => {
        setLoadedJobId(job.id);

        // Use modified_segments as the primary source, ensuring audio fields are preserved.
        // audioUrl in the DB is now a relative file path (data/audio-rendering/...)
        // which we convert to an HTTP URL for playback.
        const segments: SubtitleSegment[] = (job.modified_segments || job.subtitle_segments || []).map((s: Segment) => {
            let audioUrl = s.audioUrl || null;

            if (audioUrl && audioUrl.startsWith('data/audio-rendering/')) {
                audioUrl = filePathToHttpUrl(audioUrl, API_BASE_URL);
            }

            return {
                ...s,
                audioUrl: audioUrl || undefined,
                voice_id: s.voice_id,
                model_name: s.model_name,
                language: s.language,
                isApproved: !!s.isApproved
            };
        });
        setSubtitleSegments(segments);

        setSelectedVoiceId(job.voice_id);
        setSelectedModel(job.model_name);
        setGroupByPunctuation(job.group_by_punctuation);

        // Restore generation language — prefer dedicated field, fall back to notes regex for legacy jobs
        if (job.language) {
            setSelectedLanguage(job.language);
        } else if (job.notes) {
            const langMatch = job.notes.match(/to ([A-Za-z\s]+)(?: \(|$)/);
            if (langMatch) setSelectedLanguage(langMatch[1].trim());
        }

        const pseudoFile = new File([], job.original_filename || 'recovered_job.srt');
        setSubtitleFile(pseudoFile);

        showToast(`Loaded job #${job.id}: ${job.original_filename}`, 'info');
    }, [setLoadedJobId, setSubtitleFile, setSelectedVoiceId, setSelectedModel, setSelectedLanguage, setSubtitleSegments]);

    const contextValue = useMemo(() => ({
        subtitleFile, setSubtitleFile,
        subtitleInputRef,
        errorMsg, setErrorMsg,
        selectedVoiceId, setSelectedVoiceId,
        selectedModel, setSelectedModel,
        selectedLanguage, setSelectedLanguage,
        activityLogs,
        showLogsModal, setShowLogsModal,
        addLog, clearLogs,
        currentAudioUrl, setCurrentAudioUrl,
        groupByPunctuation, setGroupByPunctuation,
        previewData, setPreviewData,
        showPreview, setShowPreview,
        loadingPreview, setLoadingPreview,
        subtitleSegments, setSubtitleSegments,
        loadedJobId, setLoadedJobId,
        showEditor, setShowEditor,
        showArchive, setShowArchive,
        generationProgress, setGenerationProgress,
        generatedSegments, setGeneratedSegments,
        showReviewModal, setShowReviewModal,
        totalItems, currentItems, estimatedTime,
        updateItemProgress, recordStartTime, resetProgress,
        currentTaskId, setCurrentTaskId,
        cancelGeneration,
        loadJobSegments, saveJobDraft,
        updateJob
    }), [
        subtitleFile,
        errorMsg,
        selectedVoiceId,
        setSelectedVoiceId,
        selectedModel,
        setSelectedModel,
        selectedLanguage,
        setSelectedLanguage,
        activityLogs,
        showLogsModal,
        setShowLogsModal,
        addLog,
        clearLogs,
        currentAudioUrl,
        groupByPunctuation,
        previewData,
        showPreview,
        loadingPreview,
        subtitleSegments,
        setSubtitleSegments,
        loadedJobId,
        setLoadedJobId,
        showEditor,
        showArchive,
        generationProgress,
        setGenerationProgress,
        generatedSegments,
        showReviewModal,
        totalItems,
        currentItems,
        estimatedTime,
        updateItemProgress,
        recordStartTime,
        resetProgress,
        currentTaskId,
        cancelGeneration,
        loadJobSegments,
        saveJobDraft,
        updateJob
    ]);

    return (
        <SubtitleContext.Provider value={contextValue}>
            {children}
        </SubtitleContext.Provider>
    );
};

/**
 * Hook to access the subtitle context.
 * 
 * @returns {SubtitleContextProps} The subtitle context values.
 * @throws {Error} If used outside of a SubtitleProvider.
 */
export const useSubtitleContext = () => {
    const context = useContext(SubtitleContext);
    if (context === undefined) {
        throw new Error('useSubtitleContext must be used within a SubtitleProvider');
    }
    return context;
};
