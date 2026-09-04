import { useState } from 'react';
import type { Voice, Model } from '../../../context/GlobalContext';
import { useGlobalContext } from '../../../context/GlobalContext';

/**
 * Hook that manages voice, model, and language selection for generation.
 * Priorities are capability-driven (voice-clone capable > general models).
 */
export const useTtsSelection = (voices: Voice[]) => {
    const { models } = useGlobalContext();
    const [userVoiceId, setSelectedVoiceId] = useState<string>('');
    const [userModel, setSelectedModel] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('Italian');

    // Resolve active model based on user selection or capability priority
    const resolvedModel = (() => {
        if (userModel && models.some(m => m.id === userModel)) {
            return userModel;
        }
        if (models.length === 0) return '';
        // Capability-driven priority: voice cloning capable > first available installed model
        const best = models.find((m: Model) => m.supports_voice_clone) || models[0];
        return best ? best.id : '';
    })();

    // Resolve active voice based on user selection or first available voice
    const resolvedVoiceId = (() => {
        if (userVoiceId && voices.some(v => v.id === userVoiceId)) {
            return userVoiceId;
        }
        return voices[0] ? voices[0].id : '';
    })();

    return {
        selectedVoiceId: resolvedVoiceId,
        setSelectedVoiceId,
        selectedModel: resolvedModel,
        setSelectedModel,
        selectedLanguage,
        setSelectedLanguage,
    };
};
