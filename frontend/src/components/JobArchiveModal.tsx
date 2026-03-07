import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useJobArchive } from '../hooks/useJobArchive';
import type { Job } from '../hooks/useJobArchive';
import { JobTableRow } from './archive/JobTableRow';

interface JobArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadJob: (job: Job) => void;
}

export const JobArchiveModal: React.FC<JobArchiveModalProps> = ({
    isOpen,
    onClose,
    onLoadJob,
}) => {
    const { jobs, loading, loadJobs, deleteJob, downloadSrt } = useJobArchive();
    const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadJobs();
        }
    }, [isOpen, loadJobs]);

    const handleLoadJob = (job: Job) => {
        onLoadJob(job);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel relative bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in">

                {/* Header */}
                <div className="border-b border-slate-700/50 bg-slate-800/30 p-6 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[64px] -z-10" />
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-slate-100">Job Archive</h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {loading ? 'Loading...' : `${jobs.length} jobs archived`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="relative z-10 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Jobs List */}
                <div className="flex-1 overflow-auto p-6 bg-slate-950/50">
                    {jobs.length === 0 ? (
                        <div className="text-slate-500 italic flex items-center justify-center h-full min-h-[200px]">
                            {loading ? 'Loading jobs...' : 'No archived jobs yet. Your completed jobs will appear here.'}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {jobs.map((job) => (
                                <JobTableRow
                                    key={job.id}
                                    job={job}
                                    isExpanded={expandedJobId === job.id}
                                    onToggleExpand={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                                    onDelete={deleteJob}
                                    onLoad={handleLoadJob}
                                    onDownloadSrt={downloadSrt}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-700/50 bg-slate-900/80 px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={loadJobs}
                        disabled={loading}
                        className="text-sm px-4 py-2 bg-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-700 border border-slate-600 rounded-lg transition inline-flex items-center gap-2"
                    >
                        {loading ? '...' : '↻ Refresh'}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600 rounded-lg transition font-medium"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};

