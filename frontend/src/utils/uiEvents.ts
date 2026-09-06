/**
 * Global singleton for UI events (confirm dialogs and toast notifications).
 *
 * This module exposes imperative `showConfirm` and `showToast` functions that
 * can be called from anywhere — including plain hooks that have no access to
 * React context. The UIProvider subscribes to these events and renders the
 * actual React components.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'info';
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastEvent {
    id: number;
    message: string;
    type: ToastType;
    duration: number;
}

// Internal pending confirm request
interface PendingConfirm {
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
}

// ─── Internal state ───────────────────────────────────────────────────────────

let confirmListener: ((pending: PendingConfirm | null) => void) | null = null;
let toastListener: ((toast: ToastEvent) => void) | null = null;
let toastCounter = 0;

// ─── Subscription (used by UIProvider) ───────────────────────────────────────

export function subscribeConfirm(
    listener: (pending: PendingConfirm | null) => void
): () => void {
    confirmListener = listener;
    return () => {
        if (confirmListener === listener) confirmListener = null;
    };
}

export function subscribeToast(listener: (toast: ToastEvent) => void): () => void {
    toastListener = listener;
    return () => {
        if (toastListener === listener) toastListener = null;
    };
}

// ─── Public API (callable from hooks, services, etc.) ────────────────────────

/**
 * Show a confirm dialog. Returns a Promise that resolves to `true` if the user
 * confirms, or `false` if they cancel.
 *
 * Falls back to the native `window.confirm` when no UIProvider is mounted.
 */
export function showConfirm(options: ConfirmOptions): Promise<boolean> {
    if (!confirmListener) {
        // Fallback: no UIProvider mounted yet
        return Promise.resolve(window.confirm(options.message));
    }
    return new Promise<boolean>((resolve) => {
        confirmListener!({ options, resolve });
    });
}

/**
 * Show a toast notification. Fires-and-forgets — no return value.
 *
 * Falls back to `console.log` when no UIProvider is mounted.
 */
export function showToast(message: string, type: ToastType = 'info', duration = 3000): void {
    if (!toastListener) {
        console.log(`[Toast/${type}] ${message}`);
        return;
    }
    toastCounter += 1;
    toastListener({ id: toastCounter, message, type, duration });
}

/**
 * Dispatch an event to open the Models & Engines Manager modal, optionally highlighting a specific model.
 */
export function openModelsManager(modelId?: string): void {
    window.dispatchEvent(new CustomEvent('open-models-manager', { detail: { modelId } }));
}

// Re-export PendingConfirm so UIProvider can type-annotate its state
export type { PendingConfirm };

