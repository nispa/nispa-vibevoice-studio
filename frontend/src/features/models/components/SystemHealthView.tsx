import React from 'react';
import {
    Cpu,
    Wrench,
    Shield,
    HardDrive,
    Loader2
} from 'lucide-react';
import type { SystemHealth } from '../../../services/modelsApi';

interface SystemHealthViewProps {
    health: SystemHealth | null;
}

/**
 * Renders hardware, environment, and system utilities diagnostics.
 */
export const SystemHealthView: React.FC<SystemHealthViewProps> = ({ health }) => {
    if (!health) {
        return (
            <div className="p-12 text-center text-slate-500 text-sm">
                <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-400" />
                Querying system diagnostics...
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GPU Diagnostics */}
            <div className="p-5 bg-slate-850/60 border border-slate-700/60 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                        <Cpu size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">GPU Hardware & CUDA</h3>
                        <p className="text-xs text-slate-400">{health.gpu.device_name}</p>
                    </div>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                        <span>CUDA Acceleration:</span>
                        <strong className={health.gpu.available ? 'text-emerald-400' : 'text-rose-400'}>
                            {health.gpu.available ? `Active (v${health.gpu.cuda_version})` : 'Disabled / CPU Mode'}
                        </strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                        <span>Total VRAM:</span>
                        <strong className="text-white">{health.gpu.vram_total_gb} GB</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                        <span>Free VRAM:</span>
                        <strong className="text-emerald-400">{health.gpu.vram_free_gb} GB</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                        <span>Currently Allocated:</span>
                        <strong className="text-indigo-300">{health.gpu.vram_allocated_gb} GB</strong>
                    </div>
                </div>
            </div>

            {/* Critical System Tools */}
            <div className="p-5 bg-slate-850/60 border border-slate-700/60 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                        <Wrench size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">System Utilities</h3>
                        <p className="text-xs text-slate-400">Audio processing & formatting tools</p>
                    </div>
                </div>

                <div className="space-y-3 pt-2 text-xs">
                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div>
                            <span className="font-semibold text-white">FFmpeg</span>
                            <p className="text-[11px] text-slate-500 truncate max-w-xs">
                                {health.tools.ffmpeg.path || 'Not detected'}
                            </p>
                        </div>
                        <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                health.tools.ffmpeg.available
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                        >
                            {health.tools.ffmpeg.available ? 'READY' : 'MISSING'}
                        </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div>
                            <span className="font-semibold text-white">SoX</span>
                            <p className="text-[11px] text-slate-500 truncate max-w-xs">
                                {health.tools.sox.path || 'Not detected'}
                            </p>
                        </div>
                        <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                health.tools.sox.available
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                        >
                            {health.tools.sox.available ? 'READY' : 'MISSING'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Worker Environment */}
            <div className="p-5 bg-slate-850/60 border border-slate-700/60 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Modern Engines Environment</h3>
                        <p className="text-xs text-slate-400">Dedicated worker for OmniVoice & Higgs</p>
                    </div>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                        <span>Worker Status:</span>
                        <strong className={health.worker_env.available ? 'text-emerald-400' : 'text-amber-400'}>
                            {health.worker_env.available ? 'Ready (venv_omnivoice)' : 'Not Installed'}
                        </strong>
                    </div>
                    {health.worker_env.path && (
                        <div className="text-[11px] text-slate-500 font-mono break-all">
                            Path: {health.worker_env.path}
                        </div>
                    )}
                </div>
            </div>

            {/* Storage Overview */}
            <div className="p-5 bg-slate-850/60 border border-slate-700/60 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                        <HardDrive size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Disk Storage</h3>
                        <p className="text-xs text-slate-400">Volume hosting data/model</p>
                    </div>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                        <span>Free Storage:</span>
                        <strong className="text-emerald-400">{health.storage.free_gb} GB</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                        <span>Used Storage:</span>
                        <strong className="text-white">{health.storage.used_gb} GB</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                        <span>Capacity:</span>
                        <strong className="text-slate-300">{health.storage.total_gb} GB</strong>
                    </div>
                </div>
            </div>
        </div>
    );
};
