import React, { useEffect, useRef } from 'react';
import { Terminal, CheckCircle2, Cpu, Globe, AlertCircle } from 'lucide-react';

import { ProgressBar } from '../ui/ProgressBar';

interface TranslationFeedProps {
    progress: number;
    logs: string[];
    isTranslating: boolean;
}

export const TranslationFeed: React.FC<TranslationFeedProps> = ({
    progress,
    logs,
    isTranslating
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of logs
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden min-h-[300px] md:min-h-0 bg-slate-950/40 border border-slate-800 rounded-xl">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-indigo-400" />
                    <span>Translation Activity Log</span>
                </div>
                {isTranslating && (
                    <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                        <Cpu size={12} />
                        <span>NLLB Engine Active</span>
                    </div>
                )}
            </div>

            {/* Log Content */}
            <div 
                ref={scrollRef}
                className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-800"
            >
                {logs.length === 0 && !isTranslating && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2 opacity-50">
                        <Globe size={32} />
                        <p>No activity recorded. Start translation to see logs.</p>
                    </div>
                )}

                {logs.map((log, i) => {
                    const isError = log.includes('✗') || log.toLowerCase().includes('error');
                    const isSuccess = log.includes('✓') || log.toLowerCase().includes('success');
                    
                    return (
                        <div key={i} className={`flex items-start gap-3 py-1 border-b border-slate-900/50 last:border-0 ${isError ? 'text-rose-400' : isSuccess ? 'text-emerald-400' : 'text-slate-400'}`}>
                            <span className="text-[10px] text-slate-600 shrink-0 mt-0.5">
                                {log.match(/\[(.*?)\]/)?.[1] || '--:--:--'}
                            </span>
                            <div className="flex-1 leading-relaxed">
                                {log.replace(/\[.*?\]\s*/, '')}
                            </div>
                            {isSuccess && <CheckCircle2 size={12} className="shrink-0 mt-0.5" />}
                            {isError && <AlertCircle size={12} className="shrink-0 mt-0.5" />}
                        </div>
                    );
                })}

                {isTranslating && (
                    <div className="flex items-center gap-3 py-1 text-indigo-400 animate-pulse">
                        <span className="text-[10px] text-slate-600 shrink-0">--:--:--</span>
                        <div className="flex-1">Processing batch request...</div>
                    </div>
                )}
            </div>

            {/* Bottom Progress Bar (Slim) */}
            {progress > 0 && (
                <ProgressBar 
                    progress={progress}
                    showPercent={false}
                    size="sm"
                    containerClassName="rounded-none border-none bg-slate-900"
                    barClassName={progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}
                />
            )}
        </div>
    );
};
