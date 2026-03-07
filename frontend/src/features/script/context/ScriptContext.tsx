import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface Speaker {
    id: string;
    name: string;
    voiceId: string;
}

interface ScriptContextProps {
    scriptFile: File | null;
    setScriptFile: (file: File | null) => void;
    scriptText: string;
    setScriptText: (text: string) => void;
    speakers: Speaker[];
    setSpeakers: (speakers: Speaker[] | ((prev: Speaker[]) => Speaker[])) => void;
    detectedSpeakers: string[];
    setDetectedSpeakers: (speakers: string[]) => void;
    models: string[];
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    errorMsg: string;
    setErrorMsg: (msg: string) => void;
}

const ScriptContext = createContext<ScriptContextProps | undefined>(undefined);

export const ScriptProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [scriptFile, setScriptFile] = useState<File | null>(null);
    const [scriptText, setScriptText] = useState<string>('');
    const [speakers, setSpeakers] = useState<Speaker[]>([
        { id: '1', name: 'Speaker1', voiceId: '' }
    ]);
    const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([]);
    const [models, setModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('VibeVoice-1.5B');
    const [errorMsg, setErrorMsg] = useState('');

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

    // Sync detected speakers to speakers list with default voice
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
            models,
            selectedModel, setSelectedModel,
            errorMsg, setErrorMsg
        }}>
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
