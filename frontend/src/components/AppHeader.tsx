
import { Settings, Headphones } from 'lucide-react';

interface AppHeaderProps {
    onShowSystemInfo: () => void;
}

export default function AppHeader({ onShowSystemInfo }: AppHeaderProps) {
    return (
        <div className="w-full max-w-4xl text-center mb-10 space-y-4 relative">
            <button
                onClick={onShowSystemInfo}
                className="absolute top-0 right-0 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition"
                title="System Information"
            >
                <Settings size={24} />
            </button>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent inline-flex items-center gap-4">
                <Headphones size={40} className="text-blue-400" />
                VibeVoice Studio
            </h1>
            <p className="text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
                Generate perfectly timed Text-to-Speech audio from subtitles, or bring multi-speaker scripts to life via local zero-shot voice cloning.
            </p>
        </div>
    );
}
