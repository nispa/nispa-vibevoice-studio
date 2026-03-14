import React, { useState } from 'react';
import { X, Wand2, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { AudioWaveformPlayer } from '../ui/AudioWaveformPlayer';

interface Voice {
    id: string;
    name: string;
    language: string;
}

interface VoiceProcessModalProps {
    isOpen: boolean;
    onClose: () => void;
    voice: Voice | null;
    onProcessed: () => void;
}

export const VoiceProcessModal: React.FC<VoiceProcessModalProps> = ({ isOpen, onClose, voice, onProcessed }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    if (!isOpen || !voice) return null;

    const handleProcess = async () => {
        setIsProcessing(true);
        setStatus('idle');
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/voices/${voice.id}/reprocess`, { method: 'POST' });
            if (res.ok) {
                setStatus('success');
                onProcessed();
                setTimeout(() => {
                    onClose();
                    setStatus('idle');
                }, 2000);
            } else {
                setStatus('error');
            }
        } catch (err) {
            setStatus('error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <Wand2 className="text-emerald-400" size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Noise Reduction Tool</h2>
                            <p className="text-xs text-slate-400">Enhance quality for: {voice.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    <div className="space-y-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block text-center">Preview Original Audio</span>
                        <div className="flex items-center justify-center">
                            <AudioWaveformPlayer 
                                audioUrl={`http://127.0.0.1:8000/api/voices/${voice.id}/audio?t=${Date.now()}`}
                                barColor="#6366f1"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-center py-2">
                        <ArrowRight className="text-slate-700 animate-pulse" size={32} />
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-3">
                        <h4 className="text-sm font-semibold text-slate-200">Processing Pipeline</h4>
                        <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                            <li>Apply **Bandpass Filter** (80Hz - 8kHz) to isolate voice frequencies.</li>
                            <li>**Normalize** waveform to maximize dynamic range.</li>
                            <li>Create a **NEW voice entry** called <code className="text-emerald-400">{voice.id}_processed</code>.</li>
                        </ul>
                    </div>

                    {status === 'error' && (
                        <p className="text-xs text-rose-400 text-center font-medium bg-rose-500/5 py-2 rounded-lg border border-rose-500/20">
                            Failed to process audio. Please try again.
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 bg-slate-900/80 border-t border-slate-800 flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleProcess}
                        disabled={isProcessing || status === 'success'}
                        className={`flex-[2] py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            status === 'success' 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                        }`}
                    >
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : status === 'success' ? <CheckCircle2 size={18} /> : <Wand2 size={18} />}
                        {isProcessing ? 'Processing...' : status === 'success' ? 'Created Successfully!' : 'Start Noise Reduction'}
                    </button>
                </div>
            </div>
        </div>
    );
};
