import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

/**
 * Represents a speaker identified in a script and their assigned voice.
 */
export interface Speaker {
    id: string;
    name: string;
    voiceId: string;
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
}

const ScriptContext = createContext<ScriptContextProps | undefined>(undefined);

/**
 * Context Provider for managing the state of script-based audio generation.
 * 
 * Tracks the script file/text, identified speakers, voice assignments, 
 * selected model, and error messages.
 * 
 * @param {object} props - Component props.
 * @param {ReactNode} props.children - Child components to be wrapped.
 */
export const ScriptProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [scriptFile, setScriptFile] = useState<File | null>(null);
    const [scriptText, setScriptText] = useState<string>('');
    const [speakers, setSpeakers] = useState<Speaker[]>([
        { id: '1', name: 'Speaker1', voiceId: '' }
    ]);
    const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('VibeVoice-1.5B');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('Italian');
    const [voiceDescription, setVoiceDescription] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState('');

    /**
     * Synchronizes detected speakers into the speakers list whenever 
     * the parser identifies new names in the script content.
     */
    useEffect(() => {
        if (detectedSpeakers.length > 0) {
            const newSpeakers = detectedSpeakers.map(name => ({
                id: `${name}-${Date.now()}-${Math.random()}`,
                name,
                voiceId: ''
            }));
            setSpeakers(newSpeakers);
        }
    }, [detectedSpeakers]);

    return (
        <ScriptContext.Provider value={{
            scriptFile, setScriptFile,
            scriptText, setScriptText,
            speakers, setSpeakers,
            detectedSpeakers, setDetectedSpeakers,
            selectedModel, setSelectedModel,
            selectedLanguage, setSelectedLanguage,
            voiceDescription, setVoiceDescription,
            errorMsg, setErrorMsg
        }}>
            {children}
        </ScriptContext.Provider>
    );
};

/**
 * Hook to access the script context.
 * 
 * @returns {ScriptContextProps} The script context values.
 * @throws {Error} If used outside of a ScriptProvider.
 */
export const useScriptContext = () => {
    const context = useContext(ScriptContext);
    if (context === undefined) {
        throw new Error('useScriptContext must be used within a ScriptProvider');
    }
    return context;
};
