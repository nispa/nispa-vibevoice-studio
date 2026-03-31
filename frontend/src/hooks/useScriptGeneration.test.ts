import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useScriptGeneration } from './useScriptGeneration';
import { useScriptContext } from '../features/script/context/ScriptContext';
import { useGlobalContext } from '../context/GlobalContext';

vi.mock('../features/script/context/ScriptContext');
vi.mock('../context/GlobalContext');

describe('useScriptGeneration', () => {
    const mockSetIsProcessing = vi.fn();
    const mockSetAudioUrl = vi.fn();
    const mockSetErrorMsg = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
        global.URL.createObjectURL = vi.fn(() => 'blob:url');

        vi.mocked(useScriptContext).mockReturnValue({
            scriptFile: null,
            scriptText: 'Speaker1: Hello',
            speakers: [{ name: 'Speaker1', voiceId: 'voice1' }],
            selectedModel: 'model1',
            setErrorMsg: mockSetErrorMsg
        } as ReturnType<typeof useScriptContext>);

        vi.mocked(useGlobalContext).mockReturnValue({
            setIsProcessing: mockSetIsProcessing,
            setAudioUrl: mockSetAudioUrl,
            models: [{ id: 'model1', name: 'Model 1', supports_voice_design: false }],
            selectedLanguage: 'English'
        } as ReturnType<typeof useGlobalContext>);
    });

    it('should handle successful generation stream', async () => {
        // Mock task creation response
        vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ task_id: 'task123' })
        } as Response);

        // Mock stream response
        const mockStream = {
            getReader: () => {
                let count = 0;
                return {
                    read: async () => {
                        if (count === 0) {
                            count++;
                            const data = 'data: {"type": "progress", "progress": 50, "status": "Processing"}\n';
                            return { value: new TextEncoder().encode(data), done: false };
                        }
                        if (count === 1) {
                            count++;
                            const data = 'data: {"type": "complete", "audioUrl": "/outputs/test.mp3"}\n';
                            return { value: new TextEncoder().encode(data), done: false };
                        }
                        return { value: undefined, done: true };
                    }
                };
            }
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            body: mockStream
        } as Response);

        const { result } = renderHook(() => useScriptGeneration());

        await act(async () => {
            await result.current.handleGenerate();
        });

        expect(mockSetIsProcessing).toHaveBeenCalledWith(true);
        expect(mockSetIsProcessing).toHaveBeenCalledWith(false);
        expect(mockSetAudioUrl).toHaveBeenCalledWith('http://127.0.0.1:8000/outputs/test.mp3');
        expect(result.current.progressValue).toBe(100);
    });

    it('should handle errors in task creation', async () => {
        vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ detail: 'Server Error' })
        } as Response);

        const { result } = renderHook(() => useScriptGeneration());

        await act(async () => {
            await result.current.handleGenerate();
        });

        expect(mockSetErrorMsg).toHaveBeenCalledWith('Server Error');
        expect(mockSetIsProcessing).toHaveBeenCalledWith(false);
    });
});
