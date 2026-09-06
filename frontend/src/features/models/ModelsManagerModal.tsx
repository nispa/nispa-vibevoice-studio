import React from 'react';
import {
    Layers,
    Loader2,
    HardDrive,
    Activity,
    RefreshCw,
    AlertTriangle,
    X
} from 'lucide-react';
import { Modal, ModalHeader, ModalFooter } from '../../components/ui/modal';
import { useModelsManager } from './hooks/useModelsManager';
import {
    ActiveDownloadBanner,
    ModelsFilterBar,
    ModelsListView,
    SystemHealthView
} from './components';

export interface ModelsManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetModelId?: string;
}

/**
 * Models & Engines Manager modal dialog.
 * Composed of reusable modal primitives, a custom hook for state/SSE, and modular views.
 */
export const ModelsManagerModal: React.FC<ModelsManagerModalProps> = ({
    isOpen,
    onClose,
    targetModelId
}) => {
    const {
        activeTab,
        setActiveTab,
        engineFilter,
        setEngineFilter,
        searchQuery,
        setSearchQuery,
        models,
        filteredModels,
        health,
        isLoading,
        errorMsg,
        setErrorMsg,
        downloadState,
        isDownloading,
        loadData,
        handleDownload,
        handleCancelDownload,
        handleDelete
    } = useModelsManager(isOpen);

    if (!isOpen) return null;

    const installedCount = models.filter((m) => m.installed).length;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="5xl"
            className="h-[88vh]"
        >
            {/* Modal Header with Title & Action Controls */}
            <ModalHeader
                icon={<Layers size={24} />}
                title={
                    <div className="flex items-center gap-3">
                        <span>Models & Engines Manager</span>
                        {isDownloading && (
                            <span className="text-xs px-2.5 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full font-mono animate-pulse flex items-center gap-1.5">
                                <Loader2 size={12} className="animate-spin" />
                                Downloading Active
                            </span>
                        )}
                    </div>
                }
                description="Download, verify, and manage offline speech synthesis and translation models."
                onClose={onClose}
            >
                {/* Tab Switcher */}
                <div className="bg-slate-800/80 p-1 rounded-lg flex gap-1 border border-slate-700/60">
                    <button
                        onClick={() => setActiveTab('models')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'models'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                    >
                        <HardDrive size={14} />
                        Models ({installedCount}/{models.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('health')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'health'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                    >
                        <Activity size={14} />
                        System Health
                    </button>
                </div>

                {/* Refresh button */}
                <button
                    onClick={loadData}
                    disabled={isLoading}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                    title="Refresh data"
                >
                    <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </ModalHeader>

            {/* Error Banner */}
            {errorMsg && (
                <div className="px-6 py-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                    <button
                        onClick={() => setErrorMsg(null)}
                        className="text-rose-400 hover:text-white cursor-pointer"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Active Download Progress Card */}
            {isDownloading && downloadState && (
                <ActiveDownloadBanner
                    downloadState={downloadState}
                    onCancel={handleCancelDownload}
                />
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeTab === 'models' ? (
                    <>
                        <ModelsFilterBar
                            engineFilter={engineFilter}
                            onEngineFilterChange={setEngineFilter}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                        />

                        <ModelsListView
                            models={filteredModels}
                            storage={health?.storage}
                            targetModelId={targetModelId}
                            isDownloading={isDownloading}
                            downloadingModelId={downloadState?.model_id}
                            onDownload={handleDownload}
                            onCancelDownload={handleCancelDownload}
                            onDelete={handleDelete}
                        />
                    </>
                ) : (
                    <SystemHealthView health={health} />
                )}
            </div>

            {/* Reusable Modal Footer */}
            <ModalFooter
                note={
                    <span>
                        Models are strictly stored in local directories under{' '}
                        <span className="font-mono text-slate-400">data/model/</span>.
                    </span>
                }
                onClose={onClose}
                closeLabel="Close"
            />
        </Modal>
    );
};
