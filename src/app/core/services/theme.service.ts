import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { persistedSignal } from './storage.service';

export type ThemePreference = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly systemDark = signal(matchMedia('(prefers-color-scheme: dark)').matches);

  /** Dark by default – it is the product's signature look; users can switch in Settings. */
  readonly preference = persistedSignal<ThemePreference>('theme', 'dark');
  readonly resolved = computed<'light' | 'dark'>(() => {
    const pref = this.preference();
    if (pref === 'system') return this.systemDark() ? 'dark' : 'light';
    return pref;
  });

  constructor() {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) =>
      this.systemDark.set(e.matches),
    );
    effect(() => {
      const root = this.document.documentElement;
      root.dataset['theme'] = this.resolved();
      root.style.colorScheme = this.resolved();
    });
  }

  set(pref: ThemePreference): void {
    this.preference.set(pref);
  }

  toggle(): void {
    this.preference.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }
}
