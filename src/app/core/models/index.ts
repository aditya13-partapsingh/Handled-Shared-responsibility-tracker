/** ISO calendar date, e.g. "2026-09-12". Timestamps use full ISO strings. */
export type IsoDate = string;

export type GroupType = 'family' | 'roommates' | 'team';

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  /** Shareable code other accounts can use to join (frontend-only, resolved from localStorage). */
  inviteCode: string;
  createdAt: string;
  createdBy: string;
}

export type MemberRole = 'admin' | 'member';

/** A person inside one group. Linked to an Account only when that person signed up on this device. */
export interface Member {
  id: string;
  groupId: string;
  accountId: string | null;
  name: string;
  email: string;
  role: MemberRole;
  /** Index into the categorical palette – stable identity color for avatars & charts. */
  colorIndex: number;
  joinedAt: string;
}

export type TaskStatus = 'open' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskCategory =
  | 'bills'
  | 'groceries'
  | 'maintenance'
  | 'errands'
  | 'household'
  | 'health'
  | 'other';

export type RecurrenceFrequency =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export interface Recurrence {
  frequency: RecurrenceFrequency;
  /** When true the next occurrence is handed to the next member in `rotation`. */
  rotateOwners: boolean;
  /** Ordered member ids used for rotation. Empty = all members. */
  rotation: string[];
}

export interface Task {
  id: string;
  groupId: string;
  /** Shared across every occurrence of a recurring task so history stays linked. */
  seriesId: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  /** `null` is the product's core signal: nobody has taken responsibility. */
  ownerId: string | null;
  dueDate: IsoDate;
  recurrence: Recurrence;
  /** Days before the due date to surface a reminder; `null` disables. */
  reminderDaysBefore: number | null;
  createdAt: string;
  createdBy: string;
  completedAt: string | null;
  completedBy: string | null;
  /** True when a recurring occurrence was skipped instead of completed. */
  skipped: boolean;
  /* Series-level reliability counters (carried forward to each new occurrence). */
  completionCount: number;
  lateCount: number;
  missedCount: number;
}

/** The editable subset of a task, used by the create/edit form. */
export type TaskDraft = Pick<
  Task,
  | 'title'
  | 'description'
  | 'category'
  | 'priority'
  | 'ownerId'
  | 'dueDate'
  | 'recurrence'
  | 'reminderDaysBefore'
>;

export type ActivityType =
  | 'created'
  | 'updated'
  | 'assigned'
  | 'unassigned'
  | 'claimed'
  | 'completed'
  | 'reopened'
  | 'skipped'
  | 'deleted'
  | 'auto_assigned'
  | 'member_added'
  | 'member_removed'
  | 'group_created';

export interface Activity {
  id: string;
  groupId: string;
  type: ActivityType;
  actorId: string;
  taskId: string | null;
  taskTitle: string | null;
  /** Free-form detail, e.g. the assignee's name. */
  detail: string | null;
  at: string;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  /** Demo-only: this is a frontend-only app, credentials never leave localStorage. */
  password: string;
  colorIndex: number;
  createdAt: string;
}

export interface Session {
  accountId: string | null;
  activeGroupId: string | null;
}

export type ReminderKind = 'overdue' | 'due_soon' | 'no_owner';

/** Derived, never stored – recomputed from tasks on every change. */
export interface Reminder {
  key: string;
  kind: ReminderKind;
  task: Task;
  title: string;
  message: string;
}

export interface TaskTemplate {
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  frequency: RecurrenceFrequency;
  daysFromNow: number;
}

/** Identity colors for avatars, charts and chips. Index with `colorIndex`. */
export const PALETTE = [
  '#3d8bff',
  '#ff7a59',
  '#3ddc97',
  '#a78bfa',
  '#ffb547',
  '#ff5c7c',
  '#2dd4bf',
  '#f472b6',
];

export const TASK_CATEGORIES: { value: TaskCategory; label: string; icon: string; color: string }[] =
  [
    { value: 'bills', label: 'Bills', icon: 'credit-card', color: '#4aa0ff' },
    { value: 'groceries', label: 'Groceries', icon: 'shopping-cart', color: '#3ddc97' },
    { value: 'maintenance', label: 'Maintenance', icon: 'wrench', color: '#ffb547' },
    { value: 'errands', label: 'Errands', icon: 'map-pin', color: '#ff7a59' },
    { value: 'household', label: 'Household', icon: 'home', color: '#a78bfa' },
    { value: 'health', label: 'Health', icon: 'heart', color: '#ff5c7c' },
    { value: 'other', label: 'Other', icon: 'box', color: '#8b97b1' },
  ];

