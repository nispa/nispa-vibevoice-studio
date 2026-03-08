import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

// --- Interfaces ---

export interface Voice {
    id: string;
    filename: string;
    language: string;
    accent: string;
    name: string;
    gender: string;
}

export interface SubtitleSegment {
    index: number;
    start_ms: number;
    end_ms: number;
    text: string;
    is_translated?: boolean;
    original_text?: string;
}

export const TARGET_LANGUAGES = ['English', 'Italian', 'German', 'Spanish', 'French'];

// --- Context Definition ---

interface SubtitleContextProps {
    // 1. Core State (File, Parent App Props)
    isProcessing: boolean;
    setIsProcessing: (b: boolean) => void;
    setAudioUrl: (url: string | null) => void;

    subtitleFile: File | null;
    setSubtitleFile: (f: File | null) => void;
    subtitleInputRef: React.RefObject<HTMLInputElement>;
    errorMsg: string;
    setErrorMsg: (msg: string) => void;

    // 2. TTS Voice & Model
    voices: Voice[];
    selectedVoiceId: string;
    setSelectedVoiceId: (id: string) => void;
    models: string[];
    selectedModel: string;
    setSelectedModel: (m: string) => void;

    // 3. Audio Generation Logs 
    activityLogs: string[];
    setActivityLogs: React.Dispatch<React.SetStateAction<string[]>>;
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

    // Callbacks
    loadJobSegments: (job: any) => void;
    saveJobDraft: (customNote?: string, customSegments?: SubtitleSegment[], customFilename?: string) => Promise<void>;
}

const SubtitleContext = createContext<SubtitleContextProps | undefined>(undefined);

// --- Provider Component ---

export const SubtitleProvider: React.FC<{
    children: ReactNode;
    isProcessing: boolean;
    setIsProcessing: (b: boolean) => void;
    setAudioUrl: (url: string | null) => void;
}> = ({ children, isProcessing, setIsProcessing, setAudioUrl }) => {

    // 1. Core State
    const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
    const subtitleInputRef = useRef<HTMLInputElement>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // 2. TTS Voice & Model
    const [voices, setVoices] = useState<Voice[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    const [models, setModels] = useState<string[]>([]);
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

    // --- Effects (Initial API Loads) ---

    // Load available voices
    useEffect(() => {
        fetch('http://localhost:8000/api/voices')
            .then(res => res.json())
            .then(data => {
                if (data.voices && data.voices.length > 0) {
                    setVoices(data.voices);
                    setSelectedVoiceId(data.voices[0].id);
                }
            })
            .catch(err => console.error("Failed to fetch voices:", err));
    }, []);

    // Load available models
    useEffect(() => {
        fetch('http://localhost:8000/api/models')
            .then(res => res.json())
            .then(data => {
                if (data.models && data.models.length > 0) {
                    setModels(data.models);
                    if (!data.models.includes('VibeVoice-1.5B')) {
                        setSelectedModel(data.models[0]);
                    }
                }
            })
            .catch(err => console.error("Failed to fetch models:", err));
    }, []);

    // --- Complex Callbacks ---

    const saveJobDraft = async (customNote?: string, customSegments?: SubtitleSegment[], customFilename?: string) => {
        const segmentsToSave = customSegments || subtitleSegments;
        const fileToSave = customFilename || (subtitleFile ? subtitleFile.name : 'Unknown');

        if (segmentsToSave.length === 0) {
            alert('Please load subtitles first');
            return;
        }

        try {
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

            const res = await fetch('http://localhost:8000/api/jobs/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobData),
            });

            if (res.ok) {
                const savedJob = await res.json();
                if (!customNote) {
                    alert(`Job #${savedJob.id} saved as draft!`);
                }
            } else {
                if (!customNote) alert('Failed to save job');
            }
        } catch (err) {
            console.error('Error saving job:', err);
            if (!customNote) alert('Error saving job');
        }
    };

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
            isProcessing, setIsProcessing,
            setAudioUrl,
            subtitleFile, setSubtitleFile,
            subtitleInputRef,
            errorMsg, setErrorMsg,
            voices, selectedVoiceId, setSelectedVoiceId,
            models, selectedModel, setSelectedModel,
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
            loadJobSegments, saveJobDraft
        }}>
            {children}
        </SubtitleContext.Provider>
    );
};

export const useSubtitleContext = () => {
    const context = useContext(SubtitleContext);
    if (context === undefined) {
        throw new Error('useSubtitleContext must be used within a SubtitleProvider');
    }
    return context;
};
