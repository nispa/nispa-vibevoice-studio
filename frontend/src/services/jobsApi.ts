import { apiGet, apiPostJson, apiFetch } from './apiClient';
import type { Job } from '../hooks/useJobArchive';

export interface JobsResponse {
    jobs: Job[];
}

export const jobsApi = {
    list: (limit = 100, workflow_type?: string) => {
        const query = workflow_type ? `/api/jobs?limit=${limit}&workflow_type=${encodeURIComponent(workflow_type)}` : `/api/jobs?limit=${limit}`;
        return apiGet<JobsResponse>(query);
    },

    create: (jobData: unknown, silent?: boolean) =>
        apiPostJson<Job>('/api/jobs/create', jobData).catch(err => {
            if (!silent) throw err;
            return null;
        }),

    update: (jobId: number, updateData: unknown) =>
        apiPostJson<Job>(`/api/jobs/${jobId}`, updateData),

    delete: (jobId: number) =>
        apiFetch(`/api/jobs/${jobId}`, { method: 'DELETE' }),

    put: (jobId: number, updateData: unknown) =>
        apiFetch(`/api/jobs/${jobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        }),
};
