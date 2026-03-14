import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ScriptMode from './index';
import { useGlobalContext } from '../../context/GlobalContext';
import { useScriptContext } from './context/ScriptContext';

vi.mock('../../context/GlobalContext');
vi.mock('./context/ScriptContext', () => ({
    ScriptProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useScriptContext: vi.fn()
}));
vi.mock('../../hooks/useScriptGeneration', () => ({
    useScriptGeneration: () => ({
        showProgressModal: false,
        setShowProgressModal: vi.fn(),
        progressMessages: [],
        progressValue: 0,
        handleGenerate: vi.fn(),
        handleCancelGeneration: vi.fn()
    })
}));

describe('ScriptMode - Voice Design Visibility', () => {
    const mockModels = [
        { id: 'qwen-base', name: 'Qwen Base', supports_voice_design: false },
        { id: 'qwen-voice-design', name: 'Qwen Voice Design', supports_voice_design: true }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (useGlobalContext as any).mockReturnValue({
            isProcessing: false,
            models: mockModels,
            voices: []
        });
    });
it('hides Voice Design field when model does not support it', () => {
    (useScriptContext as any).mockReturnValue({
        scriptFile: null,
        scriptText: 'Speaker1: Hello',
        speakers: [{ id: 's1', name: 'Speaker1', voiceId: 'voice1' }],
        selectedModel: 'qwen-base',
        setSelectedModel: vi.fn(),
        selectedLanguage: 'English',
        setSelectedLanguage: vi.fn(),
        voiceDescription: '',
        setVoiceDescription: vi.fn(),
        errorMsg: ''
    });

    render(<ScriptMode />);
    // The title 'Voice Design' as a heading should not be there
    const vdHeading = screen.queryAllByText(/Voice Design/i).find(el => el.tagName === 'H4');
    expect(vdHeading).toBeUndefined();
    expect(screen.queryByPlaceholderText(/Enter voice description/i)).not.toBeInTheDocument();
});

it('shows Voice Design field when model supports it', () => {
    (useScriptContext as any).mockReturnValue({
        scriptFile: null,
        scriptText: 'Speaker1: Hello',
        speakers: [{ id: 's1', name: 'Speaker1', voiceId: 'voice1' }],
        selectedModel: 'qwen-voice-design',
        setSelectedModel: vi.fn(),
        selectedLanguage: 'English',
        setSelectedLanguage: vi.fn(),
        voiceDescription: '',
        setVoiceDescription: vi.fn(),
        errorMsg: ''
    });

    render(<ScriptMode />);

    // Find the H4 heading specifically
    const vdHeading = screen.getAllByText(/Voice Design/i).find(el => el.tagName === 'H4');
    expect(vdHeading).toBeDefined();
    expect(screen.getByPlaceholderText(/Enter voice description/i)).toBeInTheDocument();
});
});
