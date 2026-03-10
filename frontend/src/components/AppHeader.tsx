import { Settings, Headphones, Mic2 } from 'lucide-react';

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
}

/**
 * Main application header component.
 * 
 * Displays the application title, a brief description, and buttons
 * to access system information and voice management.
 * 
 * @param {AppHeaderProps} props - Component props.
 * @returns {JSX.Element} The rendered header.
 */
export default function AppHeader({ onShowSystemInfo, onShowVoiceLibrary }: AppHeaderProps) {
    return (
        <div className="w-full max-w-4xl text-center mb-10 space-y-4 relative">
            <div className="absolute top-0 right-0 flex gap-2">
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
