import { Injectable, inject } from '@angular/core';
import { Account, Activity, Group, Member, Session, Task } from '../models';
import { buildSeed } from '../utils/seed';
import { StorageService, persistedSignal } from './storage.service';

const EMPTY_SESSION: Session = { accountId: null, activeGroupId: null };

/**
 * Single source of truth. Every collection is a persisted signal, so the whole app
 * reacts to changes and survives reloads without any backend.
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly storage = inject(StorageService);

  readonly accounts = persistedSignal<Account[]>('accounts', []);
  readonly groups = persistedSignal<Group[]>('groups', []);
  readonly members = persistedSignal<Member[]>('members', []);
  readonly tasks = persistedSignal<Task[]>('tasks', []);
  readonly activities = persistedSignal<Activity[]>('activities', []);
  readonly session = persistedSignal<Session>('session', EMPTY_SESSION);
  readonly seeded = persistedSignal<boolean>('seeded', false);

  constructor() {
    if (!this.seeded()) this.loadSeed();
  }

  /** Replaces all data with the demo dataset (keeps the current session if it still resolves). */
  loadSeed(): void {
    const seed = buildSeed();
    this.accounts.set(seed.accounts);
    this.groups.set(seed.groups);
    this.members.set(seed.members);
    this.tasks.set(seed.tasks);
    this.activities.set(seed.activities);
    this.seeded.set(true);
    const s = this.session();
    if (!seed.accounts.some((a) => a.id === s.accountId)) this.session.set(EMPTY_SESSION);
  }

  resetToDemo(): void {
    this.storage.clearAll();
    this.session.set(EMPTY_SESSION);
    this.loadSeed();
  }

  exportJson(): string {
    return JSON.stringify(
      {
        app: 'handled',
        version: 1,
        exportedAt: new Date().toISOString(),
        accounts: this.accounts(),
        groups: this.groups(),
        members: this.members(),
        tasks: this.tasks(),
        activities: this.activities(),
      },
      null,
      2,
    );
  }

  importJson(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (data?.app !== 'handled' || !Array.isArray(data.tasks)) return false;
      this.accounts.set(data.accounts ?? []);
      this.groups.set(data.groups ?? []);
      this.members.set(data.members ?? []);
      this.tasks.set(data.tasks ?? []);
      this.activities.set(data.activities ?? []);
      this.seeded.set(true);
      const s = this.session();
      if (!this.accounts().some((a) => a.id === s.accountId)) this.session.set(EMPTY_SESSION);
      return true;
    } catch {
      return false;
    }
  }
}
