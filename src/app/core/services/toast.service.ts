import { Injectable, signal } from '@angular/core';
import { uid } from '../utils/id.util';

export type ToastKind = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  action?: { label: string; run: () => void };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  show(toast: Omit<Toast, 'id'>, durationMs = 4500): void {
    const entry: Toast = { ...toast, id: uid('toast') };
    this.toasts.update((list) => [...list, entry].slice(-4));
    setTimeout(() => this.dismiss(entry.id), durationMs);
  }

  success(title: string, message?: string): void {
    this.show({ kind: 'success', title, message });
  }

  info(title: string, message?: string): void {
    this.show({ kind: 'info', title, message });
  }

  warning(title: string, message?: string): void {
    this.show({ kind: 'warning', title, message });
  }

  error(title: string, message?: string): void {
    this.show({ kind: 'error', title, message });
  }

  dismiss(id: string): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
