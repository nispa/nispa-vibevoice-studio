import React from 'react';

interface EngineCategory {
    id: string;
    label: string;
}

const ENGINE_CATEGORIES: EngineCategory[] = [
    { id: 'all', label: 'All Engines' },
    { id: 'qwen', label: 'Qwen3-TTS' },
    { id: 'vibevoice', label: 'VibeVoice' },
    { id: 'omnivoice', label: 'OmniVoice' },
    { id: 'higgs', label: 'Higgs Audio v3' },
    { id: 'translation', label: 'Translation (NLLB)' }
];

interface ModelsFilterBarProps {
    engineFilter: string;
    onEngineFilterChange: (engine: string) => void;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
}

/**
 * Filter bar with engine pill buttons and search input.
 */
export const ModelsFilterBar: React.FC<ModelsFilterBarProps> = ({
    engineFilter,
    onEngineFilterChange,
    searchQuery,
    onSearchQueryChange
}) => {
    return (
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Engine category chips */}
            <div className="flex flex-wrap gap-1.5">
                {ENGINE_CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => onEngineFilterChange(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            engineFilter === cat.id
                                ? 'bg-indigo-600 text-white shadow'
                                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-700/50'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Search input */}
            <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="px-3.5 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition w-full md:w-60"
            />
        </div>
    );
};
