import { useState, useEffect, useCallback } from 'react';
import { Cpu, RefreshCw, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { systemApi } from '../../services/systemApi';
import type { VramInfo, ModelBatchInfo } from '../../services/systemApi';

/**
 * Generation settings tab: per-model batch size configuration with live VRAM info.
 */
export const GenerationTab = () => {
    const [vramInfo, setVramInfo] = useState<VramInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null); // model id being saved
    const [saved, setSaved] = useState<string | null>(null);
    // local draft overrides: model_id → string (input value)
    const [drafts, setDrafts] = useState<Record<string, string>>({});

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await systemApi.getVramInfo();
            setVramInfo(data);
            // Init drafts from current user_batch
            const init: Record<string, string> = {};
            for (const m of data.models) {
                init[m.id] = m.user_batch != null ? String(m.user_batch) : '';
            }
            setDrafts(init);
        } catch {
            setError('Failed to load VRAM info');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (model: ModelBatchInfo) => {
        const raw = drafts[model.id];
        const value = raw === '' ? null : parseInt(raw, 10);
        if (raw !== '' && (isNaN(value!) || value! < 1 || value! > 32)) {
            setError(`Batch size must be between 1 and 32 (or empty to use recommended)`);
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

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 flex items-center gap-2 text-red-300 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            )}

            {/* VRAM summary */}
            <section className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-200 font-semibold">
                        <Cpu size={18} className="text-violet-400" />
                        GPU / VRAM
                    </div>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 rounded-lg text-xs transition"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {loading && !vramInfo ? (
                    <div className="text-slate-400 text-sm animate-pulse">Loading…</div>
                ) : vramInfo ? (
                    <div className="grid grid-cols-3 gap-3 text-sm">
                        <StatCard
                            label="CUDA"
                            value={vramInfo.cuda_available ? 'Available' : 'Not available'}
                            accent={vramInfo.cuda_available ? 'emerald' : 'red'}
                        />
                        <StatCard
                            label="VRAM total"
                            value={vramInfo.vram_total_gb != null ? `${vramInfo.vram_total_gb} GB` : '—'}
                        />
                        <StatCard
                            label="VRAM free"
                            value={vramInfo.vram_free_gb != null ? `${vramInfo.vram_free_gb} GB` : '—'}
                            accent="amber"
                        />
                    </div>
                ) : null}
            </section>

            {/* Per-model batch config */}
            <section className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5 space-y-4">
                <div className="text-slate-200 font-semibold text-sm">Batch Size per Model</div>
                <p className="text-slate-500 text-xs">
                    The recommended size is calculated automatically from free VRAM (60% headroom + peak multiplier).
                    Set a custom value to override, or leave empty to use the recommended.
                </p>

                {!vramInfo || vramInfo.models.length === 0 ? (
                    <div className="text-slate-500 text-sm">No models installed.</div>
                ) : (
                    <div className="space-y-3">
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
        <div className="bg-slate-900/60 border border-slate-700/30 rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap">
            {/* Model name */}
            <div className="flex-1 min-w-0">
                <div className="text-slate-200 text-sm font-medium truncate">{model.id}</div>
                <div className="text-slate-500 text-xs mt-0.5">
                    Recommended: <span className="text-indigo-400 font-semibold">{model.recommended_batch}</span>
                    {hasOverride && (
                        <span className="ml-2 text-amber-400">
                            · Override active: {model.user_batch}
                        </span>
                    )}
                    {' · '}
                    Effective: <span className="text-emerald-400 font-semibold">{model.effective_batch}</span>
                </div>
            </div>

            {/* Override input */}
            <div className="flex items-center gap-2">
                <div className="relative">
                    <input
                        type="number"
                        min={1}
                        max={32}
                        value={draft}
                        onChange={e => onChange(e.target.value)}
                        placeholder={String(model.recommended_batch)}
                        className="w-20 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-center"
                    />
                </div>

                {draftChanged && (
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
                    >
                        {isSaving ? <RefreshCw size={12} className="animate-spin" /> : null}
                        Save
                    </button>
                )}

                {isSaved && (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs">
                        <CheckCircle size={13} /> Saved
                    </span>
                )}

                {hasOverride && !draftChanged && (
                    <button
                        onClick={onReset}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-400 rounded-lg text-xs transition"
                        title="Reset to recommended"
                    >
                        <RotateCcw size={12} />
                        Reset
                    </button>
                )}
            </div>
        </div>
    );
};

const StatCard = ({
    label, value, accent = 'default',
}: {
    label: string;
    value: string;
    accent?: 'emerald' | 'amber' | 'red' | 'default';
}) => {
    const valueColor = {
        emerald: 'text-emerald-400',
        amber: 'text-amber-400',
        red: 'text-red-400',
        default: 'text-slate-100',
    }[accent];

    return (
        <div className="bg-slate-900/60 border border-slate-700/30 rounded-lg px-4 py-3">
            <div className="text-slate-400 text-xs mb-1">{label}</div>
            <div className={`font-semibold text-sm ${valueColor}`}>{value}</div>
        </div>
    );
};
