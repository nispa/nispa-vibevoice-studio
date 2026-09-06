import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HiggsTagPalette } from './HiggsTagPalette';
import { TOTAL_HIGGS_TAGS_COUNT } from './higgsTagsData';

describe('HiggsTagPalette', () => {
    it('is collapsed by default and displays tag count', () => {
        render(<HiggsTagPalette onInsertTag={vi.fn()} onOpenGuide={vi.fn()} />);

        expect(screen.getByText(/Tag Palette: Emozioni & Stili/i)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(`${TOTAL_HIGGS_TAGS_COUNT} tag`, 'i'))).toBeInTheDocument();
        // Since it's collapsed, category tabs should not be visible
        expect(screen.queryByText(/Emozioni \(21\)/i)).not.toBeInTheDocument();
    });

    it('expands on click and shows category tabs and tags', async () => {
        const onInsertTag = vi.fn();
        const onOpenGuide = vi.fn();
        render(<HiggsTagPalette onInsertTag={onInsertTag} onOpenGuide={onOpenGuide} />);

        const toggleBtn = screen.getByRole('button', { name: /Tag Palette: Emozioni & Stili/i });
        await userEvent.click(toggleBtn);

        // Category pills should now be visible
        expect(screen.getByText(/Emozioni \(21\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Stili \(3\)/i)).toBeInTheDocument();
        expect(screen.getByText(/SFX & Suoni \(9\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Prosodia \(10\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Ambiente \(2\)/i)).toBeInTheDocument();

        // Clicking a tag calls onInsertTag
        const angerBtn = screen.getByRole('button', { name: /Anger/i });
        await userEvent.click(angerBtn);
        expect(onInsertTag).toHaveBeenCalledWith('<|emotion:anger|>');
    });

    it('filters tags when selecting category tab', async () => {
        render(<HiggsTagPalette onInsertTag={vi.fn()} onOpenGuide={vi.fn()} />);

        const toggleBtn = screen.getByRole('button', { name: /Tag Palette: Emozioni & Stili/i });
        await userEvent.click(toggleBtn);

        const stylesTab = screen.getByRole('button', { name: /Stili \(3\)/i });
        await userEvent.click(stylesTab);

        // Only styles should be visible
        expect(screen.getByRole('button', { name: /Whispering/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Anger$/i })).not.toBeInTheDocument();
    });

    it('triggers onOpenGuide when guide button is clicked', async () => {
        const onOpenGuide = vi.fn();
        render(<HiggsTagPalette onInsertTag={vi.fn()} onOpenGuide={onOpenGuide} />);

        const guideBtn = screen.getByRole('button', { name: /Guida Sintassi & Emozioni/i });
        await userEvent.click(guideBtn);

        expect(onOpenGuide).toHaveBeenCalledTimes(1);
    });
});
