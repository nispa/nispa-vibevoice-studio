import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, RotateCcw, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { systemApi } from '../../services/systemApi';
import type { VramInfo, ModelBatchInfo, MultiGpuInfo } from '../../services/systemApi';

/**
 * Generation settings tab: GPU device toggles + per-model batch size configuration.
 */
export const GenerationTab = () => {
    const [vramInfo, setVramInfo] = useState<VramInfo | null>(null);
    const [multiGpu, setMultiGpu] = useState<MultiGpuInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [savingGpu, setSavingGpu] = useState(false);
    const [drafts, setDrafts] = useState<Record<string, string>>({});

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [vram, mgpu] = await Promise.all([
                systemApi.getVramInfo(),
                systemApi.getMultiGpu(),
            ]);
            setVramInfo(vram);
            setMultiGpu(mgpu);
            const init: Record<string, string> = {};
            for (const m of vram.models) {
                init[m.id] = m.user_batch != null ? String(m.user_batch) : '';
            }
            setDrafts(init);
        } catch {
            setError('Failed to load settings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDeviceToggle = async (index: number, currentlyActive: boolean) => {
        if (!multiGpu) return;
        const disabled = currentlyActive
            ? [...multiGpu.disabled_devices, index]
            : multiGpu.disabled_devices.filter(i => i !== index);
        setSavingGpu(true);
        try {
            await systemApi.setMultiGpu(disabled);
            setMultiGpu(g => g ? { ...g, disabled_devices: disabled } : g);
        } catch {
            setError('Failed to save GPU setting');
        } finally {
            setSavingGpu(false);
        }
    };

    const handleSave = async (model: ModelBatchInfo) => {
        const raw = drafts[model.id];
        const value = raw === '' ? null : parseInt(raw, 10);
        if (raw !== '' && (isNaN(value!) || value! < 1 || value! > 32)) {
            setError('Batch size must be between 1 and 32 (or empty for auto)');
            return;
        }
        setSaving(model.id);
        setError(null);
        try {
            await systemApi.setBatchOverride(model.id, value);
            setSaved(model.id);
            setTimeout(() => setSaved(null), 2000);
            await load();
        } catch {
            setError(`Failed to save override for ${model.id}`);
        } finally {
            setSaving(null);
        }
    };

    const handleReset = async (model: ModelBatchInfo) => {
        setDrafts(d => ({ ...d, [model.id]: '' }));
        setSaving(model.id);
        setError(null);
        try {
            await systemApi.setBatchOverride(model.id, null);
            setSaved(model.id);
            setTimeout(() => setSaved(null), 2000);
            await load();
        } catch {
            setError(`Failed to reset override for ${model.id}`);
        } finally {
            setSaving(null);
        }
    };

    const activeDevices = multiGpu
        ? multiGpu.devices.filter(d => !multiGpu.disabled_devices.includes(d.index))
        : [];

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-2.5 flex items-center gap-2 text-red-300 text-xs">
                    <AlertCircle size={14} className="shrink-0" />
                    {error}
                </div>
            )}

            {/* GPU Devices */}
            <section className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold">
                        <Zap size={15} className="text-violet-400" />
                        GPU Devices
                        {multiGpu && multiGpu.gpu_count >= 2 && activeDevices.length >= 2 && (
                            <span className="text-xs font-normal text-violet-400 bg-violet-500/10 border border-violet-500/30 rounded px-1.5 py-0.5">
                                multi-GPU
                            </span>
                        )}
                    </div>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-400 rounded text-xs transition"
                    >
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {loading && !multiGpu ? (
                    <div className="text-slate-500 text-xs animate-pulse">Loading…</div>
                ) : multiGpu && multiGpu.devices.length > 0 ? (
                    <div className="space-y-2">
                        {multiGpu.devices.map(dev => {
                            const isActive = !multiGpu.disabled_devices.includes(dev.index);
                            return (
                                <div
                                    key={dev.index}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition ${
                                        isActive
                                            ? 'bg-slate-900/60 border-slate-700/40'
                                            : 'bg-slate-900/30 border-slate-700/20 opacity-50'
                                    }`}
                                >
                                    <button
                                        onClick={() => handleDeviceToggle(dev.index, isActive)}
                                        disabled={savingGpu}
                                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                                            isActive ? 'bg-violet-600' : 'bg-slate-600'
                                        }`}
                                    >
                                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                            isActive ? 'translate-x-5' : 'translate-x-1'
                                        }`} />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-slate-200 text-xs font-medium">{dev.device_str}</span>
                                        <span className="text-slate-400 text-xs ml-1.5 truncate">{dev.name}</span>
                                    </div>
                                    <div className="text-xs text-right shrink-0">
                                        <span className="text-amber-400 font-semibold">{dev.free_gb} GB</span>
                                        <span className="text-slate-600 mx-1">/</span>
                                        <span className="text-slate-400">{dev.total_gb} GB</span>
                                    </div>
                                </div>
                            );
                        })}
                        {multiGpu.gpu_count >= 2 && (
                            <p className="text-slate-600 text-xs pt-1">
                                {activeDevices.length >= 2
                                    ? `Segments split across ${activeDevices.length} GPUs proportional to free VRAM.`
                                    : 'Enable multiple GPUs to activate parallel processing.'}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="text-slate-500 text-xs">No CUDA devices detected.</div>
                )}
            </section>

            {/* Per-model batch config */}
            <section className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-3">
                <div className="text-slate-200 text-sm font-semibold">Batch Size per Model</div>
                <p className="text-slate-500 text-xs">
                    Auto-calculated from free VRAM (60% headroom). Set a custom value to override.
                </p>

                {!vramInfo || vramInfo.models.length === 0 ? (
                    <div className="text-slate-500 text-xs">No models installed.</div>
                ) : (
                    <div className="space-y-2">
                        {vramInfo.models.map(model => (
                            <ModelRow
                                key={model.id}
                                model={model}
                                draft={drafts[model.id] ?? ''}
                                isSaving={saving === model.id}
                                isSaved={saved === model.id}
                                onChange={val => setDrafts(d => ({ ...d, [model.id]: val }))}
                                onSave={() => handleSave(model)}
                                onReset={() => handleReset(model)}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

const ModelRow = ({
    model, draft, isSaving, isSaved, onChange, onSave, onReset,
}: {
    model: ModelBatchInfo;
    draft: string;
    isSaving: boolean;
    isSaved: boolean;
    onChange: (v: string) => void;
    onSave: () => void;
    onReset: () => void;
}) => {
    const hasOverride = model.user_batch != null;
    const draftChanged = draft !== (model.user_batch != null ? String(model.user_batch) : '');

    return (
        <div className="bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2.5 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
                <div className="text-slate-200 text-xs font-medium truncate">{model.id}</div>
                <div className="text-slate-500 text-xs mt-0.5">
                    Auto: <span className="text-indigo-400 font-semibold">{model.recommended_batch}</span>
                    {hasOverride && (
                        <span className="ml-2 text-amber-400">· Override: {model.user_batch}</span>
                    )}
                    <span className="ml-2">
                        · Active: <span className="text-emerald-400 font-semibold">{model.effective_batch}</span>
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min={1}
                    max={32}
                    value={draft}
                    onChange={e => onChange(e.target.value)}
                    placeholder={String(model.recommended_batch)}
                    className="w-16 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-center"
                />

                {draftChanged && (
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 disabled:opacity-50 text-white rounded text-xs font-medium transition"
                    >
                        {isSaving ? <RefreshCw size={11} className="animate-spin" /> : null}
                        Save
                    </button>
                )}

                {isSaved && (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs">
                        <CheckCircle size={12} /> Saved
                    </span>
                )}

                {hasOverride && !draftChanged && (
                    <button
                        onClick={onReset}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-400 rounded text-xs transition"
                        title="Reset to auto"
                    >
                        <RotateCcw size={11} />
                    </button>
                )}
            </div>
        </div>
    );
};
