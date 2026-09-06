import React from 'react';
import { HardDrive } from 'lucide-react';
import type { ManagedModel, SystemHealth } from '../../../services/modelsApi';
import { ModelCard } from './ModelCard';

interface ModelsListViewProps {
    models: ManagedModel[];
    storage?: SystemHealth['storage'];
    targetModelId?: string;
    isDownloading: boolean;
    downloadingModelId?: string;
    onDownload: (modelId: string) => void;
    onCancelDownload: () => void;
    onDelete: (model: ManagedModel) => void;
}

/**
 * Renders the storage overview bar and responsive grid of model cards.
 */
export const ModelsListView: React.FC<ModelsListViewProps> = ({
    models,
    storage,
    targetModelId,
    isDownloading,
    downloadingModelId,
    onDownload,
    onCancelDownload,
    onDelete
}) => {
    return (
        <div className="space-y-4">
            {/* Storage Quick Summary */}
            {storage && (
                <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <HardDrive size={16} className="text-indigo-400" />
                        <span>
                            Model Storage Directory: <span className="font-mono text-slate-300">data/model/</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span>
                            Free Space: <strong className="text-emerald-400">{storage.free_gb} GB</strong>
                        </span>
                        <span>
                            Total: <strong className="text-slate-300">{storage.total_gb} GB</strong>
                        </span>
                    </div>
                </div>
            )}

            {/* Model Grid */}
            {models.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm border border-slate-800/50 rounded-xl">
                    No models found matching the selected filters.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {models.map((m) => (
                        <ModelCard
                            key={m.id}
                            model={m}
                            isTargeted={targetModelId === m.id}
                            isDownloadingOverall={isDownloading}
                            isThisModelDownloading={isDownloading && downloadingModelId === m.id}
                            onDownload={onDownload}
                            onCancelDownload={onCancelDownload}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
