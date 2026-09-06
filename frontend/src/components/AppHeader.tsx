import { Settings, Headphones, Mic2, Loader2, Layers } from 'lucide-react';
import { useGlobalContext } from '../context/GlobalContext';

/**
 * Props for the AppHeader component.
 */
interface AppHeaderProps {
    /**
     * Callback triggered when the system information settings button is clicked.
     */
    onShowSystemInfo: () => void;
    /**
     * Callback triggered when the voice library button is clicked.
     */
    onShowVoiceLibrary: () => void;
    /**
     * Callback triggered when the models & engines manager button is clicked.
     */
    onShowModelsManager?: () => void;
}

/**
 * Main application header component.
 * 
 * Displays the application title, a brief description, and buttons
 * to access system information, models manager, and voice management.
 * 
 * @param {AppHeaderProps} props - Component props.
 * @returns {JSX.Element} The rendered header.
 */
export default function AppHeader({ onShowSystemInfo, onShowVoiceLibrary, onShowModelsManager }: AppHeaderProps) {
    const { isBackendReady } = useGlobalContext();

    return (
        <div className="w-full max-w-4xl text-center mb-10 space-y-4 relative">
            <div className="absolute top-0 right-0 flex gap-2">
                {onShowModelsManager && (
                    <button
                        onClick={onShowModelsManager}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                        title="Models & Engines Manager"
                    >
                        <Layers size={24} />
                    </button>
                )}
                <button
                    onClick={onShowVoiceLibrary}
                    className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
                    title="Voice Library Manager"
                >
                    <Mic2 size={24} />
                </button>
                <button
                    onClick={onShowSystemInfo}
                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition"
                    title="System Information"
                >
                    <Settings size={24} />
                </button>
            </div>
            <div className="flex flex-col items-center gap-2">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent inline-flex items-center gap-4">
                    <Headphones size={40} className="text-blue-400" />
                    VibeVoice Studio
                    {!isBackendReady && (
                        <div className="flex items-center gap-2 ml-2" title="Connecting to backend...">
                            <Loader2 size={24} className="text-blue-400 animate-spin" />
                            <span className="text-xs font-bold text-blue-400/60 uppercase tracking-widest animate-pulse hidden md:inline">
                                Syncing
                            </span>
                        </div>
                    )}
                </h1>
            </div>
            <p className="text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
                Generate perfectly timed Text-to-Speech audio from subtitles, or bring multi-speaker scripts to life via local zero-shot voice cloning.
            </p>
        </div>
    );
}
