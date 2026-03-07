import React, { useEffect } from 'react';
import { Cpu, AlertCircle } from 'lucide-react';
import { useSystemInfo } from '../hooks/useSystemInfo';
import { CpuStats } from './system/CpuStats';
import { GpuStats } from './system/GpuStats';
import { SystemDetails } from './system/SystemDetails';
import { PerformanceStatus } from './system/PerformanceStatus';

interface SystemInfoProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SystemInfo = ({ isOpen, onClose }: SystemInfoProps) => {
    const { systemInfo, isLoading, error, fetchSystemInfo } = useSystemInfo();

    useEffect(() => {
        if (isOpen) {
            fetchSystemInfo();
        }
    }, [isOpen, fetchSystemInfo]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel relative bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
                {/* Header */}
                <div className="border-b border-slate-700/50 bg-slate-800/30 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[64px] -z-10" />
                    <div className="flex justify-between items-center relative z-10">
                        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                            <Cpu className="text-indigo-400" size={28} />
                            System Information
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 md:p-8 space-y-8 bg-slate-950/30 text-slate-200 shadow-inner">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                            <p className="text-slate-400 mt-4">Loading system information...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                            <div>
                                <h3 className="text-red-300 font-semibold">Error</h3>
                                <p className="text-red-400/80 text-sm">{error}</p>
                            </div>
                        </div>
                    ) : systemInfo ? (
                        <>
                            <GpuStats torch={systemInfo.torch} gpu={systemInfo.gpu} />
                            <CpuStats cpu={systemInfo.cpu} />
                            <SystemDetails system={systemInfo.system} torch={systemInfo.torch} />
                            <PerformanceStatus torch={systemInfo.torch} />
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-700/50 bg-slate-900/80 px-6 md:px-8 py-5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg transition font-medium shadow-lg"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemInfo;
