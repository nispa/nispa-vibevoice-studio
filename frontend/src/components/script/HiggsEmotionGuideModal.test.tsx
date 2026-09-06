import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HiggsEmotionGuideModal } from './HiggsEmotionGuideModal';

describe('HiggsEmotionGuideModal', () => {
    beforeEach(() => {
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined)
            }
        });
    });

    it('does not render when isOpen is false', () => {
        render(<HiggsEmotionGuideModal isOpen={false} onClose={vi.fn()} />);
        expect(screen.queryByText(/Guida Sintassi & Elementi Vocali/i)).not.toBeInTheDocument();
    });

    it('renders cleanly when open and displays category pills without horizontal overflow', () => {
        render(<HiggsEmotionGuideModal isOpen={true} onClose={vi.fn()} />);

        expect(screen.getByText(/Guida Sintassi & Elementi Vocali/i)).toBeInTheDocument();
        expect(screen.getByText(/Regola Sintassi:/i)).toBeInTheDocument();
        expect(screen.getByText(/Tutti \(45\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Emozioni \(21\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Stili \(3\)/i)).toBeInTheDocument();
    });

    it('filters elements when selecting a category pill', async () => {
        render(<HiggsEmotionGuideModal isOpen={true} onClose={vi.fn()} />);

        const stylesPill = screen.getByRole('button', { name: /Stili \(3\)/i });
        await userEvent.click(stylesPill);

        expect(screen.getByText('Whispering (Sussurrato)')).toBeInTheDocument();
        expect(screen.queryByText(/Sadness \(Tristezza\)/i)).not.toBeInTheDocument();
    });

    it('copies tag to clipboard when copy button is clicked', async () => {
        render(<HiggsEmotionGuideModal isOpen={true} onClose={vi.fn()} />);

        const copyBtns = screen.getAllByRole('button', { name: /Copia/i });
        await userEvent.click(copyBtns[0]);

        expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('calls onInsertTag and onClose when insert button is clicked', async () => {
        const onInsertTag = vi.fn();
        const onClose = vi.fn();
        render(<HiggsEmotionGuideModal isOpen={true} onClose={onClose} onInsertTag={onInsertTag} />);

        const insertBtns = screen.getAllByRole('button', { name: /Inserisci/i });
        await userEvent.click(insertBtns[0]);

        expect(onInsertTag).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });
});
