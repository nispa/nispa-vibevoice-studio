import { Download } from 'lucide-react';
import { AudioWaveformPlayer } from './ui/AudioWaveformPlayer';

interface AppAudioResultProps {
    audioUrl: string | null;
    isProcessing: boolean;
}

export default function AppAudioResult({ audioUrl, isProcessing }: AppAudioResultProps) {
    if (!audioUrl || isProcessing) return null;

    const fileExtension = audioUrl.split('.').pop()?.split('?')[0]?.toUpperCase() || 'MP3';

    const handleDownload = () => {
        if (!audioUrl) return;
        const a = document.createElement('a');
        a.href = audioUrl;
        const ext = audioUrl.split('.').pop()?.split('?')[0] || 'mp3';
        a.download = `vibevoice_studio_result_${Date.now()}.${ext}`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="w-full max-w-4xl mt-8 glass-panel rounded-2xl p-8 border-l-4 border-l-emerald-500 animate-slide-up shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">🎉</span>
                        Generation Complete
                    </h3>
                    <p className="text-sm text-slate-400">Your audio is ready. You can preview it or download the file below.</p>
                </div>
                <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-450 hover:shadow-emerald-500/30 text-slate-950 font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                >
                    <Download size={20} className="stroke-[2.5]" />
                    <span>Download Audio File ({fileExtension})</span>
                </button>
            </div>

            <div className="mt-8">
                <AudioWaveformPlayer 
                    audioUrl={audioUrl} 
                    showDownload={true}
                    downloadFilename="vibevoice_studio_result"
                    barColor="#10b981" 
                />
            </div>
        </div>
    );
}
