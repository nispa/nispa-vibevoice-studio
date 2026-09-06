import React, { useState, useMemo } from 'react';
import {
    Sparkles,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    Check,
    Layers
} from 'lucide-react';
import {
    HIGGS_TAG_CATEGORIES,
    TOTAL_HIGGS_TAGS_COUNT
} from './higgsTagsData';

interface HiggsTagPaletteProps {
    onInsertTag: (tag: string) => void;
    onOpenGuide: () => void;
}

export const HiggsTagPalette: React.FC<HiggsTagPaletteProps> = ({
    onInsertTag,
    onOpenGuide,
}) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<string>('all');
    const [recentlyInserted, setRecentlyInserted] = useState<string | null>(null);

    const handleTagClick = (tag: string) => {
        onInsertTag(tag);
        setRecentlyInserted(tag);
        setTimeout(() => setRecentlyInserted(null), 1200);
    };

    // Filter categories based on active tab
    const displayedCategories = useMemo(() => {
        if (activeTab === 'all') return HIGGS_TAG_CATEGORIES;
        return HIGGS_TAG_CATEGORIES.filter(c => c.id === activeTab);
    }, [activeTab]);

    const totalVisibleTags = useMemo(() => {
        return displayedCategories.reduce((acc, cat) => acc + cat.tags.length, 0);
    }, [displayedCategories]);

    return (
        <div className="mb-3 space-y-2">
            {/* Header Toggle Bar */}
            <div className="flex items-center justify-between gap-2 p-2 px-3 rounded-lg bg-slate-900/60 border border-slate-700/60">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition py-1 rounded-md"
                    title={isOpen ? "Comprimi la palette dei tag" : "Espandi la palette dei tag"}
                >
                    <Sparkles size={14} className="text-indigo-400" />
                    <span>Tag Palette: Emozioni & Stili</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-normal border border-indigo-500/30">
                        {TOTAL_HIGGS_TAGS_COUNT} tag
                    </span>
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <button
                    type="button"
                    onClick={onOpenGuide}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/50 transition font-medium"
                    title="Guida sintassi e spiegazione dettagliata dei tag"
                >
                    <HelpCircle size={13} className="text-indigo-400" />
                    <span>Guida Sintassi & Emozioni</span>
                </button>
            </div>

            {/* Collapsible Content */}
            {isOpen && (
                <div className="p-3.5 rounded-lg bg-slate-900/95 border border-indigo-500/30 space-y-3 text-xs animate-fade-in shadow-xl">
                    {/* Top bar: Category tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-thin">
                        <button
                            type="button"
                            onClick={() => setActiveTab('all')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'all'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                            }`}
                        >
                            <Layers size={12} />
                            <span>Tutti ({TOTAL_HIGGS_TAGS_COUNT})</span>
                        </button>

                        {HIGGS_TAG_CATEGORIES.map(cat => {
                            const Icon = cat.icon;
                            const isSelected = activeTab === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setActiveTab(cat.id)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                                    }`}
                                >
                                    <Icon size={12} className={isSelected ? 'text-white' : cat.color} />
                                    <span>{cat.shortTitle}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Tag listings */}
                    <div className="space-y-3">
                        {displayedCategories.map(cat => {
                            const Icon = cat.icon;
                            const isAllView = activeTab === 'all';
                            return (
                                <div key={cat.id} className="space-y-1.5">
                                    {isAllView && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                            <Icon size={12} className={cat.color} />
                                            <span>{cat.title}</span>
                                            <span className="text-[10px] text-slate-500 font-normal">
                                                ({cat.tags.length})
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {cat.tags.map(t => {
                                            const isJustInserted = recentlyInserted === t.tag;
                                            return (
                                                <button
                                                    key={t.tag}
                                                    type="button"
                                                    onClick={() => handleTagClick(t.tag)}
                                                    className={`px-2 py-1 rounded text-xs transition-all border font-medium flex items-center gap-1 ${
                                                        isJustInserted
                                                            ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 scale-105'
                                                            : `${cat.badgeStyle.bg} ${cat.badgeStyle.text} ${cat.badgeStyle.border} ${cat.badgeStyle.hoverBg}`
                                                    }`}
                                                    title={`${t.label}\n${t.description}\nCodice: ${t.tag}\n(Fai clic per inserire al cursore)`}
                                                >
                                                    <span>{t.name}</span>
                                                    {isJustInserted && <Check size={11} className="text-emerald-400" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Tip */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Fai clic su un tag per inserirlo istantaneamente nella posizione del cursore.</span>
                        <span>{totalVisibleTags} tag visibili</span>
                    </div>
                </div>
            )}
        </div>
    );
};
