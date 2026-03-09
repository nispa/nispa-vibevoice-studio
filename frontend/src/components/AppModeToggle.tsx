import { FileAudio, FileText } from 'lucide-react';
import type { AppMode } from '../context/GlobalContext';

/**
 * Props for the AppModeToggle component.
 */
interface AppModeToggleProps {
    /**
     * The currently active application mode.
     */
    mode: AppMode;
    /**
     * Callback function to switch the application mode.
     * @param {AppMode} mode - The new mode to set.
     */
    setMode: (mode: AppMode) => void;
}

/**
 * Toggle component to switch between Subtitle and Script generation modes.
 * 
 * Provides a segmented control UI to allow the user to select the preferred workflow.
 * 
 * @param {AppModeToggleProps} props - Component props.
 * @returns {JSX.Element} The rendered toggle bar.
 */
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
