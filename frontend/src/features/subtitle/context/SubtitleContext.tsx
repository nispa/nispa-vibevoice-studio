import { createContext, useContext, useState, useRef, useEffect } from 'react';
import type { ReactNode, RefObject, Dispatch, SetStateAction, FC } from 'react';
import { useGlobalContext } from '../../../context/GlobalContext';
import { useJobArchive } from '../../../hooks/useJobArchive';

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
    original_text?: string;
}

/**
 * Supported target languages for translation.
 */
export const TARGET_LANGUAGES = ['English', 'Italian', 'German', 'Spanish', 'French'];

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

    // 3. Audio Generation Logs 
    activityLogs: string[];
    setActivityLogs: Dispatch<SetStateAction<string[]>>;
    showLogsModal: boolean;
    setShowLogsModal: (b: boolean) => void;
    currentAudioUrl: string | null;
    setCurrentAudioUrl: (url: string | null) => void;

    // 4. Subtitle Grouping & Editor
    groupByPunctuation: boolean;
    setGroupByPunctuation: (b: boolean) => void;
    previewData: any;
    setPreviewData: (d: any) => void;
    showPreview: boolean;
    setShowPreview: (b: boolean) => void;
    loadingPreview: boolean;
    setLoadingPreview: (b: boolean) => void;

    subtitleSegments: SubtitleSegment[];
    setSubtitleSegments: (s: SubtitleSegment[]) => void;
    showEditor: boolean;
    setShowEditor: (b: boolean) => void;
    showArchive: boolean;
    setShowArchive: (b: boolean) => void;

    generationProgress: number;
    setGenerationProgress: (p: number) => void;

    // Task Management
    currentTaskId: string | null;
    setCurrentTaskId: (id: string | null) => void;
    cancelGeneration: (finalize?: boolean) => Promise<void>;

    // Callbacks
    loadJobSegments: (job: any) => void;
    saveJobDraft: (customNote?: string, customSegments?: SubtitleSegment[], customFilename?: string) => Promise<void>;
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
    const { voices, models } = useGlobalContext();
    const { saveJobDraft: saveJobAction } = useJobArchive();

    // 1. Core State
    const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
    const subtitleInputRef = useRef<HTMLInputElement>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // 2. TTS Voice & Model
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>('VibeVoice-1.5B');

    // 3. Audio Generation Logs
    const [activityLogs, setActivityLogs] = useState<string[]>([]);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

    // 4. Subtitle Grouping
    const [groupByPunctuation, setGroupByPunctuation] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Subtitle Editor & Job Archive
    const [subtitleSegments, setSubtitleSegments] = useState<SubtitleSegment[]>([]);
    const [showEditor, setShowEditor] = useState(false);
    const [showArchive, setShowArchive] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);

    // Task Management
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

    /**
     * Initializes default voice selection when voices data becomes available.
     */
    useEffect(() => {
        if (voices.length > 0 && !selectedVoiceId) {
            setSelectedVoiceId(voices[0].id);
        }
    }, [voices, selectedVoiceId]);

    /**
     * Ensures selected model remains valid when available models change.
     */
    useEffect(() => {
        if (models.length > 0 && !models.includes(selectedModel)) {
            setSelectedModel(models[0]);
        }
    }, [models, selectedModel]);

    // --- Complex Callbacks ---

    /**
     * Cancels the current background task via the backend API.
     * 
     * @param {boolean} finalize - Whether to request the backend to finalize partial results.
     */
    const cancelGeneration = async (finalize: boolean = false) => {
        if (!currentTaskId) return;

        try {
            const res = await fetch(`http://localhost:8000/api/tasks/${currentTaskId}/cancel?finalize=${finalize}`, {
                method: 'POST'
            });
            if (res.ok) {
                const timestamp = new Date().toLocaleTimeString();
                const logMsg = finalize 
                    ? `[${timestamp}] ✗ Generation interrupted. Finalizing what was generated...`
                    : `[${timestamp}] ✗ Generation cancelled and discarded.`;
                
                setActivityLogs(prev => [...prev, logMsg]);
                // We don't null currentTaskId immediately if finalizing, 
                // because we want to wait for the final SSE 'complete' message.
                if (!finalize) {
                    setCurrentTaskId(null);
                }
            }
        } catch (err) {
            console.error("Failed to cancel task:", err);
        }
    };

    /**
     * Saves the current subtitle configuration and segments as a draft job.
     * 
     * @param {string} customNote - Optional note for the draft.
     * @param {SubtitleSegment[]} customSegments - Optional segments override.
     * @param {string} customFilename - Optional filename override.
     */
    const saveJobDraft = async (customNote?: string, customSegments?: SubtitleSegment[], customFilename?: string) => {
        const segmentsToSave = customSegments || subtitleSegments;
        const fileToSave = customFilename || (subtitleFile ? subtitleFile.name : 'Unknown');

        if (segmentsToSave.length === 0) {
            alert('Please load subtitles first');
            return;
        }

        const jobData = {
            original_filename: fileToSave,
            subtitle_segments: segmentsToSave,
            modified_segments: segmentsToSave,
            voice_id: selectedVoiceId || "None",
            voice_name: voices.find(v => v.id === selectedVoiceId)?.name || selectedVoiceId || "None",
            model_name: selectedModel || "None",
            group_by_punctuation: groupByPunctuation,
            notes: customNote || 'Draft saved from UI'
        };

        await saveJobAction(jobData, !!customNote);
    };

    /**
     * Loads a specific job from the archive into the current context.
     * 
     * @param {any} job - The job object from the database.
     */
    const loadJobSegments = (job: any) => {
        setSubtitleSegments(job.modified_segments);
        setSelectedVoiceId(job.voice_id);
        setSelectedModel(job.model_name);
        setGroupByPunctuation(job.group_by_punctuation);

        const pseudoFile = new File([], job.original_filename || 'recovered_job.srt');
        setSubtitleFile(pseudoFile as any);

        alert(`Loaded job #${job.id}: ${job.original_filename}`);
    };

    return (
        <SubtitleContext.Provider value={{
            subtitleFile, setSubtitleFile,
            subtitleInputRef,
            errorMsg, setErrorMsg,
            selectedVoiceId, setSelectedVoiceId,
            selectedModel, setSelectedModel,
            activityLogs, setActivityLogs,
            showLogsModal, setShowLogsModal,
            currentAudioUrl, setCurrentAudioUrl,
            groupByPunctuation, setGroupByPunctuation,
            previewData, setPreviewData,
            showPreview, setShowPreview,
            loadingPreview, setLoadingPreview,
            subtitleSegments, setSubtitleSegments,
            showEditor, setShowEditor,
            showArchive, setShowArchive,
            generationProgress, setGenerationProgress,
            currentTaskId, setCurrentTaskId,
            cancelGeneration,
            loadJobSegments, saveJobDraft
        }}>
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
