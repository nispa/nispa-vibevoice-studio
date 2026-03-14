import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VoicesManagementModal } from './index';
import { useGlobalContext } from '../../context/GlobalContext';

vi.mock('../../context/GlobalContext');
vi.stubGlobal('confirm', vi.fn());
vi.stubGlobal('prompt', vi.fn());
vi.stubGlobal('fetch', vi.fn());

describe('VoicesManagementModal', () => {
    const mockRefreshTtsData = vi.fn();
    const mockVoices = [
        { id: 'en-test1', name: 'test1', language: 'en', transcription: 'Hello world' },
        { id: 'it-test2', name: 'test2', language: 'it', transcription: '' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (useGlobalContext as any).mockReturnValue({
            voices: mockVoices,
            refreshTtsData: mockRefreshTtsData
        });
    });

    it('renders voices list when open', () => {
        render(<VoicesManagementModal isOpen={true} onClose={vi.fn()} />);
        expect(screen.getByText(/Voice Library Manager/i)).toBeInTheDocument();
        expect(screen.getByText('test1')).toBeInTheDocument();
        expect(screen.getByText('test2')).toBeInTheDocument();
    });

    it('handles voice deletion after confirmation', async () => {
        (confirm as any).mockReturnValue(true);
        (fetch as any).mockResolvedValue({ ok: true });

        render(<VoicesManagementModal isOpen={true} onClose={vi.fn()} />);
        const deleteButtons = screen.getAllByTitle(/Delete Voice/i);
        
        await act(async () => {
            fireEvent.click(deleteButtons[0]);
        });

        expect(confirm).toHaveBeenCalled();
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('en-test1'), { method: 'DELETE' });
        expect(mockRefreshTtsData).toHaveBeenCalled();
    });

    it('enters inline editing mode for transcription', () => {
        render(<VoicesManagementModal isOpen={true} onClose={vi.fn()} />);
        const editButtons = screen.getAllByTitle(/Edit Transcription/i);
        
        fireEvent.click(editButtons[0]);
        
        const textarea = screen.getByDisplayValue('Hello world');
        expect(textarea).toBeInTheDocument();
        expect(screen.getByText(/Save/i)).toBeInTheDocument();
    });

    it('saves updated transcription', async () => {
        (fetch as any).mockResolvedValue({ ok: true });
        render(<VoicesManagementModal isOpen={true} onClose={vi.fn()} />);
        
        // Enter edit mode
        fireEvent.click(screen.getAllByTitle(/Edit Transcription/i)[0]);
        
        const textarea = screen.getByDisplayValue('Hello world');
        fireEvent.change(textarea, { target: { value: 'New text' } });
        
        const saveButton = screen.getByText(/Save/i);
        await act(async () => {
            fireEvent.click(saveButton);
        });

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('api/voices/en-test1/transcription'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ transcription: 'New text' })
            })
        );
        expect(mockRefreshTtsData).toHaveBeenCalled();
    });
});
