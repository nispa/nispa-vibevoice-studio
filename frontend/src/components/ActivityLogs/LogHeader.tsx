import React from 'react';
import { X, Copy, Trash2 } from 'lucide-react';

import { ProgressBar } from '../ui/ProgressBar';
import { GenerationProgressDisplay } from '../../features/subtitle/components/GenerationProgressDisplay';

interface LogHeaderProps {
    title: string;
    progress: number;
    handleCopyLogs: () => void;
    onClear?: () => void;
    onClose: () => void;
    totalItems?: number;
    currentItems?: number;
    estimatedTime?: string;
}

export const LogHeader: React.FC<LogHeaderProps> = ({
    title,
    progress,
    handleCopyLogs,
    onClear,
    onClose,
    totalItems = 0,
    currentItems = 0,
    estimatedTime = '--:--'
}) => {
    return (
        <div className="border-b border-slate-700/50 bg-slate-800/30 p-6 flex justify-between items-center relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[64px] -z-10" />
            <div className="relative z-10 flex-1">
                <h2 className="text-2xl font-bold text-slate-100">
                    {title}
                </h2>
                
                {/* Progress Bar & Details */}
                <div className="mt-4 max-w-md space-y-2">
                    <GenerationProgressDisplay 
                        current={currentItems}
                        total={totalItems}
                        eta={estimatedTime}
                        isProcessing={progress > 0 && progress < 100}
                        variant="full"
                    />
                    <ProgressBar 
                        progress={progress} 
                        label={progress === 100 ? 'Completed' : ''}
                    />
                </div>
            </div>
            <div className="flex items-center gap-2 self-start pt-1">
                <button
                    onClick={handleCopyLogs}
                    title="Copy all logs to clipboard"
                    className="relative z-10 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                >
                    <Copy size={20} />
                </button>
                {onClear && (
                    <button
                        onClick={onClear}
                        title="Clear logs"
                        className="relative z-10 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                    >
                        <Trash2 size={20} />
                    </button>
                )}
                <button
                    onClick={onClose}
                    className="relative z-10 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition"
                >
                    <X size={24} />
                </button>
            </div>
        </div>
    );
};
