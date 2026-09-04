import { useState, useRef } from 'react';
import { useGlobalContext } from '../../context/GlobalContext';
import type { Voice } from '../../context/GlobalContext';
import { voicesApi } from '../../services/voicesApi';
import { showConfirm } from '../../utils/uiEvents';

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
    const [selectedVoiceForProcess, setSelectedVoiceForProcess] = useState<Voice | null>(null);
    
    // Props for FileUploadArea
    const [tempFile, setTempFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleRefresh = async () => {
        await refreshTtsData();
    };

    const handleDelete = async (voiceId: string) => {
        const confirmed = await showConfirm({
            title: 'Delete Voice',
            message: `Are you sure you want to delete the voice "${voiceId}"?`,
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            variant: 'danger',
        });
        if (!confirmed) return;

        try {
            const res = await voicesApi.delete(voiceId);
            if (res.ok) {
                await refreshTtsData();
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    const handleReprocess = (voice: Voice) => {
        setSelectedVoiceForProcess(voice);
        setShowProcessModal(true);
    };

    const handleSaveTranscription = async (voiceId: string) => {
        try {
            const res = await voicesApi.saveTranscription(voiceId, editText);
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
            const res = await voicesApi.upload(formData);
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
        } catch {
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
