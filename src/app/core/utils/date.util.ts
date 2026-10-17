import { IsoDate, RecurrenceFrequency } from '../models';

const MS_PER_DAY = 86_400_000;

/** Parses an ISO calendar date into a local-time Date at midnight. */
export function parseIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toIsoDate(date: Date): IsoDate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayIso(): IsoDate {
  return toIsoDate(new Date());
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Adds calendar months, clamping the day to the last day of the target month. */
export function addMonths(iso: IsoDate, months: number): IsoDate {
  const d = parseIsoDate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toIsoDate(d);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / MS_PER_DAY);
}

/** Days until the given date relative to today (negative = past). */
export function daysUntil(iso: IsoDate): number {
  return daysBetween(todayIso(), iso);
}

export function startOfWeek(iso: IsoDate): IsoDate {
  const d = parseIsoDate(iso);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return toIsoDate(d);
}

export function isSameMonth(a: IsoDate, b: IsoDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function nextOccurrence(iso: IsoDate, frequency: RecurrenceFrequency): IsoDate | null {
  switch (frequency) {
    case 'daily':
      return addDays(iso, 1);
    case 'weekly':
      return addDays(iso, 7);
    case 'biweekly':
      return addDays(iso, 14);
    case 'monthly':
      return addMonths(iso, 1);
    case 'quarterly':
      return addMonths(iso, 3);
    case 'yearly':
      return addMonths(iso, 12);
    default:
      return null;
  }
}

/**
 * Next due date for a recurring task, based on its schedule (not the completion
 * date) so cadence is preserved – but never in the past.
 */
export function nextDueDate(currentDue: IsoDate, frequency: RecurrenceFrequency): IsoDate | null {
  let next = nextOccurrence(currentDue, frequency);
  const today = todayIso();
  let guard = 0;
  while (next && next < today && guard++ < 500) {
    next = nextOccurrence(next, frequency);
  }
  return next;
}

const longDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const longDateYear = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

export function formatDate(iso: IsoDate, withYear = false): string {
  const d = parseIsoDate(iso);
  return withYear ? longDateYear.format(d) : longDate.format(d);
}

export function formatWeekday(iso: IsoDate): string {
  return weekday.format(parseIsoDate(iso));
}

/** Human "due" phrasing: "Overdue by 3 days", "Due today", "Due tomorrow", "Due in 5 days". */
export function dueLabel(iso: IsoDate): string {
  const n = daysUntil(iso);
  if (n < -1) return `Overdue by ${-n} days`;
  if (n === -1) return 'Overdue by 1 day';
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  if (n <= 6) return `Due ${formatWeekday(iso)}`;
  return `Due ${formatDate(iso)}`;
}

/** Relative timestamp for activity feeds: "just now", "5m ago", "3h ago", "2d ago". */
export function timeAgo(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return formatDate(toIsoDate(new Date(isoTimestamp)));
}
