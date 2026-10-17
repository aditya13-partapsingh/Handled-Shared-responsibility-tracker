import { Injectable, computed, inject } from '@angular/core';
import {
  Activity,
  ActivityType,
  Reminder,
  Task,
  TaskDraft,
  TaskTemplate,
  categoryLabel,
} from '../models';
import { addDays, daysUntil, dueLabel, nextDueDate, todayIso, toIsoDate } from '../utils/date.util';
import { uid } from '../utils/id.util';
import {
  isDueToday,
  isImportant,
  isOpen,
  isOverdue,
  isUnowned,
  nextInRotation,
  suggestOwner,
  urgencyScore,
} from '../utils/task.util';
import { GroupService } from './group.service';
import { StoreService } from './store.service';
import { ToastService } from './toast.service';

const byUrgency = (a: Task, b: Task) =>
  urgencyScore(b) - urgencyScore(a) || a.dueDate.localeCompare(b.dueDate);

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly store = inject(StoreService);
  private readonly group = inject(GroupService);
  private readonly toast = inject(ToastService);

  /** Every task in the active group. */
  readonly all = computed<Task[]>(() => {
    const g = this.group.activeGroup();
    return g ? this.store.tasks().filter((t) => t.groupId === g.id) : [];
  });

  readonly byId = computed(() => new Map(this.all().map((t) => [t.id, t])));

  readonly open = computed(() => this.all().filter(isOpen).sort(byUrgency));
  readonly done = computed(() =>
    this.all()
      .filter((t) => !isOpen(t))
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
  );

  readonly mine = computed(() => {
    const me = this.group.me();
    return me ? this.open().filter((t) => t.ownerId === me.id) : [];
  });

  readonly unowned = computed(() => this.open().filter(isUnowned));
  /** The headline "No Owner" alert list: unowned tasks that are urgent or high-impact. */
  readonly unownedImportant = computed(() => this.unowned().filter(isImportant));
  readonly overdue = computed(() => this.open().filter((t) => isOverdue(t)));
  readonly dueToday = computed(() => this.open().filter((t) => isDueToday(t)));
  readonly upcoming = computed(() =>
    this.open()
      .filter((t) => {
        const d = daysUntil(t.dueDate);
        return d > 0 && d <= 7;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  );
  readonly later = computed(() =>
    this.open()
      .filter((t) => daysUntil(t.dueDate) > 7)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  );

  readonly completedThisWeek = computed(() => {
    const cutoff = addDays(todayIso(), -6);
    return this.done().filter((t) => !t.skipped && t.completedAt && toIsoDate(new Date(t.completedAt)) >= cutoff);
  });

  /** Derived reminders – never stored, so they are always in sync with the tasks. */
  readonly reminders = computed<Reminder[]>(() => {
    const list: Reminder[] = [];
    for (const t of this.open()) {
      const d = daysUntil(t.dueDate);
      if (d < 0) {
        list.push({
          key: `overdue:${t.id}`,
          kind: 'overdue',
          task: t,
          title: t.title,
          message: `${dueLabel(t.dueDate)}${t.ownerId ? ` · ${this.group.memberName(t.ownerId)}` : ' · nobody owns this'}`,
        });
      } else if (t.ownerId === null && isImportant(t)) {
        list.push({
          key: `no_owner:${t.id}`,
          kind: 'no_owner',
          task: t,
          title: t.title,
          message: `Nobody has taken this yet · ${dueLabel(t.dueDate)}`,
        });
      } else if (t.reminderDaysBefore !== null && d <= t.reminderDaysBefore) {
        list.push({
          key: `due_soon:${t.id}`,
          kind: 'due_soon',
          task: t,
          title: t.title,
          message: `${dueLabel(t.dueDate)} · ${categoryLabel(t.category)}`,
        });
      }
    }
    return list.sort((a, b) => byUrgency(a.task, b.task));
  });

  readonly reminderCount = computed(() => this.reminders().length);

  task(id: string): Task | null {
    return this.byId().get(id) ?? null;
  }

  /** Every occurrence of a series, newest due date first. */
  seriesHistory(seriesId: string): Task[] {
    return this.all()
      .filter((t) => t.seriesId === seriesId)
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  }

  activitiesFor(taskId: string): Activity[] {
    return this.group.activities().filter((a) => a.taskId === taskId);
  }

  suggestOwner(exclude: string[] = []) {
    return suggestOwner(this.open(), this.group.members(), exclude);
  }

  emptyDraft(overrides: Partial<TaskDraft> = {}): TaskDraft {
    return {
      title: '',
      description: '',
      category: 'household',
      priority: 'medium',
      ownerId: null,
      dueDate: addDays(todayIso(), 1),
      recurrence: { frequency: 'none', rotateOwners: false, rotation: [] },
      reminderDaysBefore: 1,
      ...overrides,
    };
  }

  create(draft: TaskDraft): Task | null {
    const g = this.group.activeGroup();
    const me = this.group.me();
    if (!g || !me) return null;
    const now = new Date().toISOString();
    const task: Task = {
      ...draft,
      title: draft.title.trim(),
      id: uid('t'),
      groupId: g.id,
      seriesId: uid('s'),
      status: 'open',
      createdAt: now,
      createdBy: me.id,
      completedAt: null,
      completedBy: null,
      skipped: false,
      completionCount: 0,
      lateCount: 0,
      missedCount: 0,
    };
    this.store.tasks.update((list) => [task, ...list]);
    this.log('created', task);
    if (task.ownerId) this.log('assigned', task, this.group.memberName(task.ownerId));
    return task;
  }

  createFromTemplates(templates: TaskTemplate[]): number {
    let n = 0;
    for (const tpl of templates) {
      const created = this.create(
        this.emptyDraft({
          title: tpl.title,
          category: tpl.category,
          priority: tpl.priority,
          dueDate: addDays(todayIso(), tpl.daysFromNow),
          recurrence: { frequency: tpl.frequency, rotateOwners: false, rotation: [] },
          reminderDaysBefore: 2,
        }),
      );
      if (created) n++;
    }
    return n;
  }

  update(id: string, patch: Partial<TaskDraft>): void {
    const before = this.task(id);
    if (!before) return;
    const after: Task = { ...before, ...patch };
    this.store.tasks.update((list) => list.map((t) => (t.id === id ? after : t)));
    if (before.ownerId !== after.ownerId) {
      if (after.ownerId) this.log('assigned', after, this.group.memberName(after.ownerId));
      else this.log('unassigned', after, this.group.memberName(before.ownerId));
    } else {
      this.log('updated', after);
    }
  }

  remove(id: string): void {
    const task = this.task(id);
    if (!task) return;
    this.store.tasks.update((list) => list.filter((t) => t.id !== id));
    this.log('deleted', task);
  }

  claim(id: string): void {
    const me = this.group.me();
    const task = this.task(id);
    if (!me || !task) return;
    this.patch(id, { ownerId: me.id });
    this.log('claimed', task);
    this.toast.success('You own this now', task.title);
  }

  assign(id: string, memberId: string | null, auto = false): void {
    const task = this.task(id);
    if (!task || task.ownerId === memberId) return;
    this.patch(id, { ownerId: memberId });
    if (memberId) this.log(auto ? 'auto_assigned' : 'assigned', task, this.group.memberName(memberId));
    else this.log('unassigned', task, this.group.memberName(task.ownerId));
  }

  /** Hands every unowned open task to the member with the lightest workload, most urgent first. */
  autoAssignUnowned(onlyImportant = false): number {
    const targets = (onlyImportant ? this.unownedImportant() : this.unowned()).slice();
    let count = 0;
    for (const t of targets) {
      const suggestion = this.suggestOwner();
      if (!suggestion) break;
      this.assign(t.id, suggestion.id, true);
      count++;
    }
    if (count) this.toast.success(`Assigned ${count} task${count === 1 ? '' : 's'}`, 'Balanced by current workload');
    else this.toast.info('Nothing to assign', 'Every task already has an owner.');
    return count;
  }

  setStatus(id: string, status: Task['status']): void {
    if (status === 'done') {
      this.complete(id);
      return;
    }
    const task = this.task(id);
    if (!task) return;
    if (task.status === 'done') {
      this.reopen(id);
      if (status === 'in_progress') this.patch(id, { status });
      return;
    }
    this.patch(id, { status });
    this.log('updated', task, status === 'in_progress' ? 'Started' : 'Back to open');
  }

  /** Marks done, updates reliability counters and spawns the next occurrence for recurring tasks. */
  complete(id: string): void {
    const me = this.group.me();
    const task = this.task(id);
    if (!me || !task || task.status === 'done') return;
    const today = todayIso();
    const late = task.dueDate < today;
    const completed: Task = {
      ...task,
      status: 'done',
      completedAt: new Date().toISOString(),
      completedBy: me.id,
      skipped: false,
      completionCount: task.completionCount + 1,
      lateCount: task.lateCount + (late ? 1 : 0),
    };
    this.store.tasks.update((list) => list.map((t) => (t.id === id ? completed : t)));
    this.log('completed', completed, late ? 'Completed late' : null);
    const next = this.spawnNext(completed);
    this.toast.show({
      kind: 'success',
      title: 'Marked as done',
      message: next ? `Next: ${dueLabel(next.dueDate)}${next.ownerId ? ` · ${this.group.memberName(next.ownerId)}` : ''}` : task.title,
      action: { label: 'Undo', run: () => this.undoComplete(completed.id, next?.id ?? null) },
    });
  }

  /** Skips the current occurrence of a recurring task (counts as missed) and rolls forward. */
  skip(id: string): void {
    const me = this.group.me();
    const task = this.task(id);
    if (!me || !task || task.status === 'done' || task.recurrence.frequency === 'none') return;
    const skipped: Task = {
      ...task,
      status: 'done',
      completedAt: new Date().toISOString(),
      completedBy: me.id,
      skipped: true,
      missedCount: task.missedCount + 1,
    };
    this.store.tasks.update((list) => list.map((t) => (t.id === id ? skipped : t)));
    this.log('skipped', skipped);
    const next = this.spawnNext(skipped);
    this.toast.info('Occurrence skipped', next ? `Next: ${dueLabel(next.dueDate)}` : undefined);
  }

  reopen(id: string): void {
    const task = this.task(id);
    if (!task || task.status !== 'done') return;
    const wasLate = !task.skipped && task.completedAt && toIsoDate(new Date(task.completedAt)) > task.dueDate;
    const reopened: Task = {
      ...task,
      status: 'open',
      completedAt: null,
      completedBy: null,
      skipped: false,
      completionCount: Math.max(0, task.completionCount - (task.skipped ? 0 : 1)),
      lateCount: Math.max(0, task.lateCount - (wasLate ? 1 : 0)),
      missedCount: Math.max(0, task.missedCount - (task.skipped ? 1 : 0)),
    };
    this.store.tasks.update((list) => list.map((t) => (t.id === id ? reopened : t)));
    this.log('reopened', reopened);
  }

  private undoComplete(doneId: string, nextId: string | null): void {
    if (nextId) this.store.tasks.update((list) => list.filter((t) => t.id !== nextId));
    this.reopen(doneId);
    this.toast.info('Restored', 'The task is open again.');
  }

  private spawnNext(from: Task): Task | null {
    const freq = from.recurrence.frequency;
    if (freq === 'none') return null;
    const nextDue = nextDueDate(from.dueDate, freq);
    if (!nextDue) return null;
    const members = this.group.members();
    const ownerId = from.recurrence.rotateOwners
      ? nextInRotation(from.recurrence.rotation, from.ownerId, members)
      : from.ownerId;
    const next: Task = {
      ...from,
      id: uid('t'),
      status: 'open',
      ownerId,
      dueDate: nextDue,
      createdAt: new Date().toISOString(),
      completedAt: null,
      completedBy: null,
      skipped: false,
    };
    this.store.tasks.update((list) => [next, ...list]);
    if (from.recurrence.rotateOwners && ownerId && ownerId !== from.ownerId) {
      this.log('auto_assigned', next, this.group.memberName(ownerId));
    }
    return next;
  }

  private patch(id: string, patch: Partial<Task>): void {
    this.store.tasks.update((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  private log(type: ActivityType, task: Task, detail: string | null = null): void {
    const me = this.group.me();
    if (!me) return;
    const entry: Activity = {
      id: uid('act'),
      groupId: task.groupId,
      type,
      actorId: me.id,
      taskId: task.id,
      taskTitle: task.title,
      detail,
      at: new Date().toISOString(),
    };
    this.store.activities.update((list) => [entry, ...list].slice(0, 500));
  }
}
