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
    audioUrl?: string;
    audioBase64?: string; // Raw base64 for persistence
    voice_id?: string;
    model_name?: string;
    language?: string;
    isApproved?: boolean;
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
    loadedJobId: number | null;
    setLoadedJobId: (id: number | null) => void;
    showEditor: boolean;
    setShowEditor: (b: boolean) => void;
    showArchive: boolean;
    setShowArchive: (b: boolean) => void;

    generationProgress: number;
    setGenerationProgress: (p: number) => void;
    generatedSegments: any[];
    setGeneratedSegments: Dispatch<SetStateAction<any[]>>;

    showReviewModal: boolean;
    setShowReviewModal: (b: boolean) => void;

    // Progress details
    totalItems: number;
    setTotalItems: (n: number) => void;
    currentItems: number;
    setCurrentItems: (n: number) => void;
    estimatedTime: string;
    setEstimatedTime: (s: string) => void;

    // Task Management
    currentTaskId: string | null;
    setCurrentTaskId: (id: string | null) => void;
    cancelGeneration: (finalize?: boolean) => Promise<void>;

    // Callbacks
    loadJobSegments: (job: any) => void;
    saveJobDraft: (customNote?: string, customSegments?: SubtitleSegment[], customFilename?: string, silent?: boolean) => Promise<number | null>;
    updateJob: (jobId: number, updateData: any) => Promise<any>;
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
    // ... (rest remains the same up to saveJobDraft)

    const { voices, models } = useGlobalContext();
    const { saveJobDraft: saveJobAction } = useJobArchive();

    // 1. Core State
    const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
    const subtitleInputRef = useRef<HTMLInputElement>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // 2. TTS Voice & Model
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>('VibeVoice-1.5B');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('Italian');

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
    const [subtitleSegments, setSubtitleSegmentsState] = useState<SubtitleSegment[]>([]);
    const segmentsRef = useRef<SubtitleSegment[]>([]);

    const setSubtitleSegments = (s: SubtitleSegment[] | ((prev: SubtitleSegment[]) => SubtitleSegment[])) => {
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
    };
    const [loadedJobId, setLoadedJobId] = useState<number | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [showArchive, setShowArchive] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generatedSegments, setGeneratedSegments] = useState<any[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);

    // Progress details
    const [totalItems, setTotalItems] = useState(0);
    const [currentItems, setCurrentItems] = useState(0);
    const [estimatedTime, setEstimatedTime] = useState('--:--');

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
    const cancelGeneration = async (finalize: boolean = false) => {
        if (!currentTaskId) return;

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/tasks/${currentTaskId}/cancel?finalize=${finalize}`, {
                method: 'POST'
            });
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
    };

    /**
     * Saves the current subtitle configuration and segments as a draft job.
     * If segments are not yet loaded, it attempts to parse them from the file first.
     */
    const saveJobDraft = async (customNote?: string, customSegments?: SubtitleSegment[], customFilename?: string, silent = false) => {
        // Use provided segments, or the latest segments from our Ref, or the state as fallback
        let segmentsToSave = customSegments || segmentsRef.current || subtitleSegments;
        const fileToSave = customFilename || (subtitleFile ? subtitleFile.name : 'Unknown');

        // If segments are missing but we have a file, try to parse it first
        if (segmentsToSave.length === 0 && subtitleFile) {
            try {
                const formData = new FormData();
                formData.append('subtitle_file', subtitleFile);
                const res = await fetch(
                    `http://localhost:8000/api/preview-subtitles?group_by_punctuation=${groupByPunctuation}`,
                    { method: 'POST', body: formData }
                );
                if (res.ok) {
                    const data = await res.json();
                    segmentsToSave = data.segments;
                    setSubtitleSegments(segmentsToSave);
                }
            } catch (err) {
                console.error("Auto-parsing failed during save:", err);
            }
        }

        if (segmentsToSave.length === 0) {
            if (!silent) alert('Please load subtitles first');
            return;
        }

        // If we are updating an existing job
        if (loadedJobId) {
            try {
                const updated = await updateJobAction(loadedJobId, {
                    modified_segments: segmentsToSave,
                    notes: customNote || 'Updated from UI'
                });
                if (updated && !silent && !customNote) alert(`Job #${loadedJobId} updated!`);
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
                audioUrl: s.audioUrl || null,
                audioBase64: s.audioBase64 || null,
                voice_id: s.voice_id || null,
                model_name: s.model_name || null,
                language: s.language || null,
                isApproved: !!s.isApproved
            })),
            modified_segments: segmentsToSave.map(s => ({
                ...s,
                audioUrl: s.audioUrl || null,
                audioBase64: s.audioBase64 || null,
                voice_id: s.voice_id || null,
                model_name: s.model_name || null,
                language: s.language || null,
                isApproved: !!s.isApproved
            })),
            voice_id: selectedVoiceId || "None",
            voice_name: voices.find(v => v.id === selectedVoiceId)?.name || selectedVoiceId || "None",
            model_name: selectedModel || "None",
            group_by_punctuation: groupByPunctuation,
            notes: customNote || 'Draft saved from UI'
        };

        const newJob = await saveJobAction(jobData, silent || !!customNote);
        if (newJob) {
            setLoadedJobId(newJob.id);
            return newJob.id;
        }
        
        return null;
    };

    /**
     * Loads a specific job from the archive into the current context.
     * 
     * @param {any} job - The job object from the database.
     */
    const loadJobSegments = (job: any) => {
        setLoadedJobId(job.id);
        
        // Use modified_segments as the primary source, ensuring audio fields are preserved
        // We need to convert saved Base64 back to Blob URLs for the browser
        const segments = (job.modified_segments || job.subtitle_segments || []).map((s: any) => {
            let audioUrl = s.audioUrl || null;
            
            // If we have base64 but no valid blob URL (which is always true on reload), reconstruct it
            if (s.audioBase64 && (!audioUrl || audioUrl.startsWith('blob:'))) {
                try {
                    const binaryString = atob(s.audioBase64);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: 'audio/wav' });
                    audioUrl = URL.createObjectURL(blob);
                } catch (e) {
                    console.error("Failed to reconstruct audio from base64:", e);
                }
            }

            return {
                ...s,
                audioUrl: audioUrl,
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
        
        // Try to recover the target language from notes if possible
        if (job.notes) {
            const langMatch = job.notes.match(/to ([A-Za-z\s]+)(?: \(|$)/);
            if (langMatch) setSelectedLanguage(langMatch[1].trim());
        }

        const pseudoFile = new File([], job.original_filename || 'recovered_job.srt');
        setSubtitleFile(pseudoFile as any);

        alert(`Loaded job #${job.id}: ${job.original_filename}`);
    };

    const { updateJob: updateJobAction } = useJobArchive();

    const updateJob = async (jobId: number, updateData: any) => {
        return await updateJobAction(jobId, updateData);
    };

    return (
        <SubtitleContext.Provider value={{
            subtitleFile, setSubtitleFile,
            subtitleInputRef,
            errorMsg, setErrorMsg,
            selectedVoiceId, setSelectedVoiceId,
            selectedModel, setSelectedModel,
            selectedLanguage, setSelectedLanguage,
            activityLogs, setActivityLogs,
            showLogsModal, setShowLogsModal,
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
            totalItems, setTotalItems,
            currentItems, setCurrentItems,
            estimatedTime, setEstimatedTime,
            currentTaskId, setCurrentTaskId,
            cancelGeneration,
            loadJobSegments, saveJobDraft,
            updateJob
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
