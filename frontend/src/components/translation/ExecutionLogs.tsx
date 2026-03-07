import React, { useEffect, useRef } from 'react';

interface ExecutionLogsProps {
    logs: string[];
}

export const ExecutionLogs: React.FC<ExecutionLogsProps> = ({ logs }) => {
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [logs]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/80 min-h-[200px] md:min-h-0">
            <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700/30 text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                Execution Logs
            </div>
            <div className="flex-1 p-4 font-mono text-xs shadow-inner relative overflow-y-auto">
                <div className="space-y-1.5 whitespace-pre-wrap break-words">
                    {logs.length === 0 ? (
                        <div className="text-slate-500 italic flex items-center justify-center h-full">
                            Initializing API connection...
                        </div>
                    ) : (
                        logs.map((log, idx) => (
                            <div
                                key={idx}
                                className="text-slate-400 border-l-2 border-slate-700/50 pl-2 hover:bg-slate-800/30 hover:border-indigo-500/50 transition-colors"
                            >
                                {log}
                            </div>
                        ))
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};
