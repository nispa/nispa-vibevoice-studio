import React from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import FileUploadArea from '../ui/FileUploadArea';

interface UploadSectionProps {
    isUploading: boolean;
    tempFile: File | null;
    handleFileChange: (file: File | null) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    transcription: string;
    setTranscription: (text: string) => void;
    uploadError: string | null;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
    isUploading,
    tempFile,
    handleFileChange,
    fileInputRef,
    transcription,
    setTranscription,
    uploadError
}) => {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Upload size={16} className={`${isUploading ? 'animate-bounce' : ''} text-emerald-400`} />
                {isUploading ? 'Uploading Voice...' : 'Add New Voice'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadArea 
                    file={tempFile}
                    onFileChange={handleFileChange}
                    inputRef={fileInputRef}
                    accept=".wav,.mp3"
                    icon={isUploading ? Loader2 : Upload}
                    titleDefault={isUploading ? "Uploading..." : "Drop audio here"}
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
                        disabled={isUploading}
                    />
                </div>
            </div>

            {uploadError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle size={14} /> {uploadError}
                </div>
            )}
        </div>
    );
};
