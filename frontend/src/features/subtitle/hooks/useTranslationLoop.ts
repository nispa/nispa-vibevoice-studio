import { useSubtitleContext } from '../context/SubtitleContext';
import { useTranslationContext } from '../context/TranslationContext';

/**
 * Custom hook that implements the main translation loop for subtitle segments.
 * 
 * Manages the sequential translation of segments using a local LLM (Ollama),
 * updating global state, logging progress, and providing time estimations.
 * 
 * @returns {object} Functions to start and stop the translation loop.
 */
export const useTranslationLoop = () => {
    const {
        subtitleSegments,
        setSubtitleSegments,
        subtitleFile,
        setSubtitleFile,
        saveJobDraft
    } = useSubtitleContext();

    const {
        targetLanguage,
        selectedOllamaModel,
        setIsTranslating,
        setHasStartedTranslation,
        setIsPausing,
        isPausedRef,
        setTranslationProgress,
        setTranslationLogs,
        setEstimatedTimeRemaining,
        setPreviousOriginalText,
        setPreviousTranslatedText,
        setCurrentOriginalText,
        setCurrentTranslatedText
    } = useTranslationContext();

    /**
     * Signals the translation loop to stop after the current segment finishes.
     */
    const stopTranslation = () => {
        setIsPausing(true);
        isPausedRef.current = true;
    };

    /**
     * Executes the translation loop over all untranslated subtitle segments.
     * 
     * Iterates through segments, calls the backend translation API, updates progress,
     * and handles auto-saving to the job archive.
     * 
     * @param {string} customPrompt - The user-defined prompt template for translation.
     * @param {string} sourceCode - NLLB source language code.
     * @param {string} targetCode - NLLB target language code.
     */
    const runTranslationLoop = async (customPrompt: string, sourceCode: string = 'eng_Latn', targetCode: string = 'ita_Latn') => {
        setIsTranslating(true);
        setHasStartedTranslation(true);
        setIsPausing(false);
        isPausedRef.current = false;
        setTranslationProgress(0);
        setTranslationLogs([]);
        setEstimatedTimeRemaining(null);

        const addTransLog = (msg: string) => {
            const time = new Date().toLocaleTimeString();
            setTranslationLogs(prev => [...prev, `[${time}] ${msg}`]);
        };

        addTransLog(`Starting translation (${sourceCode} -> ${targetCode}) using ${selectedOllamaModel}...`);

        try {
            const totalSegments = subtitleSegments.length;
            const CHUNK_SIZE = 10;
            let processedSegments = 0;
            let updatedSegments = [...subtitleSegments];

            for (let i = 0; i < totalSegments; i += CHUNK_SIZE) {
                // Check if user paused
                if (isPausedRef.current) {
                    addTransLog("⏸ Translation paused by user.");
                    setIsTranslating(false);
                    setIsPausing(false);
                    return;
                }

                const chunk = subtitleSegments.slice(i, i + CHUNK_SIZE);
                addTransLog(`Translating segments ${i + 1} to ${Math.min(i + CHUNK_SIZE, totalSegments)}...`);

                const fd = new FormData();
                fd.append('segments_json', JSON.stringify(chunk));
                fd.append('target_language', targetCode);
                fd.append('source_language', sourceCode);
                fd.append('model_name', selectedOllamaModel);

                const res = await fetch('http://127.0.0.1:8000/api/translate-batch', {
                    method: 'POST', body: fd
                });

                if (res.ok) {
                    const data = await res.json();
                    const translatedChunk = data.segments;
                    
                    // Merge translated chunk back into updatedSegments
                    for (let j = 0; j < translatedChunk.length; j++) {
                        updatedSegments[i + j] = translatedChunk[j];
                    }

                    // Update UI state for current items
                    if (translatedChunk.length > 0) {
                        const lastTrans = translatedChunk[translatedChunk.length - 1];
                        setPreviousOriginalText(setCurrentOriginalText(lastTrans.original_text || ''));
                        setPreviousTranslatedText(setCurrentTranslatedText(lastTrans.text || ''));
                    }

                    processedSegments += chunk.length;
                    const progress = Math.round((processedSegments / totalSegments) * 100);
                    setTranslationProgress(progress);
                    
                    // Update main segments state to show changes in the editor/UI
                    setSubtitleSegments([...updatedSegments]);
                } else {
                    const errData = await res.json();
                    throw new Error(errData.detail || "Chunk translation failed");
                }
            }

            setTranslationProgress(100);
            addTransLog(`✓ All ${totalSegments} segments translated successfully.`);

            // Update pseudo file info
            const baseName = subtitleFile ? subtitleFile.name.replace(/\.[^/.]+$/, "") : "translated_subtitles";
            const newFilename = `${baseName}_${targetCode}.srt`;
            const translatedFile = new File([], newFilename, { type: 'text/plain' });
            setSubtitleFile(translatedFile);

            // Final save to Job Archive
            saveJobDraft(`Fully translated to ${targetCode} (Offline)`, updatedSegments, newFilename);
            
            setTimeout(() => {
                alert(`Translation to ${targetCode} complete! Saved to Job Archive.`);
                setIsTranslating(false);
            }, 500);

        } catch (e) {
            console.error(e);
            addTransLog(`✗ Error during translation: ${String(e)}`);
            setIsTranslating(false);
            alert(`Translation error: ${String(e)}`);
        }
    };

    return { runTranslationLoop, stopTranslation };
};
