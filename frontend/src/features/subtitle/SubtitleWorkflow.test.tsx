import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubtitleMode from '../../components/SubtitleMode';
import { useGlobalContext } from '../../context/GlobalContext';
import { useJobArchive } from '../../hooks/useJobArchive';

vi.mock('../../context/GlobalContext');
vi.mock('../../hooks/useJobArchive');

describe('SubtitleMode Workflow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        (useGlobalContext as any).mockReturnValue({
            voices: [],
            models: [],
            isProcessing: false,
            setIsProcessing: vi.fn(),
            setAudioUrl: vi.fn(),
            fetchSystemInfo: vi.fn(),
            refreshTtsData: vi.fn()
        });

        (useJobArchive as any).mockReturnValue({
            jobs: [],
            loading: false,
            loadJobs: vi.fn(),
            saveJobDraft: vi.fn()
        });
    });

    it('should only show Step 1 initially', () => {
        render(<SubtitleMode />);
        
        expect(screen.getByText(/Step 1: Input Source/i)).toBeInTheDocument();
        expect(screen.queryByText(/Step 2: Refining & Translation/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Step 3: Voice Selection & Synthesis/i)).not.toBeInTheDocument();
    });

    // Integration test for showing steps after file upload would require 
    // simulating the context update, which is easier if we wrap our own 
    // test component that uses the Provider.
});
