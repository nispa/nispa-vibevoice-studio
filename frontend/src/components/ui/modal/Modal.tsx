import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
    className?: string;
    closeOnEscape?: boolean;
    closeOnBackdropClick?: boolean;
}

const MAX_WIDTH_MAP: Record<NonNullable<ModalProps['maxWidth']>, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
};

/**
 * Common, accessible Modal backdrop and container component.
 * Mounts directly into document.body using React Portal to prevent CSS containing block
 * traps (such as backdrop-filter or transform on ancestor containers).
 * Provides consistent styling, backdrop blur, fade-in animation, and Escape key handling.
 */
export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    children,
    maxWidth = '5xl',
    className = '',
    closeOnEscape = true,
    closeOnBackdropClick = false,
}) => {
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEscape, onClose]);

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in"
            onClick={closeOnBackdropClick ? onClose : undefined}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`bg-slate-900/95 border border-slate-700/80 rounded-2xl w-full ${MAX_WIDTH_MAP[maxWidth]} flex flex-col shadow-2xl overflow-hidden ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );

    return typeof document !== 'undefined'
        ? createPortal(modalContent, document.body)
        : modalContent;
};
