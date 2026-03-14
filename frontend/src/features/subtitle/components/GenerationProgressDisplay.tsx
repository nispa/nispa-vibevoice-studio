import React from 'react';
import { Loader2, Timer, Hash } from 'lucide-react';

interface GenerationProgressDisplayProps {
    current: number;
    total: number;
    eta: string;
    isProcessing: boolean;
    variant?: 'compact' | 'full';
}

/**
 * A reusable component to display generation progress, 
 * including segment counters and estimated time remaining (ETA).
 */
export const GenerationProgressDisplay: React.FC<GenerationProgressDisplayProps> = ({
    current,
    total,
    eta,
    isProcessing,
    variant = 'compact'
}) => {
    if (!isProcessing && current === 0) return null;

    const remaining = total - current;
    const isCompleted = current === total && total > 0;

    if (variant === 'compact') {
        return (
            <div className="flex flex-col items-end gap-1 animate-fade-in">
                <div className="flex items-center gap-2 text-indigo-400">
                    {isProcessing && !isCompleted ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                        {isCompleted ? 'Synthesis Completed' : 'Synthesis in progress'}
                    </span>
                </div>
                {total > 0 && !isCompleted && (
                    <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono uppercase tracking-tighter bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50">
                        <span className="flex items-center gap-1">
                            <Hash size={10} className="text-slate-600" /> {current}/{total}
                        </span>
                        <span className="w-px h-2 bg-slate-700" />
                        <span className="flex items-center gap-1 text-indigo-400/80">
                            <Timer size={10} /> {eta} rem
                        </span>
                    </div>
                )}
            </div>
        );
    }

    // Full variant for Modals/Headers
    return (
        <div className="flex flex-col gap-2 w-full animate-fade-in">
            <div className="flex justify-between items-end px-1">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Hash size={12} /> Segment {current} of {total}
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase font-medium tracking-tight">
                        {remaining} segments remaining
                    </span>
                </div>
                
                {isProcessing && !isCompleted && (
                    <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] font-mono text-slate-300 flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 shadow-sm">
                            <Timer size={12} className="text-indigo-400" /> {eta}
                        </span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-tighter">Estimated Time</span>
                    </div>
                )}
            </div>
        </div>
    );
};
