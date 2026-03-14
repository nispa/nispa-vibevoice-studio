import React from 'react';
import { X, Volume2, Wand2, Mic2 } from 'lucide-react';
import { VoiceProcessModal } from '../VoiceProcessModal';
import { useVoicesManagement } from './useVoicesManagement';
import { VoiceItem } from './VoiceItem';
import { UploadSection } from './UploadSection';

interface VoicesManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const VoicesManagementModal: React.FC<VoicesManagementModalProps> = ({ isOpen, onClose }) => {
    const {
        voices,
        isLoadingTtsData,
        uploadError,
        isUploading,
        transcription,
        setTranscription,
        editingId,
        setEditingId,
        editText,
        setEditText,
        showProcessModal,
        setShowProcessModal,
        selectedVoiceForProcess,
        tempFile,
        fileInputRef,
        handleRefresh,
        handleDelete,
        handleReprocess,
        handleSaveTranscription,
        handleFileChange,
        refreshTtsData
    } = useVoicesManagement();

    if (!isOpen) return null;

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
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleRefresh} 
                            disabled={isLoadingTtsData}
                            className={`p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-all flex items-center gap-2 text-xs font-bold ${isLoadingTtsData ? 'opacity-50' : ''}`}
                            title="Refresh List"
                        >
                            <span className={isLoadingTtsData ? 'animate-spin' : ''}>
                                <Wand2 size={16} />
                            </span>
                            {isLoadingTtsData ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors ml-2">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Upload Section */}
                    <UploadSection 
                        isUploading={isUploading}
                        tempFile={tempFile}
                        handleFileChange={handleFileChange}
                        fileInputRef={fileInputRef}
                        transcription={transcription}
                        setTranscription={setTranscription}
                        uploadError={uploadError}
                    />

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
                                    <VoiceItem 
                                        key={voice.id}
                                        voice={voice}
                                        editingId={editingId}
                                        editText={editText}
                                        setEditingId={setEditingId}
                                        setEditText={setEditText}
                                        handleSaveTranscription={handleSaveTranscription}
                                        handleReprocess={handleReprocess}
                                        handleDelete={handleDelete}
                                    />
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
