
import { Upload } from 'lucide-react';

interface AppAudioResultProps {
    audioUrl: string | null;
    isProcessing: boolean;
}

export default function AppAudioResult({ audioUrl, isProcessing }: AppAudioResultProps) {
    if (!audioUrl || isProcessing) return null;

    return (
        <div className="w-full max-w-4xl mt-8 glass-panel rounded-xl p-6 border-l-4 border-l-green-500 animate-slide-up">
            <h3 className="text-xl font-semibold mb-4 text-slate-100 flex items-center gap-2">
                🎉 Generation Complete
            </h3>
            <audio controls src={audioUrl} className="w-full h-12 rounded-lg bg-slate-800" />

            <a
                href={audioUrl}
                download="generated_audio.mp3"
                className="mt-6 btn-primary w-fit ml-auto"
            >
                <Upload size={18} className="rotate-180" />
                Download MP3
            </a>
        </div>
    );
}
