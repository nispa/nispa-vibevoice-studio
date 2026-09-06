import React from 'react';
import { X } from 'lucide-react';

export interface ModalHeaderProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    children?: React.ReactNode;
    onClose?: () => void;
    className?: string;
}

/**
 * Reusable modal header with support for an icon slot, title, subtitle/description,
 * custom right-side actions/tabs, and a standard close button.
 */
export const ModalHeader: React.FC<ModalHeaderProps> = ({
    title,
    description,
    icon,
    children,
    onClose,
    className = '',
}) => {
    return (
        <div className={`p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 shrink-0 ${className}`}>
            <div className="flex items-center gap-4">
                {icon && (
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                        {icon}
                    </div>
                )}
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        {title}
                    </h2>
                    {description && (
                        <p className="text-xs text-slate-400 mt-0.5">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {children}

                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        title="Close modal"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>
        </div>
    );
};
