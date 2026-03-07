
import { FileAudio, FileText } from 'lucide-react';
import type { AppMode } from '../context/GlobalContext';

interface AppModeToggleProps {
    mode: AppMode;
    setMode: (mode: AppMode) => void;
}

export default function AppModeToggle({ mode, setMode }: AppModeToggleProps) {
    return (
        <div className="flex bg-slate-800/50 p-1.5 rounded-lg w-full max-w-md mx-auto mb-8 relative z-10 border border-slate-700/50">
            <button
                onClick={() => setMode('subtitle')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-300 ${mode === 'subtitle'
                    ? 'bg-blue-600/20 text-blue-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                    }`}
            >
                <FileAudio size={18} />
                Timed Subtitles
            </button>

            <button
                onClick={() => setMode('script')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-300 ${mode === 'script'
                    ? 'bg-indigo-600/20 text-indigo-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                    }`}
            >
                <FileText size={18} />
                Untimed Script
            </button>
        </div>
    );
}
