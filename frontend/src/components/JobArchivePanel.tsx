import React, { useEffect, useState } from 'react';
import { History, RefreshCw, Search } from 'lucide-react';
import { useJobArchive } from '../hooks/useJobArchive';
import type { Job } from '../hooks/useJobArchive';
import { JobTableRow } from './archive/JobTableRow';

interface JobArchivePanelProps {
    onLoadJob: (job: Job) => void;
}

export const JobArchivePanel: React.FC<JobArchivePanelProps> = ({ onLoadJob }) => {
    const { jobs, loading, loadJobs, deleteJob, downloadSrt } = useJobArchive();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedJobs, setExpandedJobs] = useState<number[]>([]);

    useEffect(() => {
        loadJobs();
    }, [loadJobs]);

    const toggleExpand = (id: number) => {
        setExpandedJobs(prev => 
            prev.includes(id) ? prev.filter(jobId => jobId !== id) : [...prev, id]
        );
    };

    const filteredJobs = jobs.filter(job => 
        job.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-slate-800/20 border border-slate-700/50 rounded-xl overflow-hidden flex flex-col h-full min-h-[400px]">
            {/* ... header and search ... */}
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <History size={18} className="text-amber-400" />
                    <h3 className="font-semibold text-slate-200">Recent Jobs</h3>
                </div>
                <button 
                    onClick={loadJobs}
                    disabled={loading}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="p-3 border-b border-slate-700/50 bg-slate-900/20">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                        type="text"
                        placeholder="Search jobs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500/50"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                {loading && jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm italic">
                        <RefreshCw size={24} className="animate-spin mb-2 opacity-20" />
                        Loading archive...
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm italic">
                        No jobs found.
                    </div>
                ) : (
                    filteredJobs.map(job => (
                        <JobTableRow 
                            key={job.id}
                            job={job}
                            isExpanded={expandedJobs.includes(job.id)}
                            onToggleExpand={() => toggleExpand(job.id)}
                            onDelete={deleteJob}
                            onLoad={onLoadJob}
                            onDownloadSrt={downloadSrt}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
