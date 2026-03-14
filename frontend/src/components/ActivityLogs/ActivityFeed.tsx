import React from 'react';
import { Loader2 } from 'lucide-react';

interface ActivityFeedProps {
    logs: string[];
    isProcessing: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ logs, isProcessing }) => {
    return (
        <div className="flex flex-col bg-slate-950/20">
            {/* Recent History (Mini logs) */}
            <div className="p-4 overflow-auto max-h-40 md:h-48 font-mono text-[10px] text-slate-500">
                <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 border-b border-slate-800 pb-1 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span>System Activity Logs</span>
                        {isProcessing && <Loader2 size={10} className="animate-spin text-indigo-500" />}
                    </div>
                    <span>Showing last 10</span>
                </h4>
                <div className="space-y-1">
                    {logs.length === 0 ? (
                        <div className="italic opacity-40">Awaiting system signals...</div>
                    ) : (
                        logs.slice(-10).map((log, i) => (
                            <div key={i} className={`truncate transition-opacity ${i === logs.slice(-10).length - 1 ? 'opacity-100 text-slate-300 font-bold' : 'opacity-50'}`}>
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
