import { useState, useEffect } from 'react';
import type { Voice, Model } from '../../../context/GlobalContext';
import { useGlobalContext } from '../../../context/GlobalContext';

/**
 * Hook that manages voice, model, and language selection for generation.
 * The default model is picked dynamically from installed models,
 * with priority: Qwen3 Base > Qwen3 CustomVoice > any Qwen3 > VibeVoice.
 */
export const useTtsSelection = (voices: Voice[]) => {
    const { models } = useGlobalContext();
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('Italian');

    // Auto-select the first available model with Qwen3 priority
    useEffect(() => {
        if (models.length === 0) return;
        if (selectedModel && models.find(m => m.id === selectedModel)) return;

        const priority = [
            (m: Model) => m.id.includes('Qwen') && m.id.includes('Base'),
            (m: Model) => m.id.includes('Qwen') && m.id.includes('CustomVoice'),
            (m: Model) => m.id.includes('Qwen'),
            (m: Model) => !m.id.includes('Tokenizer'),
            (_: Model) => true,
        ];

        for (const check of priority) {
            const found = models.find(check);
            if (found) {
                setSelectedModel(found.id);
                break;
            }
        }
    }, [models, selectedModel]);

    // Auto-select the first available voice
    useEffect(() => {
        if (voices.length > 0 && !selectedVoiceId) {
            setSelectedVoiceId(voices[0].id);
        }
    }, [voices, selectedVoiceId]);

    return {
        selectedVoiceId,
        setSelectedVoiceId,
        selectedModel,
        setSelectedModel,
        selectedLanguage,
        setSelectedLanguage,
    };
};
