import React, { useState, useMemo } from 'react';
import {
    Sparkles,
    Copy,
    Check,
    Layers,
    Info,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { Modal, ModalHeader, ModalFooter } from '../ui/modal';
import {
    HIGGS_TAG_CATEGORIES,
    TOTAL_HIGGS_TAGS_COUNT,
    type TagItem
} from './higgsTagsData';

export interface HiggsEmotionGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInsertTag?: (tag: string) => void;
}

export const HiggsEmotionGuideModal: React.FC<HiggsEmotionGuideModalProps> = ({
    isOpen,
    onClose,
    onInsertTag
}) => {
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [copiedTag, setCopiedTag] = useState<string | null>(null);

    const handleCopy = (tag: string) => {
        navigator.clipboard.writeText(tag).then(() => {
            setCopiedTag(tag);
            setTimeout(() => setCopiedTag(null), 1500);
        });
    };

    const handleInsert = (tag: string) => {
        if (onInsertTag) {
            onInsertTag(tag);
            onClose();
        }
    };

    // Filter categories based on activeCategory
    const displayedCategories = useMemo(() => {
        if (activeCategory === 'all') return HIGGS_TAG_CATEGORIES;
        return HIGGS_TAG_CATEGORIES.filter(c => c.id === activeCategory);
    }, [activeCategory]);

    const matchingCount = useMemo(() => {
        return displayedCategories.reduce((acc, cat) => acc + cat.tags.length, 0);
    }, [displayedCategories]);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="5xl"
            className="h-[84vh] flex flex-col overflow-hidden"
        >
            {/* Modal Header */}
            <ModalHeader
                icon={<Sparkles size={22} />}
                title={
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <span>Guida Sintassi & Elementi Vocali</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                            Higgs Audio v3
                        </span>
                    </div>
                }
                description="Token speciali e stili per pilotare la recitazione, l'enfasi e l'espressività."
                onClose={onClose}
            />

            {/* Compact Syntax Rules Banner */}
            <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 text-xs shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-slate-300">
                        <Info size={14} className="text-indigo-400 shrink-0" />
                        <span className="font-semibold text-slate-200">Regola Sintassi:</span>
                        <span>Inserisci sempre il formato atomico</span>
                        <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-[11px] border border-slate-700">
                            &lt;|categoria:valore|&gt;
                        </code>
                        <span className="hidden md:inline text-slate-400">subito prima del testo da modulare.</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] shrink-0">
                        <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 size={12} />
                            <code>&lt;|style:whispering|&gt;</code>
                        </span>
                        <span className="flex items-center gap-1 text-rose-400">
                            <XCircle size={12} />
                            <code>[laughter]</code>
                        </span>
                    </div>
                </div>
            </div>

            {/* Category Filter Toolbar */}
            <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center gap-1.5 flex-wrap shrink-0 overflow-x-hidden">
                <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                        activeCategory === 'all'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                >
                    <Layers size={13} />
                    <span>Tutti ({TOTAL_HIGGS_TAGS_COUNT})</span>
                </button>

                {HIGGS_TAG_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                                isSelected
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                        >
                            <Icon size={13} className={isSelected ? 'text-white' : cat.color} />
                            <span>{cat.shortTitle}</span>
                        </button>
                    );
                })}
            </div>

            {/* Scrollable Tag Content Area (Strictly Y-axis, clean card table) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 custom-scrollbar bg-slate-950/30 min-w-0">
                {displayedCategories.map(cat => {
                    const Icon = cat.icon;
                    return (
                        <div key={cat.id} className="space-y-2">
                            {/* Category Section Header */}
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800/70">
                                <Icon size={14} className={cat.color} />
                                <span>{cat.title}</span>
                                <span className="text-slate-400 font-normal">
                                    ({cat.tags.length})
                                </span>
                            </div>

                            {/* Items list in clean structured rows */}
                            <div className="grid grid-cols-1 gap-2">
                                {cat.tags.map((item: TagItem) => (
                                    <div
                                        key={item.tag}
                                        className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-lg p-3 transition flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0"
                                    >
                                        {/* Tag Code + Description */}
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <code className="bg-indigo-950/60 text-indigo-300 px-2 py-0.5 rounded text-xs font-mono font-semibold border border-indigo-500/30 select-all">
                                                    {item.tag}
                                                </code>
                                                <span className="text-xs font-semibold text-slate-200">
                                                    {item.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed break-words">
                                                {item.description}
                                            </p>
                                            <p className="text-[11px] text-slate-400 italic break-words">
                                                Esempio: <span className="text-slate-300 font-mono not-italic">"{item.example}"</span>
                                            </p>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(item.tag)}
                                                className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
                                                title="Copia tag negli appunti"
                                            >
                                                {copiedTag === item.tag ? (
                                                    <>
                                                        <Check size={12} className="text-emerald-400" />
                                                        <span className="text-emerald-400">Copiato</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={12} />
                                                        <span>Copia</span>
                                                    </>
                                                )}
                                            </button>

                                            {onInsertTag && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleInsert(item.tag)}
                                                    className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                                                    title="Inserisci nel copione al cursore e chiudi"
                                                >
                                                    <Sparkles size={12} />
                                                    <span>Inserisci</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal Footer */}
            <ModalFooter
                note={
                    <span className="text-slate-400">
                        Visualizzati <strong className="text-slate-300">{matchingCount}</strong> di {TOTAL_HIGGS_TAGS_COUNT} elementi. Posiziona i tag immediatamente prima della frase da modulare.
                    </span>
                }
                onClose={onClose}
                closeLabel="Chiudi"
            />
        </Modal>
    );
};

export default HiggsEmotionGuideModal;
