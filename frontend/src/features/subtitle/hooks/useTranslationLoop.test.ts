import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useTranslationLoop } from './useTranslationLoop';
import { useSubtitleContext } from '../context/SubtitleContext';
import { useTranslationContext } from '../context/TranslationContext';

vi.mock('../context/SubtitleContext');
vi.mock('../context/TranslationContext');

describe('useTranslationLoop', () => {
    const mockSetSubtitleSegments = vi.fn();
    const mockSetSubtitleFile = vi.fn();
    const mockSaveJobDraft = vi.fn();
    
    const mockSetIsTranslating = vi.fn();
    const mockSetHasStartedTranslation = vi.fn();
    const mockSetTranslationProgress = vi.fn();
    const mockSetTranslationLogs = vi.fn();
    const mockSetEstimatedTimeRemaining = vi.fn();
    const mockSetPreviousOriginalText = vi.fn();
    const mockSetPreviousTranslatedText = vi.fn();
    const mockSetCurrentOriginalText = vi.fn();
    const mockSetCurrentTranslatedText = vi.fn();
    const mockIsPausedRef = { current: false };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
        global.alert = vi.fn();
        mockIsPausedRef.current = false;

        (useSubtitleContext as any).mockReturnValue({
            subtitleSegments: [
                { index: 1, start_ms: 0, end_ms: 1000, text: 'Hello', is_translated: false },
                { index: 2, start_ms: 1000, end_ms: 2000, text: 'World', is_translated: false }
            ],
            setSubtitleSegments: mockSetSubtitleSegments,
            subtitleFile: { name: 'test.srt' },
            setSubtitleFile: mockSetSubtitleFile,
            saveJobDraft: mockSaveJobDraft
        });

        (useTranslationContext as any).mockReturnValue({
            targetLanguage: 'Italian',
            selectedOllamaModel: 'llama3',
            setIsTranslating: mockSetIsTranslating,
            setHasStartedTranslation: mockSetHasStartedTranslation,
            setIsPausing: vi.fn(),
            isPausedRef: mockIsPausedRef,
            setTranslationProgress: mockSetTranslationProgress,
            setTranslationLogs: mockSetTranslationLogs,
            setEstimatedTimeRemaining: mockSetEstimatedTimeRemaining,
            setPreviousOriginalText: mockSetPreviousOriginalText,
            setPreviousTranslatedText: mockSetPreviousTranslatedText,
            setCurrentOriginalText: mockSetCurrentOriginalText,
            setCurrentTranslatedText: mockSetCurrentTranslatedText
        });
    });

    it('should translate segments in a loop', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ translated_text: 'Ciao' })
        });

        const { result } = renderHook(() => useTranslationLoop());

        await act(async () => {
            await result.current.runTranslationLoop('prompt');
        });

        // Verify it was called for each untranslated segment
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(mockSetIsTranslating).toHaveBeenCalledWith(true);
        expect(mockSetIsTranslating).toHaveBeenCalledWith(false);
        expect(mockSetTranslationProgress).toHaveBeenCalledWith(100);
        expect(mockSaveJobDraft).toHaveBeenCalled();
    });

    it('should stop translation when paused', async () => {
        (global.fetch as any).mockImplementation(async () => {
            mockIsPausedRef.current = true; // Simulate pause during first fetch
            return {
                ok: true,
                json: async () => ({ translated_text: 'Ciao' })
            };
        });

        const { result } = renderHook(() => useTranslationLoop());

        await act(async () => {
            await result.current.runTranslationLoop('prompt');
        });

        // Should only fetch once because it pauses
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(mockSaveJobDraft).toHaveBeenCalledWith(
            'Translation Paused Draft',
            expect.any(Array),
            expect.any(String)
        );
    });
});
