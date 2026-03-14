import { useState, useEffect } from 'react';
import type { Segment } from './types';
import { parseTimeToMs } from './utils';

export const useSubtitleEditor = (initialSegments: Segment[], onSegmentsSave: (segments: Segment[]) => void, onClose: () => void) => {
    const [segments, setSegments] = useState<Segment[]>(initialSegments);
    const [isFinalizing, setIsFinalizing] = useState(false);

    useEffect(() => {
        setSegments(initialSegments);
    }, [initialSegments]);

    const handleTextChange = (index: number, newText: string) => {
        const updated = [...segments];
        updated[index] = { ...updated[index], text: newText, isApproved: false };
        setSegments(updated);
    };

    const handleAudioUpdated = (index: number, audioUrl: string) => {
        const updated = [...segments];
        updated[index] = { ...updated[index], audioUrl, isApproved: true };
        setSegments(updated);
    };

    const handleApprovalToggle = (index: number) => {
        const updated = [...segments];
        updated[index] = { ...updated[index], isApproved: !updated[index].isApproved };
        setSegments(updated);
    };

    const handleStartTimeChange = (index: number, newStart: string) => {
        const updated = [...segments];
        updated[index] = { ...updated[index], start_ms: parseTimeToMs(newStart) };
        setSegments(updated);
    };

    const handleEndTimeChange = (index: number, newEnd: string) => {
        const updated = [...segments];
        updated[index] = { ...updated[index], end_ms: parseTimeToMs(newEnd) };
        setSegments(updated);
    };

    const handleDeleteSegment = (index: number) => {
        setSegments(segments.filter((_, i) => i !== index));
    };

    const handleSegmentTranslated = (index: number, translatedSeg: Segment) => {
        const updated = [...segments];
        updated[index] = { ...translatedSeg, isApproved: false };
        setSegments(updated);
    };

    const handleAddSegment = () => {
        const lastSegment = segments[segments.length - 1];
        const newStart = lastSegment ? lastSegment.end_ms : 0;
        const newEnd = newStart + 5000;
        const newSegment: Segment = {
            index: segments.length + 1,
            start_ms: newStart,
            end_ms: newEnd,
            text: '',
        };
        setSegments([...segments, newSegment]);
    };

    const handleSave = () => {
        // Reindex segments
        const reindexed = segments.map((seg, idx) => ({
            ...seg,
            index: idx + 1,
        }));
        onSegmentsSave(reindexed);
        onClose();
    };

    const handleFinalizeAudio = async () => {
        const approvedSegments = segments.filter(s => s.isApproved && s.audioUrl);
        if (approvedSegments.length === 0) {
            alert("No verified segments to join. Please generate and verify audio for segments first.");
            return;
        }

        setIsFinalizing(true);
        try {
            const fd = new FormData();
            fd.append('segments_json', JSON.stringify(approvedSegments));
            fd.append('output_format', 'mp3');

            const res = await fetch('http://localhost:8000/api/finalize-audio', {
                method: 'POST',
                body: fd
            });

            if (res.ok) {
                const data = await res.json();
                const audioBlob = await (await fetch(`data:audio/mp3;base64,${data.audio_base64}`)).blob();
                const url = URL.createObjectURL(audioBlob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `final_voiceover_${new Date().getTime()}.mp3`;
                a.click();
                
                alert(`Successfully joined ${approvedSegments.length} segments!`);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to finalize audio.");
        } finally {
            setIsFinalizing(true); // Keep success state or reset? Resetting for now.
            setIsFinalizing(false);
        }
    };

    const handleReset = () => {
        setSegments(initialSegments);
    };

    return {
        segments,
        isFinalizing,
        handleTextChange,
        handleAudioUpdated,
        handleApprovalToggle,
        handleStartTimeChange,
        handleEndTimeChange,
        handleDeleteSegment,
        handleSegmentTranslated,
        handleAddSegment,
        handleSave,
        handleFinalizeAudio,
        handleReset
    };
};
