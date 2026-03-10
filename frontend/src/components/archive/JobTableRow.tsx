import React from 'react';
import { Download, Copy, Trash2 } from 'lucide-react';
import type { Job } from '../../hooks/useJobArchive';
import { AudioWaveformPlayer } from '../ui/AudioWaveformPlayer';

interface JobTableRowProps {
    job: Job;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onDelete: (id: number) => void;
    onLoad: (job: Job) => void;
    onDownloadSrt: (job: Job) => void;
}

function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString();
}

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'draft':
            return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        case 'processing':
            return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'completed':
            return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        case 'failed':
            return 'bg-red-500/20 text-red-400 border-red-500/30';
        default:
            return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
};

export const JobTableRow: React.FC<JobTableRowProps> = ({
    job,
    isExpanded,
    onToggleExpand,
    onDelete,
    onLoad,
    onDownloadSrt
}) => {
    return (
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg overflow-hidden">
            {/* Job Header */}
            <div
                className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/60 transition"
                onClick={onToggleExpand}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-block px-2 py-1 text-xs font-bold rounded border ${getStatusColor(job.status)}`}>
                            {job.status.toUpperCase()}
                        </span>
                        {job.notes?.toLowerCase().includes('translation') && (
                             <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-1 text-xs font-bold rounded">
                                TRANSLATED
                             </span>
                        )}
                        {job.group_by_punctuation && (
                             <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 text-xs font-bold rounded">
                                GROUPED
                             </span>
                        )}
                        <span className="text-sm font-mono text-slate-400">
                            #{job.id}
                        </span>
                    </div>
                    <p className="text-slate-200 font-medium truncate">
                        {job.original_filename}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        {job.voice_name} • {job.model_name} • {formatDateTime(job.created_at)}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {job.audio_url && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const a = document.createElement('a');
                                a.href = job.audio_url!;
                                a.download = `job_${job.id}.mp3`;
                                a.click();
                            }}
                            title="Download audio"
                            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                        >
                            <Download size={18} />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDownloadSrt(job);
                        }}
                        title="Download SRT"
                        className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg transition"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onLoad(job);
                        }}
                        title="Load this job"
                        className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 rounded-lg transition"
                    >
                        <Copy size={18} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(job.id);
                        }}
                        title="Delete job"
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="border-t border-slate-700/30 bg-slate-900/30 p-4 space-y-4">
                    {job.notes && (
                        <div>
                            <p className="text-xs text-slate-500 mb-2">Notes</p>
                            <p className="text-sm text-slate-300 bg-slate-900/50 p-2 rounded">
                                {job.notes}
                            </p>
                        </div>
                    )}

                    <div>
                        <p className="text-xs text-slate-500 mb-2">
                            Modified Segments ({job.modified_segments.length})
                        </p>
                        <div className="max-h-[200px] overflow-auto space-y-2">
                            {job.modified_segments.slice(0, 5).map((seg) => (
                                <div key={seg.index} className="bg-slate-800/60 p-2 rounded text-xs">
                                    <p className="text-slate-400 font-mono">
                                        [{seg.index}] ({formatTime(seg.start_ms)} → {formatTime(seg.end_ms)})
                                    </p>
                                    <p className="text-slate-300 mt-1">{seg.text}</p>
                                </div>
                            ))}
                            {job.modified_segments.length > 5 && (
                                <p className="text-slate-500 text-xs italic">
                                    ... and {job.modified_segments.length - 5} more
                                </p>
                            )}
                        </div>
                    </div>

                    {job.audio_url && (
                        <div>
                            <p className="text-xs text-slate-500 mb-2">Preview Audio</p>
                            <AudioWaveformPlayer 
                                audioUrl={job.audio_url}
                                showDownload={true}
                                downloadFilename={`job_${job.id}`}
                                barColor="#6366f1"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
