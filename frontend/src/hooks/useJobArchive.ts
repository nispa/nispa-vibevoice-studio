import { useState, useCallback } from 'react';

export interface Segment {
    index: number;
    start_ms: number;
    end_ms: number;
    text: string;
}

export interface Job {
    id: number;
    original_filename: string;
    subtitle_segments: Segment[];
    modified_segments: Segment[];
    voice_id: string;
    voice_name: string;
    model_name: string;
    group_by_punctuation: boolean;
    notes: string | null;
    audio_url: string | null;
    created_at: string;
    updated_at: string;
    status: string;
}

export function useJobArchive() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(false);

    const loadJobs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/jobs?limit=100');
            if (res.ok) {
                const data = await res.json();
                setJobs(data.jobs);
            }
        } catch (err) {
            console.error('Failed to load jobs:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteJob = useCallback(async (jobId: number) => {
        if (confirm('Are you sure you want to delete this job?')) {
            try {
                const res = await fetch(`http://localhost:8000/api/jobs/${jobId}`, {
                    method: 'DELETE',
                });
                if (res.ok) {
                    await loadJobs();
                }
            } catch (err) {
                console.error('Failed to delete job:', err);
            }
        }
    }, [loadJobs]);

    const downloadSrt = useCallback((job: Job) => {
        if (!job.modified_segments || job.modified_segments.length === 0) {
            alert("No segments to download.");
            return;
        }

        const formatTimeSrt = (ms: number): string => {
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const milliseconds = Math.floor(ms % 1000);
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
        };

        let srtContent = '';
        job.modified_segments.forEach((seg, i) => {
            const index = i + 1;
            const startTime = formatTimeSrt(seg.start_ms);
            const endTime = formatTimeSrt(seg.end_ms);
            srtContent += `${index}\n${startTime} --> ${endTime}\n${seg.text}\n\n`;
        });

        const blob = new Blob([srtContent], { type: 'text/srt' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${job.original_filename.replace(/\.[^/.]+$/, "")}_translated.srt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, []);

    const saveJobDraft = useCallback(async (jobData: any, silent = false) => {
        try {
            const res = await fetch('http://localhost:8000/api/jobs/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobData),
            });

            if (res.ok) {
                const savedJob = await res.json();
                if (!silent) {
                    alert(`Job #${savedJob.id} saved as draft!`);
                }
                await loadJobs(); // Refresh the list
                return savedJob;
            } else {
                if (!silent) alert('Failed to save job');
            }
        } catch (err) {
            console.error('Error saving job:', err);
            if (!silent) alert('Error saving job');
        }
        return null;
    }, [loadJobs]);

    return {
        jobs,
        loading,
        loadJobs,
        deleteJob,
        downloadSrt,
        saveJobDraft
    };
}
