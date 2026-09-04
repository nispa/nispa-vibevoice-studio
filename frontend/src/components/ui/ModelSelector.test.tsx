import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import ModelSelector from './ModelSelector';
import type { Model } from '../../context/GlobalContext';

describe('ModelSelector', () => {
    const mockModels: Model[] = [
        {
            id: 'vibevoice',
            name: 'VibeVoice-Streaming',
            engine: 'vibevoice',
            supports_voice_design: false,
            requires_reference: true,
            requires_transcript: false,
        },
        {
            id: 'omnivoice',
            name: 'OmniVoice',
            engine: 'omnivoice',
            supports_voice_design: false,
            requires_reference: true,
            requires_transcript: true,
        },
    ];

    it('returns null if models array is empty', () => {
        const { container } = render(
            <ModelSelector models={[]} selectedModel="" onModelSelect={vi.fn()} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders models list with Local / Offline indicator', () => {
        render(
            <ModelSelector
                models={mockModels}
                selectedModel="vibevoice"
                onModelSelect={vi.fn()}
            />
        );
        expect(screen.getByText('Local / Offline')).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toHaveValue('vibevoice');
    });

    it('displays transcript requirement hint when OmniVoice is selected', () => {
        render(
            <ModelSelector
                models={mockModels}
                selectedModel="omnivoice"
                onModelSelect={vi.fn()}
            />
        );
        expect(
            screen.getByText(/Requires reference audio with verified transcript/i)
        ).toBeInTheDocument();
    });

    it('fires onModelSelect callback on change', () => {
        const handleSelect = vi.fn();
        render(
            <ModelSelector
                models={mockModels}
                selectedModel="vibevoice"
                onModelSelect={handleSelect}
            />
        );

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'omnivoice' } });
        expect(handleSelect).toHaveBeenCalledWith('omnivoice');
    });
});
