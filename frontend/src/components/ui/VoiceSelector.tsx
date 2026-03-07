import { Volume2 } from 'lucide-react';

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
}

export default function VoiceSelector({
    voices,
    selectedVoiceId,
    onVoiceSelect,
    label = "Voice Selection",
    description = "Choose which voice to use."
}: VoiceSelectorProps) {
    if (voices.length === 0) {
        return (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5 flex items-center gap-4">
                <div className="p-3 bg-amber-500/20 rounded-full text-amber-400">
                    <Volume2 size={24} />
                </div>
                <div>
                    <h4 className="font-medium text-amber-200">No Voices Found</h4>
                    <p className="text-sm text-amber-400/80 mt-1">Please add voice files to the data/voices folder or upload via settings.</p>
                </div>
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
            <div className="flex-shrink-0 w-full md:w-auto">
                <select
                    value={selectedVoiceId}
                    onChange={(e) => onVoiceSelect(e.target.value)}
                    className="input-style w-full md:w-64 appearance-none bg-slate-700/50 cursor-pointer"
                >
                    <option value="">-- Select a Voice --</option>
                    {voices.map(voice => (
                        <option key={voice.id} value={voice.id}>
                            {voice.language.toUpperCase()} - {voice.name} ({voice.gender})
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
