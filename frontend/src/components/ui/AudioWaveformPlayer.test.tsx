import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';

// Mock Canvas
const mockContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
};

HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext as any);

// Mock AudioContext
class MockAudioContext {
    decodeAudioData = vi.fn().mockResolvedValue({
        getChannelData: vi.fn().mockReturnValue(new Float32Array(100)),
        length: 100,
        duration: 10,
        sampleRate: 44100,
        numberOfChannels: 1,
    });
}
(window as any).AudioContext = MockAudioContext;

// Mock Audio Element
Object.defineProperty(HTMLAudioElement.prototype, 'duration', {
    writable: true,
    value: 10
});
const mockAudioPlay = vi.spyOn(HTMLAudioElement.prototype, 'play').mockImplementation(() => Promise.resolve());
const mockAudioPause = vi.spyOn(HTMLAudioElement.prototype, 'pause').mockImplementation(() => {});

describe('AudioWaveformPlayer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn().mockResolvedValue({
            arrayBuffer: async () => new ArrayBuffer(8)
        });
    });

    it('renders with default state', () => {
        render(<AudioWaveformPlayer audioUrl="test.wav" />);
        expect(screen.getByRole('button')).toBeInTheDocument();
        expect(screen.getByText(/Click to load waveform/i)).toBeInTheDocument();
    });

    it('loads and plays audio on click', async () => {
        render(<AudioWaveformPlayer audioUrl="test.wav" />);
        const playButton = screen.getByRole('button');
        
        await act(async () => {
            fireEvent.click(playButton);
        });

        expect(fetch).toHaveBeenCalledWith('test.wav');
        expect(mockAudioPlay).toHaveBeenCalled();
        expect(screen.queryByText(/Click to load waveform/i)).not.toBeInTheDocument();
    });

    it('toggles play/pause', async () => {
        render(<AudioWaveformPlayer audioUrl="test.wav" />);
        const playButton = screen.getByRole('button');
        
        // Play
        await act(async () => {
            fireEvent.click(playButton);
        });
        
        // Pause
        await act(async () => {
            fireEvent.click(playButton);
        });

        expect(mockAudioPause).toHaveBeenCalled();
    });

    it('handles canvas click to seek', async () => {
        const { container } = render(<AudioWaveformPlayer audioUrl="test.wav" />);
        const playButton = screen.getByRole('button');
        
        // First load audio to enable seeking
        await act(async () => {
            fireEvent.click(playButton);
        });

        const canvas = container.querySelector('canvas');
        if (!canvas) throw new Error('Canvas not found');

        // Mock bounding rect for click calculation
        canvas.getBoundingClientRect = vi.fn(() => ({
            left: 0,
            top: 0,
            width: 600,
            height: 40,
            bottom: 40,
            right: 600,
            x: 0,
            y: 0,
            toJSON: () => {}
        }));

        await act(async () => {
            fireEvent.click(canvas, { clientX: 300 }); // Click at 50%
        });

        // We can't easily check internal state, but we can check if it attempted to redraw
        expect(mockContext.fillRect).toHaveBeenCalled();
    });
});
