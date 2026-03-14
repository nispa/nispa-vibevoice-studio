import { useState, useRef } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';

export const useVoicesManagement = () => {
    const { voices, refreshTtsData, isLoadingTtsData } = useGlobalContext();
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
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

    const handleRefresh = async () => {
        await refreshTtsData();
    };

    const handleDelete = async (voiceId: string) => {
        if (!confirm(`Are you sure you want to delete the voice "${voiceId}"?`)) return;

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/voices/${voiceId}`, { method: 'DELETE' });
            if (res.ok) {
                await refreshTtsData();
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
                await refreshTtsData();
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

        setIsUploading(true);
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
                // Small delay to allow OS file system to settle
                setTimeout(async () => {
                    await refreshTtsData();
                    setIsUploading(false);
                    setTempFile(null);
                    setTranscription('');
                }, 500);
            } else {
                const data = await res.json();
                setUploadError(data.detail || "Upload failed");
                setIsUploading(false);
                setTempFile(null);
            }
        } catch (err) {
            setUploadError("Network error during upload");
            setIsUploading(false);
            setTempFile(null);
        }
    };

    return {
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
    };
};
