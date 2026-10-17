import { Member, Task, priorityWeight } from '../models';
import { daysUntil, todayIso } from './date.util';

export function isOpen(task: Task): boolean {
  return task.status !== 'done';
}

export function isOverdue(task: Task, today = todayIso()): boolean {
  return isOpen(task) && task.dueDate < today;
}

export function isDueToday(task: Task, today = todayIso()): boolean {
  return isOpen(task) && task.dueDate === today;
}

export function isUnowned(task: Task): boolean {
  return isOpen(task) && task.ownerId === null;
}

/** A task that is due soon or high-impact – what "No Owner" detection should shout about. */
export function isImportant(task: Task): boolean {
  return (
    task.priority === 'high' ||
    task.priority === 'critical' ||
    daysUntil(task.dueDate) <= 3
  );
}

/**
 * Urgency score used to rank lists: higher = more urgent.
 * Combines how overdue/soon a task is with its priority and whether it has an owner.
 */
export function urgencyScore(task: Task): number {
  const days = daysUntil(task.dueDate);
  const timePressure = days < 0 ? 50 + Math.min(-days, 30) : Math.max(0, 30 - days);
  const priority = priorityWeight(task.priority) * 8;
  const noOwner = task.ownerId === null ? 20 : 0;
  return timePressure + priority + noOwner;
}

/** Series reliability: share of occurrences that were late or missed. */
export function missRate(task: Task): number {
  const total = task.completionCount + task.missedCount;
  if (total === 0) return 0;
  return (task.lateCount + task.missedCount) / total;
}

export function isFrequentlyMissed(task: Task): boolean {
  return task.lateCount + task.missedCount >= 2 && missRate(task) >= 0.4;
}

/** Weighted open workload per member, used for fair distribution. */
export function workloadByMember(tasks: Task[], members: Member[]): Map<string, number> {
  const load = new Map<string, number>(members.map((m) => [m.id, 0]));
  for (const t of tasks) {
    if (!isOpen(t) || !t.ownerId || !load.has(t.ownerId)) continue;
    load.set(t.ownerId, (load.get(t.ownerId) ?? 0) + priorityWeight(t.priority));
  }
  return load;
}

/** Suggests the member with the lightest weighted workload (ties → fewest tasks → name). */
export function suggestOwner(
  tasks: Task[],
  members: Member[],
  exclude: string[] = [],
): Member | null {
  const candidates = members.filter((m) => !exclude.includes(m.id));
  if (candidates.length === 0) return null;
  const load = workloadByMember(tasks, candidates);
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (isOpen(t) && t.ownerId) counts.set(t.ownerId, (counts.get(t.ownerId) ?? 0) + 1);
  }
  return [...candidates].sort((a, b) => {
    const diff = (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0);
    if (diff !== 0) return diff;
    const cdiff = (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0);
    if (cdiff !== 0) return cdiff;
    return a.name.localeCompare(b.name);
  })[0];
}

/** Picks the next member in a rotation after `currentOwnerId`. */
export function nextInRotation(
  rotation: string[],
  currentOwnerId: string | null,
  members: Member[],
): string | null {
  const order = (rotation.length ? rotation : members.map((m) => m.id)).filter((id) =>
    members.some((m) => m.id === id),
  );
  if (order.length === 0) return currentOwnerId;
  const idx = currentOwnerId ? order.indexOf(currentOwnerId) : -1;
  return order[(idx + 1) % order.length];
}
