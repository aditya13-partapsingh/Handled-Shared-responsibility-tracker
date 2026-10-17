import { Injectable, WritableSignal, effect, inject, signal } from '@angular/core';

const PREFIX = 'handled.';

/** Thin, fault-tolerant wrapper over localStorage. All app data lives here – there is no backend. */
@Injectable({ providedIn: 'root' })
export class StorageService {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* quota exceeded / private mode – the app keeps working in memory */
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  }

  clearAll(): void {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }
}

/**
 * A writable signal that hydrates from localStorage and writes back on every change.
 * Must be created in an injection context (service field initializers qualify).
 */
export function persistedSignal<T>(key: string, initial: T): WritableSignal<T> {
  const storage = inject(StorageService);
  const state = signal<T>(storage.get<T>(key, initial));
  effect(() => storage.set(key, state()));
  return state;
}
