import { Injectable, computed, inject } from '@angular/core';
import { Activity, ActivityType, Group, GroupType, Member, MemberRole } from '../models';
import { uid } from '../utils/id.util';
import { AuthService } from './auth.service';
import { StoreService } from './store.service';

function makeInviteCode(name: string): string {
  const stem = name
    .replace(/[^a-z]/gi, '')
    .slice(0, 5)
    .toUpperCase()
    .padEnd(3, 'X');
  const num = Math.floor(100 + Math.random() * 900);
  return `${stem}-${num}`;
}

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly store = inject(StoreService);
  private readonly auth = inject(AuthService);

  /** Groups the signed-in account belongs to. */
  readonly myGroups = computed<Group[]>(() => {
    const acc = this.auth.account();
    if (!acc) return [];
    const ids = new Set(
      this.store
        .members()
        .filter((m) => m.accountId === acc.id)
        .map((m) => m.groupId),
    );
    return this.store.groups().filter((g) => ids.has(g.id));
  });

  readonly activeGroup = computed<Group | null>(() => {
    const groups = this.myGroups();
    const id = this.store.session().activeGroupId;
    return groups.find((g) => g.id === id) ?? groups[0] ?? null;
  });

  readonly hasGroup = computed(() => this.activeGroup() !== null);

  /** Members of the active group, admins first then by join date. */
  readonly members = computed<Member[]>(() => {
    const g = this.activeGroup();
    if (!g) return [];
    return this.store
      .members()
      .filter((m) => m.groupId === g.id)
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  });

  /** The signed-in person's member record inside the active group. */
  readonly me = computed<Member | null>(() => {
    const acc = this.auth.account();
    return this.members().find((m) => m.accountId === acc?.id) ?? null;
  });

  readonly isAdmin = computed(() => this.me()?.role === 'admin');

  readonly memberMap = computed(() => new Map(this.members().map((m) => [m.id, m])));

  readonly activities = computed<Activity[]>(() => {
    const g = this.activeGroup();
    if (!g) return [];
    return this.store
      .activities()
      .filter((a) => a.groupId === g.id)
      .sort((a, b) => b.at.localeCompare(a.at));
  });

  memberById(id: string | null | undefined): Member | null {
    return id ? (this.memberMap().get(id) ?? null) : null;
  }

  memberName(id: string | null | undefined): string {
    return this.memberById(id)?.name ?? 'Unknown';
  }

  switchGroup(groupId: string): void {
    this.store.session.update((s) => ({ ...s, activeGroupId: groupId }));
  }

  createGroup(name: string, type: GroupType, memberNames: string[] = []): Group {
    const acc = this.auth.account();
    if (!acc) throw new Error('Not signed in');
    const now = new Date().toISOString();
    const group: Group = {
      id: uid('grp'),
      name: name.trim(),
      type,
      inviteCode: makeInviteCode(name),
      createdAt: now,
      createdBy: acc.id,
    };
    const me: Member = {
      id: uid('m'),
      groupId: group.id,
      accountId: acc.id,
      name: acc.name,
      email: acc.email,
      role: 'admin',
      colorIndex: acc.colorIndex,
      joinedAt: now,
    };
    const others: Member[] = memberNames
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n, i) => ({
        id: uid('m'),
        groupId: group.id,
        accountId: null,
        name: n,
        email: '',
        role: 'member' as MemberRole,
        colorIndex: (acc.colorIndex + i + 1) % 8,
        joinedAt: now,
      }));

    this.store.groups.update((list) => [...list, group]);
    this.store.members.update((list) => [...list, me, ...others]);
    this.store.session.update((s) => ({ ...s, activeGroupId: group.id }));
    this.log('group_created', me.id, group.id, group.name);
    return group;
  }

  joinByCode(code: string): { ok: boolean; error?: string; group?: Group } {
    const acc = this.auth.account();
    if (!acc) return { ok: false, error: 'Not signed in.' };
    const normalized = code.trim().toUpperCase();
    const group = this.store.groups().find((g) => g.inviteCode.toUpperCase() === normalized);
    if (!group) return { ok: false, error: 'No group matches that invite code.' };
    const already = this.store
      .members()
      .some((m) => m.groupId === group.id && m.accountId === acc.id);
    if (already) {
      this.switchGroup(group.id);
      return { ok: true, group };
    }
    const member: Member = {
      id: uid('m'),
      groupId: group.id,
      accountId: acc.id,
      name: acc.name,
      email: acc.email,
      role: 'member',
      colorIndex: (this.store.members().filter((m) => m.groupId === group.id).length + 1) % 8,
      joinedAt: new Date().toISOString(),
    };
    this.store.members.update((list) => [...list, member]);
    this.store.session.update((s) => ({ ...s, activeGroupId: group.id }));
    this.log('member_added', member.id, group.id, acc.name);
    return { ok: true, group };
  }

  updateGroup(patch: Partial<Pick<Group, 'name' | 'type'>>): void {
    const g = this.activeGroup();
    if (!g) return;
    this.store.groups.update((list) => list.map((x) => (x.id === g.id ? { ...x, ...patch } : x)));
  }

  regenerateInviteCode(): void {
    const g = this.activeGroup();
    if (!g) return;
    this.store.groups.update((list) =>
      list.map((x) => (x.id === g.id ? { ...x, inviteCode: makeInviteCode(x.name) } : x)),
    );
  }

  addMember(name: string, email = ''): Member | null {
    const g = this.activeGroup();
    const me = this.me();
    if (!g || !me || !name.trim()) return null;
    const used = new Set(this.members().map((m) => m.colorIndex));
    let colorIndex = 0;
    while (used.has(colorIndex) && colorIndex < 7) colorIndex++;
    if (used.has(colorIndex)) colorIndex = this.members().length % 8;
    const member: Member = {
      id: uid('m'),
      groupId: g.id,
      accountId: null,
      name: name.trim(),
      email: email.trim(),
      role: 'member',
      colorIndex,
      joinedAt: new Date().toISOString(),
    };
    this.store.members.update((list) => [...list, member]);
    this.log('member_added', me.id, g.id, member.name);
    return member;
  }

  updateMember(id: string, patch: Partial<Pick<Member, 'name' | 'email' | 'role' | 'colorIndex'>>): void {
    this.store.members.update((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  /** Removes a member; their open tasks become unowned so nothing silently disappears. */
  removeMember(id: string): void {
    const g = this.activeGroup();
    const me = this.me();
    const target = this.memberById(id);
    if (!g || !me || !target) return;
    this.store.members.update((list) => list.filter((m) => m.id !== id));
    this.store.tasks.update((list) =>
      list.map((t) =>
        t.groupId === g.id && t.status !== 'done' && t.ownerId === id
          ? { ...t, ownerId: null }
          : t.recurrence.rotation.includes(id)
            ? {
                ...t,
                recurrence: {
                  ...t.recurrence,
                  rotation: t.recurrence.rotation.filter((r) => r !== id),
                },
              }
            : t,
      ),
    );
    this.log('member_removed', me.id, g.id, target.name);
  }

  /** Leaves (or deletes, when last member) the active group. */
  leaveGroup(): void {
    const g = this.activeGroup();
    const me = this.me();
    if (!g || !me) return;
    const remaining = this.members().filter((m) => m.id !== me.id);
    if (remaining.length === 0) {
      this.deleteGroup();
      return;
    }
    this.removeMember(me.id);
    if (!remaining.some((m) => m.role === 'admin')) this.updateMember(remaining[0].id, { role: 'admin' });
    this.store.session.update((s) => ({ ...s, activeGroupId: null }));
  }

  deleteGroup(): void {
    const g = this.activeGroup();
    if (!g) return;
    this.store.groups.update((list) => list.filter((x) => x.id !== g.id));
    this.store.members.update((list) => list.filter((m) => m.groupId !== g.id));
    this.store.tasks.update((list) => list.filter((t) => t.groupId !== g.id));
    this.store.activities.update((list) => list.filter((a) => a.groupId !== g.id));
    this.store.session.update((s) => ({ ...s, activeGroupId: null }));
  }

  private log(type: ActivityType, actorId: string, groupId: string, detail: string | null): void {
    const entry: Activity = {
      id: uid('act'),
      groupId,
      type,
      actorId,
      taskId: null,
      taskTitle: null,
      detail,
      at: new Date().toISOString(),
    };
    this.store.activities.update((list) => [entry, ...list].slice(0, 500));
  }
}
