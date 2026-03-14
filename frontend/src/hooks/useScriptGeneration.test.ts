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

        (useScriptContext as any).mockReturnValue({
            scriptFile: null,
            scriptText: 'Speaker1: Hello',
            speakers: [{ name: 'Speaker1', voiceId: 'voice1' }],
            selectedModel: 'model1',
            setErrorMsg: mockSetErrorMsg
        });

        (useGlobalContext as any).mockReturnValue({
            setIsProcessing: mockSetIsProcessing,
            setAudioUrl: mockSetAudioUrl,
            models: [{ id: 'model1', name: 'Model 1', supports_voice_design: false }],
            selectedLanguage: 'English'
        });
    });

    it('should handle successful generation stream', async () => {
        // Mock task creation response
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ task_id: 'task123' })
        });

        // Mock stream response
        const mockStream = {
            getReader: () => {
                let count = 0;
                return {
                    read: async () => {
                        if (count === 0) {
                            count++;
                            const encoder = new TextDecoder();
                            const data = 'data: {"type": "progress", "progress": 50, "status": "Processing"}\n';
                            return { value: new TextEncoder().encode(data), done: false };
                        }
                        if (count === 1) {
                            count++;
                            const data = 'data: {"type": "complete", "audioBase64": "SGVsbG8="}\n';
                            return { value: new TextEncoder().encode(data), done: false };
                        }
                        return { value: undefined, done: true };
                    }
                };
            }
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            body: mockStream
        });

        const { result } = renderHook(() => useScriptGeneration());

        await act(async () => {
            await result.current.handleGenerate();
        });

        expect(mockSetIsProcessing).toHaveBeenCalledWith(true);
        expect(mockSetIsProcessing).toHaveBeenCalledWith(false);
        expect(mockSetAudioUrl).toHaveBeenCalledWith('blob:url');
        expect(result.current.progressValue).toBe(100);
    });

    it('should handle errors in task creation', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ detail: 'Server Error' })
        });

        const { result } = renderHook(() => useScriptGeneration());

        await act(async () => {
            await result.current.handleGenerate();
        });

        expect(mockSetErrorMsg).toHaveBeenCalledWith('Server Error');
        expect(mockSetIsProcessing).toHaveBeenCalledWith(false);
    });
});
