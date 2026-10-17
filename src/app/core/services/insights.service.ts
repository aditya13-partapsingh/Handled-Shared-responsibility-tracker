import { Injectable, computed, inject } from '@angular/core';
import { Member, TASK_CATEGORIES, Task, TaskCategory, priorityWeight } from '../models';
import { addDays, startOfWeek, todayIso, toIsoDate } from '../utils/date.util';
import { isFrequentlyMissed, isOpen, isOverdue, missRate, workloadByMember } from '../utils/task.util';
import { GroupService } from './group.service';
import { TaskService } from './task.service';

export interface MemberStats {
  member: Member;
  open: number;
  overdue: number;
  completed: number;
  late: number;
  onTimeRate: number | null;
  load: number;
  loadShare: number;
}

export interface CategoryStat {
  category: TaskCategory;
  label: string;
  color: string;
  count: number;
  share: number;
}

export interface WeekStat {
  weekStart: string;
  label: string;
  completed: number;
  late: number;
}

export interface MissedTask {
  task: Task;
  rate: number;
  suggestion: string;
}

export interface RebalanceMove {
  task: Task;
  from: Member;
  to: Member;
}

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly tasks = inject(TaskService);
  private readonly group = inject(GroupService);

  readonly memberStats = computed<MemberStats[]>(() => {
    const members = this.group.members();
    const all = this.tasks.all();
    const load = workloadByMember(all, members);
    const totalLoad = [...load.values()].reduce((a, b) => a + b, 0) || 1;
    return members
      .map((m) => {
        const open = all.filter((t) => isOpen(t) && t.ownerId === m.id);
        const done = all.filter((t) => t.status === 'done' && !t.skipped && t.completedBy === m.id);
        const late = done.filter(
          (t) => t.completedAt && toIsoDate(new Date(t.completedAt)) > t.dueDate,
        ).length;
        return {
          member: m,
          open: open.length,
          overdue: open.filter((t) => isOverdue(t)).length,
          completed: done.length,
          late,
          onTimeRate: done.length ? (done.length - late) / done.length : null,
          load: load.get(m.id) ?? 0,
          loadShare: (load.get(m.id) ?? 0) / totalLoad,
        };
      })
      .sort((a, b) => b.load - a.load);
  });

  readonly maxLoad = computed(() => Math.max(1, ...this.memberStats().map((s) => s.load)));

  readonly categoryBreakdown = computed<CategoryStat[]>(() => {
    const open = this.tasks.open();
    const total = open.length || 1;
    return TASK_CATEGORIES.map((c) => {
      const count = open.filter((t) => t.category === c.value).length;
      return { category: c.value, label: c.label, color: c.color, count, share: count / total };
    }).filter((c) => c.count > 0);
  });

  /** Last 8 weeks of completions, oldest first. */
  readonly weekly = computed<WeekStat[]>(() => {
    const done = this.tasks.done().filter((t) => !t.skipped && t.completedAt);
    const thisWeek = startOfWeek(todayIso());
    const weeks: WeekStat[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = addDays(thisWeek, -7 * i);
      const end = addDays(start, 7);
      const inWeek = done.filter((t) => {
        const d = toIsoDate(new Date(t.completedAt!));
        return d >= start && d < end;
      });
      weeks.push({
        weekStart: start,
        label: i === 0 ? 'Now' : `-${i}w`,
        completed: inWeek.length,
        late: inWeek.filter((t) => toIsoDate(new Date(t.completedAt!)) > t.dueDate).length,
      });
    }
    return weeks;
  });

  /** Latest occurrence of every series that keeps slipping. */
  readonly frequentlyMissed = computed<MissedTask[]>(() => {
    const latest = new Map<string, Task>();
    for (const t of this.tasks.all()) {
      const cur = latest.get(t.seriesId);
      if (!cur || t.dueDate > cur.dueDate) latest.set(t.seriesId, t);
    }
    return [...latest.values()]
      .filter(isFrequentlyMissed)
      .map((task) => ({ task, rate: missRate(task), suggestion: this.suggestionFor(task) }))
      .sort((a, b) => b.rate - a.rate);
  });

  /**
   * Proposed reassignments of open recurring tasks that flatten the workload.
   * Greedy: keep moving the smallest task from the busiest to the least busy member
   * while it narrows the gap.
   */
  readonly rebalance = computed<RebalanceMove[]>(() => {
    const members = this.group.members();
    if (members.length < 2) return [];
    const open = this.tasks.open();
    const load = workloadByMember(open, members);
    const owners = new Map(open.map((t) => [t.id, t.ownerId]));
    const moves: RebalanceMove[] = [];
    const movable = open.filter((t) => t.recurrence.frequency !== 'none' && t.ownerId);

    for (let round = 0; round < 10; round++) {
      const sorted = [...members].sort((a, b) => (load.get(b.id) ?? 0) - (load.get(a.id) ?? 0));
      const busiest = sorted[0];
      const lightest = sorted[sorted.length - 1];
      const gap = (load.get(busiest.id) ?? 0) - (load.get(lightest.id) ?? 0);
      const candidates = movable
        .filter((t) => owners.get(t.id) === busiest.id)
        .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
      const pick = candidates.find((t) => priorityWeight(t.priority) * 2 < gap);
      if (!pick) break;
      const w = priorityWeight(pick.priority);
      load.set(busiest.id, (load.get(busiest.id) ?? 0) - w);
      load.set(lightest.id, (load.get(lightest.id) ?? 0) + w);
      owners.set(pick.id, lightest.id);
      moves.push({ task: pick, from: busiest, to: lightest });
    }
    return moves;
  });

  readonly summary = computed(() => {
    const stats = this.memberStats();
    const completed = stats.reduce((a, s) => a + s.completed, 0);
    const late = stats.reduce((a, s) => a + s.late, 0);
    return {
      open: this.tasks.open().length,
      unowned: this.tasks.unowned().length,
      overdue: this.tasks.overdue().length,
      completedThisWeek: this.tasks.completedThisWeek().length,
      onTimeRate: completed ? (completed - late) / completed : null,
      recurring: this.tasks.open().filter((t) => t.recurrence.frequency !== 'none').length,
    };
  });

  applyRebalance(): number {
    const moves = this.rebalance();
    for (const m of moves) this.tasks.assign(m.task.id, m.to.id, true);
    return moves.length;
  }

  private suggestionFor(task: Task): string {
    if (!task.ownerId) return 'Nobody owns this – assign it to someone reliable.';
    if (task.recurrence.frequency !== 'none' && !task.recurrence.rotateOwners)
      return 'Turn on owner rotation so the load is shared.';
    const lightest = this.tasks.suggestOwner([task.ownerId]);
    return lightest ? `Try handing it to ${lightest.name}, who has the lightest workload.` : 'Consider an earlier reminder.';
  }
}