export const TASK_PRIORITIES: { value: TaskPriority; label: string; weight: number }[] = [
  { value: 'low', label: 'Low', weight: 1 },
  { value: 'medium', label: 'Medium', weight: 2 },
  { value: 'high', label: 'High', weight: 3 },
  { value: 'critical', label: 'Critical', weight: 5 },
];

export const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly' },
];

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'No reminder' },
  { value: 0, label: 'On the due date' },
  { value: 1, label: '1 day before' },
  { value: 2, label: '2 days before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '1 week before' },
];

export const GROUP_TYPES: { value: GroupType; label: string; icon: string; description: string }[] =
  [
    { value: 'family', label: 'Family', icon: 'heart', description: 'Bills, school runs, appointments' },
    { value: 'roommates', label: 'Roommates', icon: 'home', description: 'Rent, utilities, chores' },
    { value: 'team', label: 'Small team', icon: 'briefcase', description: 'Ops, vendors, renewals' },
  ];

/** Starter tasks offered during onboarding, per group type. */
export const TASK_TEMPLATES: Record<GroupType, TaskTemplate[]> = {
  family: [
    { title: 'Pay electricity bill', category: 'bills', priority: 'high', frequency: 'monthly', daysFromNow: 5 },
    { title: 'Weekly grocery run', category: 'groceries', priority: 'medium', frequency: 'weekly', daysFromNow: 2 },
    { title: 'Book gas cylinder', category: 'errands', priority: 'high', frequency: 'none', daysFromNow: 3 },
    { title: 'School fees', category: 'bills', priority: 'critical', frequency: 'quarterly', daysFromNow: 14 },
    { title: 'Car service', category: 'maintenance', priority: 'medium', frequency: 'yearly', daysFromNow: 30 },
    { title: 'Refill prescriptions', category: 'health', priority: 'high', frequency: 'monthly', daysFromNow: 7 },
  ],
  roommates: [
    { title: 'Pay rent', category: 'bills', priority: 'critical', frequency: 'monthly', daysFromNow: 7 },
    { title: 'Pay electricity bill', category: 'bills', priority: 'high', frequency: 'monthly', daysFromNow: 4 },
    { title: 'Pay internet bill', category: 'bills', priority: 'medium', frequency: 'monthly', daysFromNow: 10 },
    { title: 'Buy groceries', category: 'groceries', priority: 'medium', frequency: 'weekly', daysFromNow: 1 },
    { title: 'Take out the trash', category: 'household', priority: 'low', frequency: 'weekly', daysFromNow: 2 },
    { title: 'Clean the bathroom', category: 'household', priority: 'medium', frequency: 'biweekly', daysFromNow: 5 },
  ],
  team: [
    { title: 'Pay coworking rent', category: 'bills', priority: 'critical', frequency: 'monthly', daysFromNow: 6 },
    { title: 'Renew software subscriptions', category: 'bills', priority: 'high', frequency: 'yearly', daysFromNow: 20 },
    { title: 'Order office supplies', category: 'groceries', priority: 'low', frequency: 'biweekly', daysFromNow: 4 },
    { title: 'Send monthly invoices', category: 'other', priority: 'critical', frequency: 'monthly', daysFromNow: 3 },
    { title: 'Backup shared drive', category: 'maintenance', priority: 'medium', frequency: 'weekly', daysFromNow: 2 },
  ],
};

export function categoryMeta(c: TaskCategory) {
  return TASK_CATEGORIES.find((x) => x.value === c) ?? TASK_CATEGORIES[TASK_CATEGORIES.length - 1];
}

export function categoryLabel(c: TaskCategory): string {
  return categoryMeta(c).label;
}

export function categoryIcon(c: TaskCategory): string {
  return categoryMeta(c).icon;
}

export function categoryColor(c: TaskCategory): string {
  return categoryMeta(c).color;
}

export function priorityWeight(p: TaskPriority): number {
  return TASK_PRIORITIES.find((x) => x.value === p)?.weight ?? 1;
}

export function priorityLabel(p: TaskPriority): string {
  return TASK_PRIORITIES.find((x) => x.value === p)?.label ?? p;
}

export function recurrenceLabel(f: RecurrenceFrequency): string {
  return RECURRENCE_OPTIONS.find((x) => x.value === f)?.label ?? f;
}

export function groupTypeMeta(t: GroupType) {
  return GROUP_TYPES.find((x) => x.value === t) ?? GROUP_TYPES[0];
}
