import { useState, useRef, useCallback } from 'react';

/**
 * Hook that encapsulates the numeric progress state for subtitle generation,
 * including ETA calculation.
 *
 * @returns State, setters, and helpers for generation progress tracking.
 */
export const useGenerationProgress = () => {
    const [generationProgress, setGenerationProgress] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [currentItems, setCurrentItems] = useState(0);
    const [estimatedTime, setEstimatedTime] = useState('--:--');
    const lastBatchEndRef = useRef<number>(0);
    const lastBatchCurrentRef = useRef<number>(0);

    const recordStartTime = useCallback(() => {
        lastBatchEndRef.current = Date.now();
        lastBatchCurrentRef.current = 0;
    }, []);

    /**
     * Updates item-level progress and computes the ETA string.
     * ETA is based on the duration of the last completed batch only,
     * not the cumulative average (which is skewed by model load time).
     */
    const updateItemProgress = useCallback((current: number, total: number) => {
        setTotalItems(total);
        setCurrentItems(current);
        setGenerationProgress((current / total) * 100);

        const now = Date.now();
        const remaining = total - current;
        const batchItems = current - lastBatchCurrentRef.current;

        if (lastBatchEndRef.current > 0 && batchItems > 0 && remaining > 0) {
            const batchDuration = (now - lastBatchEndRef.current) / 1000;
            const secPerItem = batchDuration / batchItems;
            const etaSec = Math.round(remaining * secPerItem);
            if (etaSec < 60) {
                setEstimatedTime(`${etaSec}s`);
            } else if (etaSec < 3600) {
                const m = Math.floor(etaSec / 60);
                const s = etaSec % 60;
                setEstimatedTime(s > 0 ? `${m}m ${s}s` : `${m}m`);
            } else {
                const h = Math.floor(etaSec / 3600);
                const m = Math.floor((etaSec % 3600) / 60);
                setEstimatedTime(m > 0 ? `${h}h ${m}m` : `${h}h`);
            }
        } else if (remaining === 0) {
            setEstimatedTime('done');
        }

        lastBatchEndRef.current = now;
        lastBatchCurrentRef.current = current;
    }, []);

    const resetProgress = useCallback(() => {
        setGenerationProgress(0);
        setTotalItems(0);
        setCurrentItems(0);
        setEstimatedTime('--:--');
        lastBatchEndRef.current = 0;
        lastBatchCurrentRef.current = 0;
    }, []);

    return {
        generationProgress,
        setGenerationProgress,
        totalItems,
        currentItems,
        estimatedTime,
        recordStartTime,
        updateItemProgress,
        resetProgress,
    };
};
