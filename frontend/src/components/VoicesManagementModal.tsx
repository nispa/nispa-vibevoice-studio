import React, { useState, useRef } from 'react';
import { X, Volume2, Trash2, Wand2, Upload, CheckCircle2, AlertCircle, Mic2 } from 'lucide-react';
import { useGlobalContext } from '../context/GlobalContext';
import FileUploadArea from './ui/FileUploadArea';
import { VoiceProcessModal } from './VoiceProcessModal';
import { AudioWaveformPlayer } from './ui/AudioWaveformPlayer';

interface VoicesManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const VoicesManagementModal: React.FC<VoicesManagementModalProps> = ({ isOpen, onClose }) => {
    const { voices, refreshTtsData } = useGlobalContext();
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [transcription, setTranscription] = useState('');
    
    // Inline editing states
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    // Process modal state
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [selectedVoiceForProcess, setSelectedVoiceForProcess] = useState<any>(null);
    
    // Props for FileUploadArea
    const [tempFile, setTempFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleDelete = async (voiceId: string) => {
        if (!confirm(`Are you sure you want to delete the voice "${voiceId}"?`)) return;

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/voices/${voiceId}`, { method: 'DELETE' });
            if (res.ok) {
                refreshTtsData();
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    const handleReprocess = (voice: any) => {
        setSelectedVoiceForProcess(voice);
        setShowProcessModal(true);
    };

    const handleSaveTranscription = async (voiceId: string) => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/voices/${voiceId}/transcription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcription: editText })
            });
            if (res.ok) {
                setEditingId(null);
                refreshTtsData();
            }
        } catch (err) {
            console.error("Failed to save transcription:", err);
        }
    };

    const handleFileChange = async (file: File | null) => {
        if (!file) return;
        setUploadError(null);
        
        const suggestedId = `en-${file.name.split('.')[0].replace(/\s+/g, '_')}`;
        const voiceId = prompt("Enter a unique ID for this voice (must include language prefix, e.g., 'it-marco'):", suggestedId);
        
        if (!voiceId) {
            setTempFile(null);
            return;
        }

        const formData = new FormData();
        formData.append('voice_file', file);
        formData.append('voice_id', voiceId);
        if (transcription.trim()) {
            formData.append('transcription', transcription.trim());
        }

        try {
            const res = await fetch('http://127.0.0.1:8000/api/upload-voice', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                refreshTtsData();
                setTempFile(null);
                setTranscription('');
            } else {
                const data = await res.json();
                setUploadError(data.detail || "Upload failed");
                setTempFile(null);
            }
        } catch (err) {
            setUploadError("Network error during upload");
            setTempFile(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <Mic2 className="text-indigo-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Voice Library Manager</h2>
                            <p className="text-xs text-slate-400">Manage your local reference voices for cloning</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Upload Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <Upload size={16} className="text-emerald-400" />
                            Add New Voice
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FileUploadArea 
                                file={tempFile}
                                onFileChange={handleFileChange}
                                inputRef={fileInputRef}
                                accept=".wav,.mp3"
                                icon={Upload}
                                titleDefault="Drop audio here"
                                subtitleDefault="WAV or MP3 (10-20s)"
                                activeColorClass="emerald-500"
                                activeBgClass="bg-emerald-500/5"
                                activeTextClass="text-emerald-400"
                                layout="horizontal"
                            />
                            
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Transcription (Optional)</label>
                                    <button 
                                        onClick={async () => {
                                            try {
                                                const text = await navigator.clipboard.readText();
                                                setTranscription(text);
                                            } catch (err) {
                                                console.error("Failed to read clipboard");
                                            }
                                        }}
                                        type="button"
                                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase transition-colors"
                                    >
                                        Paste from Clipboard
                                    </button>
                                </div>
                                <textarea 
                                    value={transcription}
                                    onChange={(e) => setTranscription(e.target.value)}
                                    placeholder="Type or paste exactly what is said in the audio sample..."
                                    className="input-style flex-1 resize-none text-xs bg-slate-900/50 min-h-[80px]"
                                />
                            </div>
                        </div>

                        {uploadError && (
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs flex items-center gap-2">
                                <AlertCircle size={14} /> {uploadError}
                            </div>
                        )}
                    </div>

                    {/* List Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                            <Volume2 size={16} className="text-indigo-400" />
                            Installed Voices ({voices.length})
                        </h3>

                        <div className="grid grid-cols-1 gap-3">
                            {voices.length === 0 ? (
                                <p className="text-sm text-slate-500 italic text-center py-8">No voices installed yet.</p>
                            ) : (
                                voices.map((voice) => (
                                    <div key={voice.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between group hover:border-slate-600 transition-all gap-4">
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
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-900/80 border-t border-slate-800 text-right">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-bold transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Sub-modal for audio processing */}
            <VoiceProcessModal 
                isOpen={showProcessModal}
                onClose={() => setShowProcessModal(false)}
                voice={selectedVoiceForProcess}
                onProcessed={() => {
                    refreshTtsData();
                }}
            />
        </div>
    );
};
