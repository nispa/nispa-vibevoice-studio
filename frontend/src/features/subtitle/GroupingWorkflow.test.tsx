import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SubtitleProvider, useSubtitleContext } from './context/SubtitleContext';
import { SubtitleGroupingControls } from './components/SubtitleGroupingControls';
import { SubtitlePreviewModal } from './components/SubtitlePreviewModal';
import { GlobalProvider } from '../../context/GlobalContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// Mock the hook dependencies of the context providers
vi.mock('../../hooks/useSystemInfo', () => ({
    useSystemInfo: vi.fn(() => ({
        systemInfo: null,
        isLoading: false,
        error: null,
        fetchSystemInfo: vi.fn(),
    }))
}));

// Mock useJobArchive as it's used in SubtitleProvider
vi.mock('../../hooks/useJobArchive', () => ({
    useJobArchive: vi.fn(() => ({
        saveJobDraft: vi.fn(),
    }))
}));

const TestWrapper = () => {
    const { 
        subtitleSegments, 
        setSubtitleFile, 
        previewData, 
        setPreviewData,
        showPreview,
        setShowPreview,
        setSubtitleSegments
    } = useSubtitleContext();

    // Force set a file so controls are visible
    React.useEffect(() => {
        setSubtitleFile(new File(['test'], 'test.srt', { type: 'text/plain' }));
    }, []);

    return (
        <div>
            <div data-testid="segment-count">{subtitleSegments.length}</div>
            <SubtitleGroupingControls />
            <SubtitlePreviewModal 
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                segments={previewData?.segments || []}
                originalCount={previewData?.original_count || 0}
                finalCount={previewData?.final_count || 0}
                onUseAsInput={(file) => {
                    // This mirrors the logic I added to SubtitleMode.tsx
                    if (previewData?.segments) {
                        setSubtitleSegments(previewData.segments);
                    }
                    setShowPreview(false);
                }}
            />
            <button onClick={() => setSubtitleSegments([{ index: 1, start_ms: 0, end_ms: 1000, text: 'Old' }])}>
                Add Mock Segment
            </button>
        </div>
    );
};

describe('Grouping Workflow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Global fetch mock to avoid real network calls
        vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ voices: [], models: [] }),
            })
        ));
    });

    it('clears existing segments when Intelligent Grouping is toggled', async () => {
        render(
            <GlobalProvider>
                <SubtitleProvider>
                    <TestWrapper />
                </SubtitleProvider>
            </GlobalProvider>
        );

        // Add a segment manually
        fireEvent.click(screen.getByText('Add Mock Segment'));
        expect(screen.getByTestId('segment-count')).toHaveTextContent('1');

        // Toggle grouping
        const checkbox = screen.getByLabelText(/Intelligent Grouping/i);
        fireEvent.click(checkbox);

        // Should be cleared
        expect(screen.getByTestId('segment-count')).toHaveTextContent('0');
    });
});

// Helper component for the second test to avoid complex state simulation in the first wrapper
const ConsumerComponent = ({ mockSegments }: { mockSegments: any[] }) => {
    const { 
        subtitleSegments, 
        setPreviewData, 
        setShowPreview, 
        showPreview,
        previewData,
        setSubtitleSegments,
        setSubtitleFile
    } = useSubtitleContext();

    React.useEffect(() => {
        setSubtitleFile(new File([''], 'test.srt'));
        setPreviewData({
            segments: mockSegments,
            original_count: 2,
            final_count: 1
        });
        setShowPreview(true);
    }, []);

    const handleUseAsInput = (file: File) => {
        // Implementation from SubtitleMode.tsx
        if (previewData?.segments) {
            setSubtitleSegments(previewData.segments);
        }
        setShowPreview(false);
    };

    return (
        <div>
            <div data-testid="final-segment-count">{subtitleSegments.length}</div>
            {showPreview && (
                <button onClick={() => handleUseAsInput(new File([], 'test.srt'))}>
                    Apply Grouping
                </button>
            )}
        </div>
    );
};

describe('Preview Modal Workflow', () => {
    it('updates subtitleSegments correctly upon applying preview', async () => {
        const mockGroupedSegments = [
            { index: 1, start_ms: 0, end_ms: 5000, text: 'Grouped Text', duration_sec: 5 }
        ];

        render(
            <GlobalProvider>
                <SubtitleProvider>
                    <ConsumerComponent mockSegments={mockGroupedSegments} />
                </SubtitleProvider>
            </GlobalProvider>
        );

        expect(screen.getByTestId('final-segment-count')).toHaveTextContent('0');

        fireEvent.click(screen.getByText('Apply Grouping'));

        expect(screen.getByTestId('final-segment-count')).toHaveTextContent('1');
    });
});
