import { AudioWaveformPlayer } from './ui/AudioWaveformPlayer';

interface AppAudioResultProps {
    audioUrl: string | null;
    isProcessing: boolean;
}

export default function AppAudioResult({ audioUrl, isProcessing }: AppAudioResultProps) {
    if (!audioUrl || isProcessing) return null;

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
