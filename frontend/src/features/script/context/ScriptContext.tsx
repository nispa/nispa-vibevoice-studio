import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Job } from '../../../hooks/useJobArchive';

/**
 * Represents a speaker identified in a script and their assigned voice.
 */
export interface Speaker {
    id: string;
    name: string;
    voiceId: string;
}

const DRAFT_STORAGE_KEY = 'nispa_script_draft_v1';

interface ScriptDraft {
    scriptText: string;
    speakers: Speaker[];
    selectedModel: string;
    selectedLanguage: string;
    voiceDescription: string;
}

function loadDraft(): Partial<ScriptDraft> {
    try {
        const item = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (item) {
            return JSON.parse(item);
        }
    } catch (e) {
        console.warn('Failed to load script draft from localStorage', e);
    }
    return {};
}

/**
 * Properties provided by the ScriptContext.
 */
interface ScriptContextProps {
    scriptFile: File | null;
    setScriptFile: (file: File | null) => void;
    scriptText: string;
    setScriptText: (text: string) => void;
    speakers: Speaker[];
    setSpeakers: (speakers: Speaker[] | ((prev: Speaker[]) => Speaker[])) => void;
    detectedSpeakers: string[];
    setDetectedSpeakers: (speakers: string[]) => void;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    selectedLanguage: string;
    setSelectedLanguage: (lang: string) => void;
    voiceDescription: string;
    setVoiceDescription: (desc: string) => void;
    errorMsg: string;
    setErrorMsg: (msg: string) => void;
    clearDraft: () => void;
    loadFromScriptJob: (job: Job) => void;
    hasDraft: boolean;
}

const ScriptContext = createContext<ScriptContextProps | undefined>(undefined);

/**
 * Context Provider for managing the state of script-based audio generation.
 * 
 * Auto-persists drafts to localStorage and allows restoring past script jobs.
 */
export const ScriptProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const initialDraft = useMemo(() => loadDraft(), []);

    const [scriptFile, setScriptFile] = useState<File | null>(null);
    const [scriptText, setScriptText] = useState<string>(initialDraft.scriptText || '');
    const [speakers, setSpeakers] = useState<Speaker[]>(
        initialDraft.speakers && initialDraft.speakers.length > 0
            ? initialDraft.speakers
            : [{ id: '1', name: 'Speaker1', voiceId: '' }]
    );
    const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>(
        initialDraft.selectedModel || 'qwen3-1.7b-base'
    );
    const [selectedLanguage, setSelectedLanguage] = useState<string>(
        initialDraft.selectedLanguage || 'English'
    );
    const [voiceDescription, setVoiceDescription] = useState<string>(
        initialDraft.voiceDescription || ''
    );
    const [errorMsg, setErrorMsg] = useState('');

    /**
     * Synchronizes detected speakers into the speakers list whenever 
     * the parser identifies new names in the script content, preserving existing voice assignments.
     */
    useEffect(() => {
        if (detectedSpeakers.length > 0) {
            setSpeakers(prev => {
                const existingMap = new Map(prev.map(s => [s.name, s.voiceId]));
                return detectedSpeakers.map(name => ({
                    id: `${name}-${Date.now()}-${Math.random()}`,
                    name,
                    voiceId: existingMap.get(name) || ''
                }));
            });
        }
    }, [detectedSpeakers]);

    /**
     * Auto-save draft to localStorage whenever relevant state changes.
     */
    useEffect(() => {
        try {
            if (scriptText.trim().length > 0 || speakers.some(s => s.voiceId)) {
                const draft: ScriptDraft = {
                    scriptText,
                    speakers,
                    selectedModel,
                    selectedLanguage,
                    voiceDescription
                };
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
            }
        } catch (e) {
            console.warn('Failed to save script draft to localStorage', e);
        }
    }, [scriptText, speakers, selectedModel, selectedLanguage, voiceDescription]);

    const clearDraft = useCallback(() => {
        setScriptText('');
        setScriptFile(null);
        setSpeakers([{ id: '1', name: 'Speaker1', voiceId: '' }]);
        setDetectedSpeakers([]);
        setVoiceDescription('');
        try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (e) {
            console.warn('Failed to clear script draft from localStorage', e);
        }
    }, []);

    const loadFromScriptJob = useCallback((job: Job) => {
        let rawText = '';
        let speakerMap: Record<string, string> = {};

        if (job.notes) {
            try {
                const parsed = JSON.parse(job.notes);
                rawText = parsed.raw_script || '';
                speakerMap = parsed.speaker_voice_map || {};
            } catch (e) {
                // Ignore parse errors
            }
        }

        if (!rawText && job.modified_segments && job.modified_segments.length > 0) {
            rawText = job.modified_segments
                .map(s => `${s.original_text || 'Speaker'}: ${s.text}`)
                .join('\n\n');
        }

        if (rawText) {
            setScriptText(rawText);
        }
        if (job.model_name) {
            setSelectedModel(job.model_name);
        }
        if (job.language) {
            setSelectedLanguage(job.language);
        }

        if (Object.keys(speakerMap).length > 0) {
            const restoredSpeakers: Speaker[] = Object.entries(speakerMap).map(([name, voiceId]) => ({
                id: `${name}-${Date.now()}-${Math.random()}`,
                name,
                voiceId,
            }));
            setSpeakers(restoredSpeakers);
        }
    }, []);

    const hasDraft = scriptText.trim().length > 0;

    const contextValue = useMemo(() => ({
        scriptFile, setScriptFile,
        scriptText, setScriptText,
        speakers, setSpeakers,
        detectedSpeakers, setDetectedSpeakers,
        selectedModel, setSelectedModel,
        selectedLanguage, setSelectedLanguage,
        voiceDescription, setVoiceDescription,
        errorMsg, setErrorMsg,
        clearDraft,
        loadFromScriptJob,
        hasDraft
    }), [
        scriptFile,
        scriptText,
        speakers,
        detectedSpeakers,
        selectedModel,
        selectedLanguage,
        voiceDescription,
        errorMsg,
        clearDraft,
        loadFromScriptJob,
        hasDraft
    ]);

    return (
        <ScriptContext.Provider value={contextValue}>
            {children}
        </ScriptContext.Provider>
    );
};

export const useScriptContext = () => {
    const context = useContext(ScriptContext);
    if (context === undefined) {
        throw new Error('useScriptContext must be used within a ScriptProvider');
    }
    return context;
};
