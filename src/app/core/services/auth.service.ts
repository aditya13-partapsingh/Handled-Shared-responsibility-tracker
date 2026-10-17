import { Injectable, computed, inject } from '@angular/core';
import { Account } from '../models';
import { uid } from '../utils/id.util';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../utils/seed';
import { StoreService } from './store.service';

export interface AuthResult {
  ok: boolean;
  error?: string;
}

/** Demo authentication – accounts live in localStorage, nothing is ever sent anywhere. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly store = inject(StoreService);

  readonly account = computed<Account | null>(() => {
    const id = this.store.session().accountId;
    return this.store.accounts().find((a) => a.id === id) ?? null;
  });
  readonly isSignedIn = computed(() => this.account() !== null);

  signIn(email: string, password: string): AuthResult {
    const normalized = email.trim().toLowerCase();
    const account = this.store.accounts().find((a) => a.email.toLowerCase() === normalized);
    if (!account) return { ok: false, error: 'No account found with that email.' };
    if (account.password !== password) return { ok: false, error: 'Incorrect password.' };
    this.startSession(account);
    return { ok: true };
  }

  signInDemo(): AuthResult {
    return this.signIn(DEMO_EMAIL, DEMO_PASSWORD);
  }

  signUp(name: string, email: string, password: string): AuthResult {
    const normalized = email.trim().toLowerCase();
    if (!name.trim()) return { ok: false, error: 'Please tell us your name.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
      return { ok: false, error: 'That email address does not look right.' };
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    if (this.store.accounts().some((a) => a.email.toLowerCase() === normalized))
      return { ok: false, error: 'An account with that email already exists.' };

    const account: Account = {
      id: uid('acc'),
      name: name.trim(),
      email: normalized,
      password,
      colorIndex: this.store.accounts().length % 8,
      createdAt: new Date().toISOString(),
    };
    this.store.accounts.update((list) => [...list, account]);
    this.store.session.set({ accountId: account.id, activeGroupId: null });
    return { ok: true };
  }

  signOut(): void {
    this.store.session.set({ accountId: null, activeGroupId: null });
  }

  updateProfile(patch: Partial<Pick<Account, 'name' | 'colorIndex'>>): void {
    const me = this.account();
    if (!me) return;
    this.store.accounts.update((list) =>
      list.map((a) => (a.id === me.id ? { ...a, ...patch } : a)),
    );
    // Keep this person's member records in sync so the whole app shows the new name.
    this.store.members.update((list) =>
      list.map((m) => (m.accountId === me.id ? { ...m, ...patch } : m)),
    );
  }

  changePassword(current: string, next: string): AuthResult {
    const me = this.account();
    if (!me) return { ok: false, error: 'Not signed in.' };
    if (me.password !== current) return { ok: false, error: 'Current password is incorrect.' };
    if (next.length < 6) return { ok: false, error: 'New password must be at least 6 characters.' };
    this.store.accounts.update((list) =>
      list.map((a) => (a.id === me.id ? { ...a, password: next } : a)),
    );
    return { ok: true };
  }

  private startSession(account: Account): void {
    const firstGroup =
      this.store.members().find((m) => m.accountId === account.id)?.groupId ?? null;
    const previous = this.store.session();
    const activeGroupId =
      previous.accountId === account.id && previous.activeGroupId
        ? previous.activeGroupId
        : firstGroup;
    this.store.session.set({ accountId: account.id, activeGroupId });
  }
}
