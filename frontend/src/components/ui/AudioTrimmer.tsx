import React, { useState, useRef, useEffect } from 'react';
import { Scissors, Play, Square, Check, Loader2, RotateCcw } from 'lucide-react';

interface AudioTrimmerProps {
    audioUrl: string;
    onTrimmed: (newAudioBase64: string) => void;
    onCancel: () => void;
}

export const AudioTrimmer: React.FC<AudioTrimmerProps> = ({ audioUrl, onTrimmed, onCancel }) => {
    const [duration, setDuration] = useState(0);
    const [markIn, setMarkIn] = useState(0);
    const [markOut, setMarkOut] = useState(0);
    const [isTrimming, setIsTrimming] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio(audioUrl);
        audio.onloadedmetadata = () => {
            setDuration(audio.duration);
            setMarkOut(audio.duration);
        };
        audioRef.current = audio;
        
        return () => {
            audio.pause();
            audioRef.current = null;
        };
    }, [audioUrl]);

    const handlePlayPreview = () => {
        if (!audioRef.current) return;
        
        audioRef.current.currentTime = markIn;
        audioRef.current.play();
        setIsPlaying(true);
        
        const checkEnd = setInterval(() => {
            if (audioRef.current && audioRef.current.currentTime >= markOut) {
                audioRef.current.pause();
                setIsPlaying(false);
                clearInterval(checkEnd);
            }
        }, 100);
    };

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = markIn;
        }
        setIsPlaying(false);
    };

    const performTrim = async () => {
        setIsTrimming(true);
        try {
            // 1. Fetch current audio as blob
            const response = await fetch(audioUrl);
            const blob = await response.blob();
            
            // 2. Convert to base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => {
                    const base64String = (reader.result as string).split(',')[1];
                    resolve(base64String);
                };
            });
            reader.readAsDataURL(blob);
            const base64Audio = await base64Promise;

            // 3. Call backend to trim
            const trimRes = await fetch('http://localhost:8000/api/system/trim-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audio_base64: base64Audio,
                    start_sec: markIn,
                    end_sec: markOut
                })
            });

            if (trimRes.ok) {
                const data = await trimRes.json();
                onTrimmed(data.audio_base64);
            } else {
                alert("Failed to trim audio");
            }
        } catch (err) {
            console.error("Trimming error:", err);
            alert("Error connecting to server");
        } finally {
            setIsTrimming(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-4 space-y-4 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h5 className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-2">
                    <Scissors size={14} /> Quick Audio Trimmer
                </h5>
                <button onClick={onCancel} className="text-[10px] text-slate-500 hover:text-slate-300 uppercase font-bold">Cancel</button>
            </div>

            <div className="space-y-6 py-2">
                {/* Visual Sliders */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span>MARK-IN: {markIn.toFixed(2)}s</span>
                            <span>{duration.toFixed(2)}s total</span>
                        </div>
                        <input 
                            type="range" 
                            min={0} 
                            max={duration} 
                            step={0.01} 
                            value={markIn}
                            onChange={(e) => setMarkIn(Math.min(parseFloat(e.target.value), markOut - 0.1))}
                            className="w-full accent-emerald-500"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span>MARK-OUT: {markOut.toFixed(2)}s</span>
                            <span className="text-indigo-400">DURATION: {(markOut - markIn).toFixed(2)}s</span>
                        </div>
                        <input 
                            type="range" 
                            min={0} 
                            max={duration} 
                            step={0.01} 
                            value={markOut}
                            onChange={(e) => setMarkOut(Math.max(parseFloat(e.target.value), markIn + 0.1))}
                            className="w-full accent-rose-500"
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-2">
                        {!isPlaying ? (
                            <button 
                                onClick={handlePlayPreview}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700"
                                title="Play Selection"
                            >
                                <Play size={16} fill="currentColor" />
                            </button>
                        ) : (
                            <button 
                                onClick={handleStop}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg transition border border-slate-700"
                            >
                                <Square size={16} fill="currentColor" />
                            </button>
                        )}
                        <button 
                            onClick={() => { setMarkIn(0); setMarkOut(duration); }}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-500 rounded-lg transition border border-slate-700"
                            title="Reset Range"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>

                    <button 
                        onClick={performTrim}
                        disabled={isTrimming}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        {isTrimming ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {isTrimming ? 'TRIMMING...' : 'APPLY & UPDATE'}
                    </button>
                </div>
            </div>
            
            <p className="text-[9px] text-slate-500 text-center italic">
                Trimming will remove everything before Mark-In and after Mark-Out.
            </p>
        </div>
    );
};
