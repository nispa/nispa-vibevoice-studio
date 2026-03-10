import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Loader2, Download } from 'lucide-react';

interface AudioWaveformPlayerProps {
    audioUrl: string;
    height?: number;
    barColor?: string;
    showDownload?: boolean;
    downloadFilename?: string;
}

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({ 
    audioUrl, 
    height = 40, 
    barColor = '#6366f1',
    showDownload = false,
    downloadFilename = 'audio_result'
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [audioData, setAudioData] = useState<AudioBuffer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    // Standard reset when URL changes
    useEffect(() => {
        setAudioData(null);
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = audioUrl;
        }
    }, [audioUrl]);

    // Animation loop for playback head
    useEffect(() => {
        let animationFrame: number;
        
        const updateProgress = () => {
            if (audioRef.current && isPlaying) {
                const now = audioRef.current.currentTime;
                setCurrentTime(now);
                if (audioData) {
                    drawWaveform(audioData, now / audioRef.current.duration);
                }
                animationFrame = requestAnimationFrame(updateProgress);
            }
        };

        if (isPlaying) {
            animationFrame = requestAnimationFrame(updateProgress);
        }

        return () => cancelAnimationFrame(animationFrame);
    }, [isPlaying, audioData]);

    const loadAndPlay = async () => {
        if (isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
            return;
        }

        if (!audioData) {
            setIsLoading(true);
            try {
                const response = await fetch(audioUrl);
                const arrayBuffer = await response.arrayBuffer();
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
                setAudioData(decodedData);
                drawWaveform(decodedData, 0);
                
                if (audioRef.current) {
                    audioRef.current.play();
                    setIsPlaying(true);
                }
            } catch (err) {
                console.error("Failed to load audio for waveform:", err);
            } finally {
                setIsLoading(false);
            }
        } else {
            audioRef.current?.play();
            setIsPlaying(true);
        }
    };

    const drawWaveform = (buffer: AudioBuffer, progress: number = 0) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / canvas.width);
        const amp = canvas.height / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw static bars
        for (let i = 0; i < canvas.width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            
            // Highlight played part vs remaining
            const isPlayed = (i / canvas.width) <= progress;
            ctx.fillStyle = isPlayed ? barColor : '#334155'; // barColor or slate-700
            ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }

        // Draw Playhead (Red Line)
        if (progress >= 0) {
            const x = progress * canvas.width;
            ctx.fillStyle = '#f43f5e'; // Rose-500 (Red)
            ctx.fillRect(x - 1, 0, 2, canvas.height);
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!audioData || !audioRef.current) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = Math.max(0, Math.min(1, x / rect.width));
        
        // Update audio time
        const newTime = progress * audioRef.current.duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        
        // Redraw immediately
        drawWaveform(audioData, progress);
    };

    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `${downloadFilename}_${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="flex items-center gap-3 flex-1 bg-slate-900/40 rounded-xl px-4 py-3 border border-slate-700/30">
            <button
                onClick={loadAndPlay}
                disabled={isLoading}
                className={`p-2.5 rounded-full transition-all shadow-lg ${
                    isPlaying ? 'bg-indigo-500 text-white scale-105' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
            >
                {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                ) : isPlaying ? (
                    <Pause size={18} fill="currentColor" />
                ) : (
                    <Play size={18} fill="currentColor" className="ml-0.5" />
                )}
            </button>

            <div className="flex-1 relative h-10">
                <canvas 
                    ref={canvasRef} 
                    width={600} 
                    height={height} 
                    onClick={handleCanvasClick}
                    className={`w-full h-full opacity-80 ${audioData ? 'cursor-pointer' : 'cursor-default'}`}
                />
                {!audioData && !isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[9px] text-slate-600 uppercase font-bold tracking-[0.2em]">Click to load waveform</span>
                    </div>
                )}
            </div>

            {showDownload && (
                <button
                    onClick={handleDownload}
                    className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"
                    title="Download Audio"
                >
                    <Download size={18} />
                </button>
            )}

            <audio 
                ref={audioRef}
                src={audioUrl}
                onEnded={() => {
                    setIsPlaying(false);
                    if (audioData) drawWaveform(audioData, 0); // Reset playhead
                }}
                className="hidden"
            />
        </div>
    );
};
