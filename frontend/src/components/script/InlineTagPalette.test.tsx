import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ScriptInputArea from './ScriptInputArea';
import { useGlobalContext } from '../../context/GlobalContext';
import { useScriptContext } from '../../features/script/context/ScriptContext';

vi.mock('../../context/GlobalContext', () => ({ useGlobalContext: vi.fn() }));
vi.mock('../../features/script/context/ScriptContext', () => ({ useScriptContext: vi.fn() }));

const tags = [
    { token: '[laughter]', label: 'Laughter', description: 'Risata' },
    { token: '[sigh]', label: 'Sigh', description: 'Sospiro' },
];

function setup() {
    const setScriptText = vi.fn();
    const context = {
        scriptText: 'Alice: Hello there.', scriptFile: null,
        setScriptText, setDetectedSpeakers: vi.fn(), selectedModel: 'arbitrary-id',
    };
    vi.mocked(useGlobalContext).mockReturnValue({ models: [
        { id: 'arbitrary-id', name: 'Expressive model', inline_tags: tags,
          inline_tag_guidance: 'Vocalizzazioni, non comandi emotivi.' },
        { id: 'plain', name: 'Plain model' },
        { id: 'legacy', name: 'Legacy model', supports_emotion_tags: true },
    ] } as unknown as ReturnType<typeof useGlobalContext>);
    vi.mocked(useScriptContext).mockReturnValue(context as unknown as ReturnType<typeof useScriptContext>);
    return { context, setScriptText };
}

describe('Capability-driven inline tag menu', () => {
    it('inserts the exact token at the selection without Higgs controls', () => {
        const { setScriptText } = setup();
        render(<ScriptInputArea />);
        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        textarea.setSelectionRange(7, 12);
        fireEvent.click(screen.getByRole('button', { name: /Tag Palette:/ }));
        expect(screen.queryByRole('button', { name: 'Anger' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Laughter' }));
        expect(setScriptText).toHaveBeenCalledWith('Alice: [laughter] there.');
    });

    it('opens the model guide and inserts a token from it', () => {
        const { setScriptText } = setup();
        render(<ScriptInputArea />);
        (screen.getByRole('textbox') as HTMLTextAreaElement).setSelectionRange(19, 19);
        fireEvent.click(screen.getByRole('button', { name: /Guida Sintassi/ }));
        expect(screen.getByText('Vocalizzazioni, non comandi emotivi.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /\[sigh\].*Inserisci/ }));
        expect(setScriptText).toHaveBeenCalledWith('Alice: Hello there.[sigh]');
        expect(screen.queryByText('Guida tag: Expressive model')).not.toBeInTheDocument();
    });

    it('resets the palette when switching models and leaves the script unchanged', () => {
        const { context, setScriptText } = setup();
        const view = render(<ScriptInputArea />);
        fireEvent.click(screen.getByRole('button', { name: /Tag Palette:/ }));
        context.selectedModel = 'legacy';
        view.rerender(<ScriptInputArea />);
        fireEvent.click(screen.getByRole('button', { name: /Tag Palette:/ }));
        expect(screen.getByRole('button', { name: 'Anger' })).toBeInTheDocument();
        context.selectedModel = 'plain';
        view.rerender(<ScriptInputArea />);
        expect(screen.queryByRole('button', { name: /Tag Palette:/ })).not.toBeInTheDocument();
        expect(setScriptText).not.toHaveBeenCalled();
    });
});
