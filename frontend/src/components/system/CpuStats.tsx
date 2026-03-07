import React from 'react';
import { Cpu } from 'lucide-react';
import type { SystemInfoData } from '../../hooks/useSystemInfo';

export const CpuStats = ({ cpu }: { cpu: SystemInfoData['cpu'] }) => {
    return (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-orange-500/10 rounded-lg">
                    <Cpu className="text-orange-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-100">CPU</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1">Physical Cores</p>
                    <p className="text-2xl font-bold text-slate-200">{cpu.physical_cores}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1">Logical Cores</p>
                    <p className="text-2xl font-bold text-slate-200">{cpu.logical_cores}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1">CPU Usage</p>
                    <p className="text-2xl font-bold text-orange-400">{cpu.cpu_percent}%</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1">Total Memory</p>
                    <p className="text-xl font-bold text-slate-200">
                        {cpu.memory_total_gb.toFixed(1)} <span className="text-sm font-normal text-slate-400">GB</span>
                    </p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-1">Available Memory</p>
                    <p className="text-xl font-bold text-emerald-400">
                        {cpu.memory_available_gb.toFixed(1)} <span className="text-sm font-normal text-emerald-400/70">GB</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
