import React from 'react';
import {
    Download,
    Trash2,
    CheckCircle2,
    Sparkles
} from 'lucide-react';
import type { ManagedModel } from '../../../services/modelsApi';

interface ModelCardProps {
    model: ManagedModel;
    isTargeted?: boolean;
    isDownloadingOverall: boolean;
    isThisModelDownloading: boolean;
    onDownload: (modelId: string) => void;
    onCancelDownload: () => void;
    onDelete: (model: ManagedModel) => void;
}

/**
 * Renders an individual TTS / Speech model card with capabilities, specs, and lifecycle actions.
 */
export const ModelCard: React.FC<ModelCardProps> = ({
    model: m,
    isTargeted = false,
    isDownloadingOverall,
    isThisModelDownloading,
    onDownload,
    onCancelDownload,
    onDelete
}) => {
    return (
        <div
            className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                isTargeted
                    ? 'bg-indigo-950/20 border-indigo-500/60 ring-1 ring-indigo-500/40'
                    : m.installed
                    ? 'bg-slate-850/60 border-slate-700/60'
                    : 'bg-slate-900/50 border-slate-800/80 opacity-90'
            }`}
        >
            <div className="space-y-2">
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            {m.name}
                            {m.installed && (
                                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                            )}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                            {m.description}
                        </p>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-slate-700 bg-slate-800/80 text-slate-300 shrink-0">
                        {m.engine}
                    </span>
                </div>

                {/* Capability pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.supports_voice_clone && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 font-medium">
                            Voice Cloning
                        </span>
                    )}
                    {m.supports_voice_design && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 font-medium">
                            Voice Design
                        </span>
                    )}
                    {m.supports_emotion_tags && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium flex items-center gap-1">
                            <Sparkles size={10} />
                            Emotion Tags
                        </span>
                    )}
                    {m.sample_rate > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                            {m.sample_rate / 1000}kHz
                        </span>
                    )}
                    {m.requires_reference_transcript && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                            Requires .txt Transcript
                        </span>
                    )}
                </div>

                {/* Technical Specs & Storage */}
                <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800">
                    <div>
                        Disk:{' '}
                        <strong className="text-slate-200">
                            {m.installed && m.actual_size_gb > 0
                                ? `${m.actual_size_gb} GB`
                                : `~${m.disk_size_gb} GB`}
                        </strong>
                    </div>
                    {m.vram_cost_gb > 0 && (
                        <div>
                            VRAM: <strong className="text-slate-200">~{m.vram_cost_gb} GB</strong>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Button */}
            <div className="pt-4 flex items-center justify-end gap-2">
                {m.installed ? (
                    <button
                        onClick={() => onDelete(m)}
                        disabled={isDownloadingOverall}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-rose-900/40 hover:text-rose-300 text-slate-400 border border-slate-700/60 transition flex items-center gap-1.5 cursor-pointer"
                        title="Delete weights from disk"
                    >
                        <Trash2 size={13} />
                        Uninstall
                    </button>
                ) : isThisModelDownloading ? (
                    <button
                        onClick={onCancelDownload}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600/80 hover:bg-rose-500 text-white transition flex items-center gap-1.5 cursor-pointer"
                    >
                        Cancel
                    </button>
                ) : (
                    <button
                        onClick={() => onDownload(m.id)}
                        disabled={isDownloadingOverall}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                            isDownloadingOverall
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                        }`}
                    >
                        <Download size={13} />
                        Install ({m.disk_size_gb} GB)
                    </button>
                )}
            </div>
        </div>
    );
};
