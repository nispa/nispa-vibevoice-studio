import { useState, useCallback } from 'react';
import { jobsApi } from '../services/jobsApi';
import { formatTimeSrt } from '../utils/format';
import { showConfirm, showToast } from '../utils/uiEvents';

/**
 * Represents a single subtitle segment in a job.
 */
export interface Segment {
    index: number;
    start_ms: number;
    end_ms: number;
    text: string;
    is_translated?: boolean;
    original_text?: string | null;
    audioUrl?: string;
}

/**
 * Represents a voiceover job record from the archive.
 */
export interface Job {
    id: number;
    original_filename: string;
    subtitle_segments: Segment[];
    modified_segments: Segment[];
    voice_id: string;
    voice_name: string;
    model_name: string;
    language: string | null;
    group_by_punctuation: boolean;
    notes: string | null;
    audio_url: string | null;
    created_at: string;
    updated_at: string;
    status: string;
}

/**
 * Custom hook to manage the lifecycle of voiceover jobs in the archive.
 * 
 * Provides functionality to load, delete, save drafts, and export jobs to SRT.
 * 
 * @returns {object} State and handlers for managing the job archive.
 */
export function useJobArchive() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(false);

    /**
     * Fetches the list of all jobs from the backend (lightweight version).
     */
    const loadJobs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await jobsApi.list();
            setJobs(data.jobs);
        } catch (err) {
            console.error('Failed to load jobs:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Deletes a specific job by ID after user confirmation.
     * 
     * @param {number} jobId - The ID of the job to delete.
     */
    const deleteJob = useCallback(async (jobId: number) => {
        const confirmed = await showConfirm({
            title: 'Delete Job',
            message: 'Are you sure you want to delete this job?',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            variant: 'danger',
        });
        if (confirmed) {
            try {
                const res = await jobsApi.delete(jobId);
                if (res.ok) {
                    await loadJobs();
                }
            } catch (err) {
                console.error('Failed to delete job:', err);
            }
        }
    }, [loadJobs]);

    /**
     * Generates and triggers a download for an SRT file based on a job's segments.
     * 
     * @param {Job} job - The job object containing segments to export.
     */
    const downloadSrt = useCallback((job: Job) => {
        const segments = job.modified_segments || job.subtitle_segments || [];

        if (segments.length === 0) {
            showToast("No segments to download.", 'info');
            return;
        }

        let srtContent = '';
        segments.forEach((seg, i) => {
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
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, []);

    /**
     * Saves a job configuration as a draft in the backend.
     * 
     * @param {any} jobData - The job configuration data to save.
     * @param {boolean} silent - If true, suppresses the success alert. Defaults to false.
     * @returns {Promise<Job | null>} The saved job record or null if failed.
     */
    const saveJobDraft = useCallback(async (jobData: unknown, silent = false) => {
        try {
            const savedJob = await jobsApi.create(jobData, silent);
            if (savedJob) {
                if (!silent) {
                    showToast(`Job #${savedJob.id} saved as draft!`, 'success');
                }
                await loadJobs();
                return savedJob;
            } else if (!silent) {
                showToast('Failed to save job', 'error');
            }
        } catch (err) {
            console.error('Error saving job:', err);
            if (!silent) showToast('Error saving job', 'error');
        }
        return null;
    }, [loadJobs]);

    /**
     * Updates an existing job record in the database.
     * 
     * @param {number} jobId - The ID of the job to update.
     * @param {any} updateData - The updated job data (modified_segments, notes, etc).
     * @returns {Promise<Job | null>} The updated job record or null if failed.
     */
    const updateJob = useCallback(async (jobId: number, updateData: unknown) => {
        try {
            const res = await jobsApi.put(jobId, updateData);
            if (res.ok) {
                const updatedJob: Job = await res.json();
                setJobs(prev => prev.map(j => j.id === jobId ? updatedJob : j));
                return updatedJob;
            } else {
                const error = await res.json();
                console.error('Update failed:', error);
            }
        } catch (err) {
            console.error('Error updating job:', err);
        }
        return null;
    }, []);

    return {
        jobs,
        loading,
        loadJobs,
        deleteJob,
        downloadSrt,
        saveJobDraft,
        updateJob
    };
}
