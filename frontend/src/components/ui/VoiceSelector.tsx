import { Volume2, RefreshCw } from 'lucide-react';

interface Voice {
    id: string;
    filename: string;
    language: string;
    accent: string;
    name: string;
    gender: string;
}

interface VoiceSelectorProps {
    voices: Voice[];
    selectedVoiceId: string;
    onVoiceSelect: (voiceId: string) => void;
    label?: string;
    description?: string;
    onRefresh?: () => void;
    isLoading?: boolean;
}

export default function VoiceSelector({
    voices,
    selectedVoiceId,
    onVoiceSelect,
    label = "Voice Selection",
    description = "Choose which voice to use.",
    onRefresh,
    isLoading = false
}: VoiceSelectorProps) {
    if (voices.length === 0) {
        return (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-full text-amber-400">
                        <Volume2 size={24} />
                    </div>
                    <div>
                        <h4 className="font-medium text-amber-200">No Voices Found</h4>
                        <p className="text-sm text-amber-400/80 mt-1">Please add voice files to the data/voices folder or upload via settings.</p>
                    </div>
                </div>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-colors"
                        title="Refresh voices"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-slate-800/40 rounded-lg p-5 border border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
                    <Volume2 size={24} />
                </div>
                <div>
                    <h4 className="font-medium text-slate-200">{label}</h4>
                    <p className="text-sm text-slate-400 mt-1">{description}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <select
                        value={selectedVoiceId}
                        onChange={(e) => onVoiceSelect(e.target.value)}
                        className="input-style w-full appearance-none bg-slate-700/50 cursor-pointer pr-10"
                    >
                        <option value="">-- Select a Voice --</option>
                        {voices.map(voice => (
                            <option key={voice.id} value={voice.id}>
                                {voice.language.toUpperCase()} - {voice.name} ({voice.gender})
                            </option>
                        ))}
                    </select>
                </div>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="p-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg transition-colors"
                        title="Refresh voices"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                )}
            </div>
        </div>
    );
}
