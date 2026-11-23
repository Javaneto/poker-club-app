import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  toasts: ToastMessage[];
  show: (message: string, tone?: ToastTone) => number;
  dismiss: (id: number) => void;
}

const AUTO_DISMISS_MS = 5000;
let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, tone = 'info') => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, tone, message }] }));
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

/** Atalhos para exibir mensagens fora de componentes (ex.: no onError do TanStack Query). */
export const toast = {
  info: (message: string) => useToastStore.getState().show(message, 'info'),
  success: (message: string) => useToastStore.getState().show(message, 'success'),
  error: (message: string) => useToastStore.getState().show(message, 'error'),
};
