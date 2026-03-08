import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

export interface TranslationContextProps {
    // Configuration
    targetLanguage: string;
    setTargetLanguage: (l: string) => void;
    ollamaModels: string[];
    selectedOllamaModel: string;
    setSelectedOllamaModel: (m: string) => void;

    // Runtime State
    isTranslating: boolean;
    setIsTranslating: (b: boolean) => void;
    isPausedRef: React.MutableRefObject<boolean>;
    translationProgress: number;
    setTranslationProgress: React.Dispatch<React.SetStateAction<number>>;
    showTranslationModal: boolean;
    setShowTranslationModal: (b: boolean) => void;
    translationLogs: string[];
    setTranslationLogs: React.Dispatch<React.SetStateAction<string[]>>;
    currentOriginalText: string;
    setCurrentOriginalText: (t: string) => void;
    currentTranslatedText: string;
    setCurrentTranslatedText: (t: string) => void;
    previousOriginalText: string;
    setPreviousOriginalText: (t: string) => void;
    previousTranslatedText: string;
    setPreviousTranslatedText: (t: string) => void;
    estimatedTimeRemaining: number | null;
    setEstimatedTimeRemaining: React.Dispatch<React.SetStateAction<number | null>>;
    isPausing: boolean;
    setIsPausing: (b: boolean) => void;
    hasStartedTranslation: boolean;
    setHasStartedTranslation: (b: boolean) => void;
}

const TranslationContext = createContext<TranslationContextProps | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. Configuration
    const [targetLanguage, setTargetLanguage] = useState<string>('English');
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);
    const [selectedOllamaModel, setSelectedOllamaModel] = useState<string>('');

    // 2. Runtime State
    const [isTranslating, setIsTranslating] = useState(false);
    const isPausedRef = useRef(false);
    const [translationProgress, setTranslationProgress] = useState(0);
    const [showTranslationModal, setShowTranslationModal] = useState(false);
    const [translationLogs, setTranslationLogs] = useState<string[]>([]);
    const [currentOriginalText, setCurrentOriginalText] = useState('');
    const [currentTranslatedText, setCurrentTranslatedText] = useState('');
    const [previousOriginalText, setPreviousOriginalText] = useState('');
    const [previousTranslatedText, setPreviousTranslatedText] = useState('');
    const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
    const [isPausing, setIsPausing] = useState(false);
    const [hasStartedTranslation, setHasStartedTranslation] = useState(false);

    // Load Ollama models for translation
    useEffect(() => {
        fetch('http://localhost:8000/api/ollama/models')
            .then(res => res.json())
            .then(data => {
                if (data.models && data.models.length > 0) {
                    setOllamaModels(data.models);
                    if (data.models.includes('huihui_ai/hy-mt1.5')) {
                        setSelectedOllamaModel('huihui_ai/hy-mt1.5');
                    } else if (data.models.includes('llama3')) {
                        setSelectedOllamaModel('llama3');
                    } else {
                        setSelectedOllamaModel(data.models[0]);
                    }
                }
            })
            .catch(err => console.error("Failed to fetch Ollama models:", err));
    }, []);

    return (
        <TranslationContext.Provider value={{
            targetLanguage, setTargetLanguage,
            ollamaModels, selectedOllamaModel, setSelectedOllamaModel,
            isTranslating, setIsTranslating,
            isPausedRef,
            translationProgress, setTranslationProgress,
            showTranslationModal, setShowTranslationModal,
            translationLogs, setTranslationLogs,
            currentOriginalText, setCurrentOriginalText,
            currentTranslatedText, setCurrentTranslatedText,
            previousOriginalText, setPreviousOriginalText,
            previousTranslatedText, setPreviousTranslatedText,
            estimatedTimeRemaining, setEstimatedTimeRemaining,
            isPausing, setIsPausing,
            hasStartedTranslation, setHasStartedTranslation
        }}>
            {children}
        </TranslationContext.Provider>
    );
};

export const useTranslationContext = () => {
    const context = useContext(TranslationContext);
    if (context === undefined) {
        throw new Error('useTranslationContext must be used within a TranslationProvider');
    }
    return context;
};
