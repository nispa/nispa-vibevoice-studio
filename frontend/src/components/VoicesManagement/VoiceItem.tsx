import React from 'react';
import { Wand2, Trash2, CheckCircle2 } from 'lucide-react';
import { AudioWaveformPlayer } from '../ui/AudioWaveformPlayer';

interface VoiceItemProps {
    voice: any;
    editingId: string | null;
    editText: string;
    setEditingId: (id: string | null) => void;
    setEditText: (text: string) => void;
    handleSaveTranscription: (voiceId: string) => void;
    handleReprocess: (voice: any) => void;
    handleDelete: (voiceId: string) => void;
}

export const VoiceItem: React.FC<VoiceItemProps> = ({
    voice,
    editingId,
    editText,
    setEditingId,
    setEditText,
    handleSaveTranscription,
    handleReprocess,
    handleDelete
}) => {
    return (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between group hover:border-slate-600 transition-all gap-4">
            <div className="flex items-center gap-4 flex-1 w-full">
                <div className="w-full md:w-64">
                    <AudioWaveformPlayer 
                        audioUrl={`http://127.0.0.1:8000/api/voices/${voice.id}/audio?t=${voice.id}`}
                    />
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold truncate">{voice.name}</span>
                        <span className="px-1.5 py-0.5 bg-slate-700 text-[10px] font-bold rounded text-slate-400 uppercase">{voice.language}</span>
                        {voice.accent && <span className="px-1.5 py-0.5 bg-slate-700 text-[10px] font-bold rounded text-slate-400 uppercase">{voice.accent}</span>}
                        {voice.transcription && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20 cursor-help" title={voice.transcription}>
                                <CheckCircle2 size={10} /> HQ
                            </span>
                        )}
                    </div>
                    
                    {editingId === voice.id ? (
                        <div className="mt-2 space-y-2">
                            <textarea 
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="input-style w-full min-h-[60px] text-[10px] bg-slate-900/80 p-2"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingId(null)} className="text-[10px] text-slate-400 hover:text-slate-200 uppercase font-bold">Cancel</button>
                                <button onClick={() => handleSaveTranscription(voice.id)} className="text-[10px] text-indigo-400 hover:text-indigo-300 uppercase font-bold">Save</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 mt-1">
                            <p className="text-[10px] text-slate-400 line-clamp-1 italic bg-slate-900/30 px-2 py-1 rounded flex-1">
                                {voice.transcription ? `"${voice.transcription}"` : "No transcription"}
                            </p>
                            <button 
                                onClick={() => {
                                    setEditingId(voice.id);
                                    setEditText(voice.transcription || '');
                                }}
                                className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                                title="Edit Transcription"
                            >
                                <Wand2 size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button 
                    onClick={() => handleReprocess(voice)}
                    className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/20 flex items-center gap-2 text-xs font-medium"
                    title="Noise Reduction"
                >
                    <Wand2 size={14} />
                    Process
                </button>
                <button 
                    onClick={() => handleDelete(voice.id)}
                    className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors border border-rose-500/20"
                    title="Delete Voice"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};
