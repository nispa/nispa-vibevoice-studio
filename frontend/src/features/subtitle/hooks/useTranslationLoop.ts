import { useSubtitleContext } from '../context/SubtitleContext';
import { useTranslationContext } from '../context/TranslationContext';

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

    const stopTranslation = () => {
        setIsPausing(true);
        isPausedRef.current = true;
    };

    const runTranslationLoop = async (customPrompt: string) => {
        let currentSegments = [...subtitleSegments];

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

        addTransLog(`Starting translation to ${targetLanguage} using model ${selectedOllamaModel}...`);

        let translatedCount = currentSegments.filter(s => s.is_translated).length;
        setTranslationProgress(Math.round((translatedCount / currentSegments.length) * 100));
        let hasError = false;

        const startTime = Date.now();
        let sessionTranslatedCount = 0;

        for (let i = 0; i < currentSegments.length; i++) {
            if (isPausedRef.current) break;

            const seg = currentSegments[i];
            if (seg.is_translated) continue;

            const prevTranslated = currentSegments.slice(0, i).reverse().find(s => s.is_translated);
            if (prevTranslated) {
                setPreviousOriginalText(prevTranslated.original_text || prevTranslated.text);
                setPreviousTranslatedText(prevTranslated.text);
            } else {
                setPreviousOriginalText('');
                setPreviousTranslatedText('');
            }

            setCurrentOriginalText(seg.text);
            setCurrentTranslatedText('');
            addTransLog(`Translating segment ${seg.index}...`);

            try {
                const fd = new FormData();
                fd.append('text', seg.text);
                fd.append('target_language', targetLanguage);
                fd.append('model_name', selectedOllamaModel);
                fd.append('prompt', customPrompt);

                const res = await fetch('http://localhost:8000/api/translate-segment', {
                    method: 'POST', body: fd
                });

                if (res.ok) {
                    const data = await res.json();
                    currentSegments[i] = {
                        ...seg,
                        original_text: seg.original_text || seg.text,
                        text: data.translated_text,
                        is_translated: true
                    };

                    setSubtitleSegments([...currentSegments]); // force update
                    setCurrentTranslatedText(data.translated_text);
                    addTransLog(`✓ Segment ${seg.index} translated.`);

                    translatedCount++;
                    sessionTranslatedCount++;
                    setTranslationProgress(Math.round((translatedCount / currentSegments.length) * 100));

                    const elapsed = Date.now() - startTime;
                    const avgTime = elapsed / sessionTranslatedCount;
                    const remainingSegments = currentSegments.length - translatedCount;
                    setEstimatedTimeRemaining((avgTime * remainingSegments) / 1000);
                } else {
                    console.error(`Failed to translate segment ${seg.index}`);
                    addTransLog(`✗ Failed to translate segment ${seg.index}`);
                    hasError = true;
                    break;
                }
            } catch (e) {
                console.error(e);
                addTransLog(`✗ Error translating segment ${seg.index}: ${String(e)}`);
                hasError = true;
                break;
            }
        }

        setIsTranslating(false);

        // Auto-save logic
        const baseName = subtitleFile ? subtitleFile.name.replace(/\.[^/.]+$/, "") : "translated_subtitles";
        const newFilename = `${baseName}_${targetLanguage}.srt`;

        // Update pseudo file so user knows translation is attached
        const translatedFile = new File([], newFilename, { type: 'text/plain' });
        setSubtitleFile(translatedFile);

        if (isPausedRef.current) {
            saveJobDraft('Translation Paused Draft', currentSegments, newFilename);
        } else if (!hasError) {
            saveJobDraft(`Fully translated to ${targetLanguage}`, currentSegments, newFilename);
            alert(`Translation to ${targetLanguage} complete! Saved to Job Archive.`);
        } else {
            alert('Translation encountered an error and paused. State saved.');
            saveJobDraft('Translation Error Draft', currentSegments, newFilename);
        }
    };

    return { runTranslationLoop, stopTranslation };
};
