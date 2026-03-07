import { useState, useEffect } from 'react';
import { Plus, X, AudioLines } from 'lucide-react';

interface Speaker {
    id: string;
    name: string;
    voiceId: string;
}

interface Voice {
    id: string;
    filename: string;
    language: string;
    accent: string;
    name: string;
    gender: string;
}

interface Props {
    speakers: Speaker[];
    setSpeakers: (speakers: Speaker[]) => void;
}

export default function SpeakerVoiceSelector({ speakers, setSpeakers }: Props) {
    const [voices, setVoices] = useState<Voice[]>([]);

    // Load available voices
    useEffect(() => {
        fetch('http://localhost:8000/api/voices')
            .then(res => res.json())
            .then(data => {
                if (data.voices && data.voices.length > 0) {
                    setVoices(data.voices);
                }
            })
            .catch(err => console.error("Failed to fetch voices:", err));
    }, []);

    const addSpeaker = () => {
        const nextNum = speakers.length + 1;
        setSpeakers([...speakers, {
            id: Date.now().toString(),
            name: `Speaker${nextNum}`,
            voiceId: voices.length > 0 ? voices[0].id : ''
        }]);
    };

    const removeSpeaker = (id: string) => {
        setSpeakers(speakers.filter(s => s.id !== id));
    };

    const handleSpeakerVoiceChange = (id: string, voiceId: string) => {
        setSpeakers(speakers.map(s =>
            s.id === id ? { ...s, voiceId } : s
        ));
    };

    return (
        <div className="bg-slate-800/30 rounded-lg p-5 border border-slate-700/50">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-3">
                <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                    <AudioLines size={18} className="text-indigo-400" />
                    Speaker Voice Mapping ({speakers.length} {speakers.length === 1 ? 'speaker' : 'speakers'})
                </h4>
                <button
                    onClick={addSpeaker}
                    disabled={speakers.length >= 5}
                    className={`text-sm flex items-center gap-1 font-medium transition-colors ${speakers.length >= 5
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'text-indigo-400 hover:text-indigo-300'
                        }`}
                    title={speakers.length >= 5 ? 'Maximum 5 speakers allowed' : ''}
                >
                    <Plus size={16} /> Add Speaker
                </button>
            </div>

            {speakers.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                    <p className="text-sm mb-4">No speakers detected yet.</p>
                    <p className="text-xs">Upload a script or paste text to auto-detect speakers, or click "Add Speaker" to add one manually.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {speakers.map((speaker) => (
                        <div key={speaker.id} className="flex flex-col sm:flex-row gap-3 items-center bg-slate-900/50 p-3 rounded-md border border-slate-700">
                            <div className="flex-1 w-full">
                                <p className="text-sm font-medium text-slate-300">{speaker.name}</p>
                            </div>

                            <div className="w-full sm:w-auto">
                                <select
                                    value={speaker.voiceId}
                                    onChange={(e) => handleSpeakerVoiceChange(speaker.id, e.target.value)}
                                    className="input-style w-full appearance-none bg-slate-700/50 cursor-pointer"
                                >
                                    <option value="">-- Select Voice --</option>
                                    {voices.map(voice => (
                                        <option key={voice.id} value={voice.id}>
                                            {voice.language.toUpperCase()} - {voice.name} ({voice.gender})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {speaker.name !== 'Speaker1' && (
                                <button
                                    title="Remove"
                                    onClick={() => removeSpeaker(speaker.id)}
                                    className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-slate-800 rounded-md"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <p className="text-xs text-slate-500 mt-3 italic">
                Add or edit speakers. Names should match the labels in your script (e.g., "Alice", "Bob").
            </p>
        </div>
    );
}
