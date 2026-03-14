import { createContext, useContext, useState, useRef, useEffect } from 'react';
import type { ReactNode, MutableRefObject, Dispatch, SetStateAction, FC } from 'react';

/**
 * Properties provided by the TranslationContext.
 */
export interface TranslationContextProps {
    // Configuration
    sourceLanguage: string;
    setSourceLanguage: (l: string) => void;
    targetLanguage: string;
    setTargetLanguage: (l: string) => void;
    ollamaModels: string[];
    selectedOllamaModel: string;
    setSelectedOllamaModel: (m: string) => void;

    // Runtime State
    isTranslating: boolean;
    setIsTranslating: (b: boolean) => void;
    isPausedRef: MutableRefObject<boolean>;
    translationProgress: number;
    setTranslationProgress: Dispatch<SetStateAction<number>>;
    showTranslationModal: boolean;
    setShowTranslationModal: (b: boolean) => void;
    translationLogs: string[];
    setTranslationLogs: Dispatch<SetStateAction<string[]>>;
    currentOriginalText: string;
    setCurrentOriginalText: (t: string) => void;
    currentTranslatedText: string;
    setCurrentTranslatedText: (t: string) => void;
    previousOriginalText: string;
    setPreviousOriginalText: (t: string) => void;
    previousTranslatedText: string;
    setPreviousTranslatedText: (t: string) => void;
    estimatedTimeRemaining: number | null;
    setEstimatedTimeRemaining: Dispatch<SetStateAction<number | null>>;
    isPausing: boolean;
    setIsPausing: (b: boolean) => void;
    hasStartedTranslation: boolean;
    setHasStartedTranslation: (b: boolean) => void;
    
    // Refresh models
    refreshOllamaModels: () => Promise<void>;
    isLoadingModels: boolean;
}

const TranslationContext = createContext<TranslationContextProps | undefined>(undefined);

/**
 * Context Provider for managing the LLM-based translation process.
 * 
 * Tracks target language, available Ollama models, translation progress, 
 * logs, and real-time text being processed.
 * 
 * @param {object} props - Component props.
 * @param {ReactNode} props.children - Child components to be wrapped.
 */
export const TranslationProvider: FC<{ children: ReactNode }> = ({ children }) => {
    // 1. Configuration
    const [sourceLanguage, setSourceLanguage] = useState<string>('English');
    const [targetLanguage, setTargetLanguage] = useState<string>('Italian');
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);
    const [selectedOllamaModel, setSelectedOllamaModel] = useState<string>('');
    const [isLoadingModels, setIsLoadingModels] = useState(false);

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

    /**
     * Fetches available translation models from the backend.
     */
    const refreshOllamaModels = async () => {
        setIsLoadingModels(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/ollama/models');
            if (res.ok) {
                const data = await res.json();
                if (data.models && data.models.length > 0) {
                    setOllamaModels(data.models);
                    setSelectedOllamaModel(data.models[0]);
                }
            }
        } catch (err) {
            console.error('Failed to load translation models:', err);
        } finally {
            setIsLoadingModels(false);
        }
    };

    useEffect(() => {
        refreshOllamaModels();
    }, []);

    return (
        <TranslationContext.Provider value={{
            sourceLanguage, setSourceLanguage,
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
            hasStartedTranslation, setHasStartedTranslation,
            refreshOllamaModels, isLoadingModels
        }}>
            {children}
        </TranslationContext.Provider>
    );
};

/**
 * Hook to access the translation context.
 * 
 * @returns {TranslationContextProps} The translation context values.
 * @throws {Error} If used outside of a TranslationProvider.
 */
export const useTranslationContext = () => {
    const context = useContext(TranslationContext);
    if (context === undefined) {
        throw new Error('useTranslationContext must be used within a TranslationProvider');
    }
    return context;
};
