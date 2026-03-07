import React from 'react';
import { Cpu } from 'lucide-react';
import type { SystemInfoData } from '../../hooks/useSystemInfo';

interface SystemDetailsProps {
    system: SystemInfoData['system'];
    torch: SystemInfoData['torch'];
}

export const SystemDetails = ({ system, torch }: SystemDetailsProps) => {
    return (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-700/30 rounded-lg">
                    <Cpu className="text-slate-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-100">System Details</h3>
            </div>

            <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                    <span className="font-medium text-slate-400">Platform</span>
                    <span className="text-slate-200 font-mono">{system.platform}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                    <span className="font-medium text-slate-400">Platform Release</span>
                    <span className="text-slate-200 font-mono">{system.platform_release}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                    <span className="font-medium text-slate-400">Python Version</span>
                    <span className="text-slate-200 font-mono">{system.python_version}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                    <span className="font-medium text-slate-400">PyTorch Version</span>
                    <span className="text-slate-200 font-mono">{torch.version}</span>
                </div>
            </div>
        </div>
    );
};
