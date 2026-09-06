import React from 'react';
import { Loader2 } from 'lucide-react';
import type { DownloadProgressState } from '../../../services/modelsApi';

interface ActiveDownloadBannerProps {
    downloadState: DownloadProgressState;
    onCancel: () => void;
}

/**
 * Banner showing active model download progress, speed, and cancel control.
 */
export const ActiveDownloadBanner: React.FC<ActiveDownloadBannerProps> = ({
    downloadState,
    onCancel,
}) => {
    return (
        <div className="px-6 py-4 bg-blue-950/30 border-b border-blue-500/30 flex flex-col gap-2 shrink-0 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-blue-200">
                    <Loader2 size={14} className="animate-spin text-blue-400 shrink-0" />
                    <span>{downloadState.message || 'Downloading model files...'}</span>
                    {downloadState.current_file && (
                        <span className="font-mono text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded text-[11px] truncate max-w-xs">
                            {downloadState.current_file}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
                    {downloadState.speed_mb_s !== undefined && (
                        <span>{downloadState.speed_mb_s} MB/s</span>
                    )}
                    <span className="font-bold text-blue-400">{downloadState.progress_percent}%</span>
                    <button
                        onClick={onCancel}
                        className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-500 text-white rounded text-xs transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${Math.max(3, downloadState.progress_percent)}%` }}
                />
            </div>
        </div>
    );
};
