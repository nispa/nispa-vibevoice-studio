import { useEffect, useState } from 'react';
import { Cpu, Wrench, Sliders, AlertCircle } from 'lucide-react';
import { useSystemInfo } from '../hooks/useSystemInfo';
import { SystemLog } from './system/SystemLog';
import { MaintenanceTab } from './system/MaintenanceTab';
import { GenerationTab } from './system/GenerationTab';

type Tab = 'system' | 'generation' | 'maintenance';

interface SystemInfoProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Modal with two tabs: System Information and Maintenance (DB vacuum, orphan cleanup).
 */
export const SystemInfo = ({ isOpen, onClose }: SystemInfoProps) => {
    const { systemInfo, isLoading, error, fetchSystemInfo } = useSystemInfo();
    const [activeTab, setActiveTab] = useState<Tab>('system');

    useEffect(() => {
        if (isOpen) {
            fetchSystemInfo();
            setActiveTab('system');
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
                            Settings &amp; Maintenance
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-4">
                        <TabButton active={activeTab === 'system'} onClick={() => setActiveTab('system')}>
                            <Cpu size={15} />
                            System Info
                        </TabButton>
                        <TabButton active={activeTab === 'generation'} onClick={() => setActiveTab('generation')}>
                            <Sliders size={15} />
                            Generation
                        </TabButton>
                        <TabButton active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')}>
                            <Wrench size={15} />
                            Maintenance
                        </TabButton>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 md:p-8 bg-slate-950/30 text-slate-200 shadow-inner">
                    {activeTab === 'system' && (
                        <>
                            {isLoading && !systemInfo ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto" />
                                    <p className="text-slate-400 mt-4">Loading…</p>
                                </div>
                            ) : error ? (
                                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                                    <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h3 className="text-red-300 font-semibold">Error</h3>
                                        <p className="text-red-400/80 text-sm">{error}</p>
                                    </div>
                                </div>
                            ) : systemInfo ? (
                                <SystemLog systemInfo={systemInfo} onRefresh={fetchSystemInfo} isLoading={isLoading} />
                            ) : null}
                        </>
                    )}

                    {activeTab === 'generation' && <GenerationTab />}
                    {activeTab === 'maintenance' && <MaintenanceTab />}
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

const TabButton = ({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            active
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
        }`}
    >
        {children}
    </button>
);

export default SystemInfo;
