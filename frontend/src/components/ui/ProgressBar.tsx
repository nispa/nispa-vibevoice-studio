import React from 'react';

interface ProgressBarProps {
    progress: number;
    label?: string;
    showPercent?: boolean;
    className?: string;
    containerClassName?: string;
    barClassName?: string;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * A reusable progress bar component with consistent styling.
 * 
 * @param {ProgressBarProps} props - Component props.
 * @returns {JSX.Element} The rendered progress bar.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    label,
    showPercent = true,
    className = "",
    containerClassName = "",
    barClassName = "",
    size = 'md'
}) => {
    const safeProgress = Math.min(100, Math.max(0, progress));
    
    const sizeClasses = {
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-2.5'
    };

    return (
        <div className={`w-full ${className}`}>
            {(label || showPercent) && (
                <div className="flex justify-between text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">
                    <span>{label}</span>
                    {showPercent && <span className="text-indigo-400 font-mono">{Math.round(safeProgress)}%</span>}
                </div>
            )}
            <div className={`w-full bg-slate-700/50 rounded-full overflow-hidden border border-slate-600/30 ${sizeClasses[size]} ${containerClassName}`}>
                <div 
                    className={`h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(168,85,247,0.4)] ${barClassName}`}
                    style={{ width: `${safeProgress}%` }}
                />
            </div>
        </div>
    );
};
