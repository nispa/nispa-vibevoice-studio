import React, { useState, useEffect } from 'react';
import { X, FileText, ArrowUpRight, Trash2, Volume2, Calendar, Users, Cpu, Play } from 'lucide-react';
import { useJobArchive } from '../../../../hooks/useJobArchive';
import type { Job } from '../../../../hooks/useJobArchive';
import { useScriptContext } from '../../context/ScriptContext';

interface ScriptArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function formatDateTime(isoString: string): string {
    try {
        const date = new Date(isoString);
        return date.toLocaleString();
    } catch {
        return isoString;
    }
}

export const ScriptArchiveModal: React.FC<ScriptArchiveModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { jobs, loading, loadJobs, deleteJob } = useJobArchive('script');
    const { loadFromScriptJob } = useScriptContext();
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadJobs();
        }
    }, [isOpen, loadJobs]);

    if (!isOpen) return null;

    const handleLoadScript = (job: Job) => {
        loadFromScriptJob(job);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="glass-panel relative bg-slate-900/95 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">

                {/* Modal Header */}
                <div className="border-b border-slate-700/50 bg-slate-800/40 p-6 flex justify-between items-center relative">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <FileText size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-100">Untimed Script Archive</h2>
                            <p className="text-slate-400 text-sm mt-0.5">
                                {loading ? 'Loading scripts...' : `${jobs.length} saved script ${jobs.length === 1 ? 'generation' : 'generations'}`}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scripts List */}
                <div className="flex-1 overflow-auto p-6 space-y-4 bg-slate-950/40">
                    {jobs.length === 0 ? (
                        <div className="text-center py-16 text-slate-500">
                            <FileText size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
                            <p className="text-base font-medium text-slate-400">No archived scripts found</p>
                            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                                When you generate a voiceover in Script Mode, it will automatically be saved here so you can reload or review it anytime.
                            </p>
                        </div>
                    ) : (
                        jobs.map((job) => {
                            const isSelected = selectedJobId === job.id;
                            const lineCount = job.modified_segments?.length || job.subtitle_segments?.length || 0;
                            const previewLines = (job.modified_segments || job.subtitle_segments || []).slice(0, 3);

                            let detectedSpeakers: string[] = [];
                            if (job.notes) {
                                try {
                                    const parsed = JSON.parse(job.notes);
                                    detectedSpeakers = parsed.detected_speakers || Object.keys(parsed.speaker_voice_map || {});
                                } catch {}
                            }

                            return (
                                <div
                                    key={job.id}
                                    className={`border rounded-xl p-5 transition-all ${
                                        isSelected
                                            ? 'bg-slate-800/60 border-indigo-500/40 shadow-lg'
                                            : 'bg-slate-900/50 border-slate-800 hover:border-slate-700/80 hover:bg-slate-800/30'
                                    }`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <h3 className="font-semibold text-slate-200 text-base">
                                                    {job.original_filename}
                                                </h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                                                    job.status === 'completed'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : job.status === 'processing'
                                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                }`}>
                                                    {job.status}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar size={13} className="text-slate-500" />
                                                    {formatDateTime(job.created_at)}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Cpu size={13} className="text-slate-500" />
                                                    {job.model_name}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Users size={13} className="text-slate-500" />
                                                    {lineCount} lines ({detectedSpeakers.length > 0 ? detectedSpeakers.join(', ') : job.voice_name})
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleLoadScript(job)}
                                                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-medium"
                                                title="Load this script, speakers, and voices back into the editor"
                                            >
                                                <ArrowUpRight size={14} />
                                                Load into Editor
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedJobId(isSelected ? null : job.id)}
                                                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition text-xs"
                                                title="Toggle Details & Audio"
                                            >
                                                <Volume2 size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteJob(job.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-slate-700/50 transition text-xs"
                                                title="Delete script from archive"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Audio & Lines Preview */}
                                    {isSelected && (
                                        <div className="mt-4 pt-4 border-t border-slate-700/40 space-y-3">
                                            {job.audio_url && (
                                                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                                                    <div className="text-xs text-slate-400 mb-1.5 font-medium flex items-center gap-1.5">
                                                        <Play size={12} className="text-indigo-400" />
                                                        Combined Dialogue Audio:
                                                    </div>
                                                    <audio
                                                        controls
                                                        src={job.audio_url}
                                                        className="w-full h-8"
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-1.5">
                                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                    Script Preview ({lineCount} lines):
                                                </div>
                                                <div className="bg-slate-950/40 rounded-lg p-3 space-y-1 text-xs font-mono text-slate-300 border border-slate-800/80">
                                                    {previewLines.map((line, idx) => (
                                                        <div key={idx} className="truncate">
                                                            <span className="text-indigo-400 font-semibold">
                                                                {line.original_text || 'Speaker'}:
                                                            </span>{' '}
                                                            <span className="text-slate-200">{line.text}</span>
                                                        </div>
                                                    ))}
                                                    {lineCount > 3 && (
                                                        <div className="text-slate-500 text-[11px] italic pt-0.5">
                                                            ...and {lineCount - 3} more lines
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-700/50 bg-slate-800/30 p-4 px-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
