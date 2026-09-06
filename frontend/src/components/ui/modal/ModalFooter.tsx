import React from 'react';

export interface ModalFooterProps {
    note?: React.ReactNode;
    children?: React.ReactNode;
    onClose?: () => void;
    closeLabel?: string;
    className?: string;
}

/**
 * Reusable modal footer component.
 * Displays informative hints/notes on the left, and action buttons or custom elements on the right.
 */
export const ModalFooter: React.FC<ModalFooterProps> = ({
    note,
    children,
    onClose,
    closeLabel = 'Close',
    className = '',
}) => {
    return (
        <div className={`p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 shrink-0 ${className}`}>
            <div className="flex items-center gap-2">
                {note}
            </div>
            <div className="flex items-center gap-3">
                {children}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-lg transition font-medium text-xs"
                    >
                        {closeLabel}
                    </button>
                )}
            </div>
        </div>
    );
};
