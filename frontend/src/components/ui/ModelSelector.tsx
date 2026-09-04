import { Settings } from 'lucide-react';
import type { Model } from '../../context/GlobalContext';

interface ModelSelectorProps {
    models: Model[];
    selectedModel: string;
    onModelSelect: (model: string) => void;
}

export default function ModelSelector({ models, selectedModel, onModelSelect }: ModelSelectorProps) {
    if (models.length === 0) {
        return null;
    }

    const currentModel = models.find(m => m.id === selectedModel);

    return (
        <div className="bg-slate-800/40 rounded-lg p-5 border border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400 h-12 w-12 flex items-center justify-center">
                    <Settings size={22} />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-200">TTS Model</h4>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            Local / Offline
                        </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                        Select the local model for synthesis.
                        {currentModel?.requires_transcript && (
                            <span className="block text-xs text-amber-400/90 mt-0.5">
                                • Requires reference audio with verified transcript (.wav + .txt)
                            </span>
                        )}
                    </p>
                </div>
            </div>
            <div className="flex-shrink-0 w-full md:w-auto">
                <select
                    value={selectedModel}
                    onChange={(e) => onModelSelect(e.target.value)}
                    className="input-style w-full md:w-56 appearance-none bg-slate-700/50 cursor-pointer"
                >
                    {models.map(m => (
                        <option key={m.id} value={m.id}>
                            {m.name}{m.installed === false ? ' (Not installed)' : ''}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
