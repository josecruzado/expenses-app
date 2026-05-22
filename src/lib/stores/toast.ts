import { writable } from 'svelte/store';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastEntry {
    id: number;
    message: string;
    variant: ToastVariant;
}

const toasts = writable<ToastEntry[]>([]);

let counter = 0;

function push(message: string, variant: ToastVariant = 'info', durationMs = 3000) {
    const id = ++counter;
    toasts.update((list) => [...list, { id, message, variant }]);
    if (durationMs > 0) {
        setTimeout(() => dismiss(id), durationMs);
    }
}

function dismiss(id: number) {
    toasts.update((list) => list.filter((t) => t.id !== id));
}

export const toastStore = {
    subscribe: toasts.subscribe,
    dismiss,
    success: (msg: string, durationMs?: number) => push(msg, 'success', durationMs),
    error: (msg: string, durationMs?: number) => push(msg, 'error', durationMs),
    info: (msg: string, durationMs?: number) => push(msg, 'info', durationMs)
};
