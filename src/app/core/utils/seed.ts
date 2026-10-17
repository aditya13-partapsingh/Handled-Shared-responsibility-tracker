import {
  Account,
  Activity,
  ActivityType,
  Group,
  Member,
  Recurrence,
  RecurrenceFrequency,
  Task,
  TaskCategory,
  TaskPriority,
} from '../models';
import { addDays, todayIso } from './date.util';

export interface SeedData {
  accounts: Account[];
  groups: Group[];
  members: Member[];
  tasks: Task[];
  activities: Activity[];
}

export const DEMO_EMAIL = 'adam@handled.app';
export const DEMO_PASSWORD = 'demo1234';

const NO_REPEAT: Recurrence = { frequency: 'none', rotateOwners: false, rotation: [] };

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

function daysAgoTs(d: number, hour = 10): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(hour, 0, 0, 0);
  return dt.toISOString();
}

interface TaskSpec {
  id: string;
  seriesId?: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  owner: string | null;
  due: number; // days from today
  frequency?: RecurrenceFrequency;
  rotate?: boolean;
  rotation?: string[];
  reminder?: number | null;
  done?: { daysAgo: number; by: string; skipped?: boolean };
  counts?: [number, number, number]; // completion, late, missed
  createdBy?: string;
}

function task(groupId: string, today: string, s: TaskSpec): Task {
  const [completionCount, lateCount, missedCount] = s.counts ?? [0, 0, 0];
  return {
    id: s.id,
    groupId,
    seriesId: s.seriesId ?? `series_${s.id}`,
    title: s.title,
    description: s.description ?? '',
    category: s.category,
    priority: s.priority,
    status: s.done ? 'done' : 'open',
    ownerId: s.owner,
    dueDate: addDays(today, s.due),
    recurrence: {
      frequency: s.frequency ?? 'none',
      rotateOwners: s.rotate ?? false,
      rotation: s.rotation ?? [],
    },
    reminderDaysBefore: s.reminder === undefined ? 2 : s.reminder,
    createdAt: daysAgoTs(Math.max(3, -s.due + 10)),
    createdBy: s.createdBy ?? 'm_adam',
    completedAt: s.done ? daysAgoTs(s.done.daysAgo, 18) : null,
    completedBy: s.done ? s.done.by : null,
    skipped: s.done?.skipped ?? false,
    completionCount,
    lateCount,
    missedCount,
  };
}

function activity(
  groupId: string,
  id: string,
  type: ActivityType,
  actorId: string,
  at: string,
  taskId: string | null,
  taskTitle: string | null,
  detail: string | null = null,
): Activity {
  return { id, groupId, type, actorId, taskId, taskTitle, detail, at };
}

/** Builds the demo dataset relative to `today` so the overdue/due-soon mix always makes sense. */
export function buildSeed(today = todayIso()): SeedData {
  const accounts: Account[] = [
    {
      id: 'acc_adam',
      name: 'Adam Smith',
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      colorIndex: 0,
      createdAt: daysAgoTs(120),
    },
  ];

  const HOUSE = 'grp_house';
  const STUDIO = 'grp_studio';

  const groups: Group[] = [
    {
      id: HOUSE,
      name: 'Maple Street House',
      type: 'roommates',
      inviteCode: 'MAPLE-2026',
      createdAt: daysAgoTs(120),
      createdBy: 'acc_adam',
    },
    {
      id: STUDIO,
      name: 'Northwind Studio',
      type: 'team',
      inviteCode: 'NWIND-77',
      createdAt: daysAgoTs(60),
      createdBy: 'acc_adam',
    },
  ];

  const members: Member[] = [
    { id: 'm_adam', groupId: HOUSE, accountId: 'acc_adam', name: 'Adam Smith', email: DEMO_EMAIL, role: 'admin', colorIndex: 0, joinedAt: daysAgoTs(120) },
    { id: 'm_tamara', groupId: HOUSE, accountId: null, name: 'Tamara Reed', email: 'tamara@example.com', role: 'member', colorIndex: 5, joinedAt: daysAgoTs(118) },
    { id: 'm_johnny', groupId: HOUSE, accountId: null, name: 'Johnny Lee', email: 'johnny@example.com', role: 'member', colorIndex: 2, joinedAt: daysAgoTs(110) },
    { id: 'm_sam', groupId: HOUSE, accountId: null, name: 'Samantha James', email: 'samantha@example.com', role: 'member', colorIndex: 3, joinedAt: daysAgoTs(95) },
    { id: 'm_adam2', groupId: STUDIO, accountId: 'acc_adam', name: 'Adam Smith', email: DEMO_EMAIL, role: 'admin', colorIndex: 0, joinedAt: daysAgoTs(60) },
    { id: 'm_cat', groupId: STUDIO, accountId: null, name: 'Catherine Hale', email: 'catherine@northwind.io', role: 'admin', colorIndex: 1, joinedAt: daysAgoTs(60) },
    { id: 'm_mike', groupId: STUDIO, accountId: null, name: 'Mike Reynolds', email: 'mike@northwind.io', role: 'member', colorIndex: 6, joinedAt: daysAgoTs(58) },
    { id: 'm_priya', groupId: STUDIO, accountId: null, name: 'Priya Nair', email: 'priya@northwind.io', role: 'member', colorIndex: 4, joinedAt: daysAgoTs(40) },
  ];

  const houseRotation = ['m_adam', 'm_tamara', 'm_johnny', 'm_sam'];

  const houseTasks: TaskSpec[] = [
    { id: 't_elec', seriesId: 's_elec', title: 'Pay electricity bill', description: 'Due on the 15th every month. Pay through the utility portal and drop the receipt in the shared folder.', category: 'bills', priority: 'high', owner: null, due: 2, frequency: 'monthly', reminder: 3, counts: [7, 1, 0] },
    { id: 't_rent', seriesId: 's_rent', title: 'Pay rent', description: 'Transfer to landlord. Everyone sends their share to Adam by the 3rd.', category: 'bills', priority: 'critical', owner: 'm_adam', due: 5, frequency: 'monthly', reminder: 3, counts: [6, 1, 0] },
    { id: 't_gas', title: 'Book gas cylinder', description: 'The spare is already in use – book a refill before it runs out.', category: 'errands', priority: 'high', owner: null, due: -1, reminder: 1 },
    { id: 't_groc', seriesId: 's_groc', title: 'Buy groceries', description: 'Weekly run. Check the shared shopping list first.', category: 'groceries', priority: 'medium', owner: 'm_tamara', due: 0, frequency: 'weekly', rotate: true, rotation: houseRotation, reminder: 1, counts: [12, 3, 3] },
    { id: 't_plumb', title: 'Call the plumber about the kitchen sink', description: 'Sink drains slowly. Ask for a quote before booking.', category: 'maintenance', priority: 'high', owner: 'm_johnny', due: -3, reminder: 1 },
    { id: 't_return', title: 'Return the running shoes order', description: 'Return window closes in 4 days. Use the QR code in the email.', category: 'errands', priority: 'medium', owner: 'm_sam', due: 1 },
    { id: 't_net', seriesId: 's_net', title: 'Pay internet bill', category: 'bills', priority: 'medium', owner: 'm_johnny', due: 9, frequency: 'monthly', reminder: 2, counts: [8, 0, 0] },
    { id: 't_recyc', seriesId: 's_recyc', title: 'Take out recycling', category: 'household', priority: 'low', owner: 'm_adam', due: 1, frequency: 'weekly', rotate: true, rotation: houseRotation, reminder: 0, counts: [20, 2, 0] },
    { id: 't_bath', seriesId: 's_bath', title: 'Clean the bathroom', description: 'Supplies are under the sink.', category: 'household', priority: 'medium', owner: null, due: 4, frequency: 'biweekly', rotate: true, rotation: houseRotation, reminder: 1, counts: [5, 3, 2] },
    { id: 't_water', seriesId: 's_water', title: 'Pay water bill', category: 'bills', priority: 'medium', owner: 'm_sam', due: 12, frequency: 'quarterly', reminder: 3, counts: [3, 0, 0] },
    { id: 't_ins', seriesId: 's_ins', title: 'Renew renters insurance', description: 'Policy expires at the end of the month. Compare at least one other quote.', category: 'other', priority: 'high', owner: null, due: 20, frequency: 'yearly', reminder: 7, counts: [1, 0, 0] },
    { id: 't_dent', title: 'Dentist appointment', category: 'health', priority: 'low', owner: 'm_johnny', due: 7, reminder: 1 },
    { id: 't_chair', title: 'Fix the wobbly dining chair', category: 'maintenance', priority: 'low', owner: null, due: 14, reminder: null },
    { id: 't_gift', title: "Buy Tamara's birthday gift", description: 'Group gift – budget is 40 each.', category: 'other', priority: 'medium', owner: 'm_sam', due: 3, reminder: 2, createdBy: 'm_johnny' },
    // History
    { id: 't_elec_prev', seriesId: 's_elec', title: 'Pay electricity bill', category: 'bills', priority: 'high', owner: 'm_tamara', due: -28, frequency: 'monthly', reminder: 3, done: { daysAgo: 28, by: 'm_tamara' }, counts: [6, 1, 0] },
    { id: 't_groc_prev', seriesId: 's_groc', title: 'Buy groceries', category: 'groceries', priority: 'medium', owner: 'm_adam', due: -7, frequency: 'weekly', rotate: true, rotation: houseRotation, done: { daysAgo: 6, by: 'm_adam' }, counts: [11, 2, 3] },
    { id: 't_vac', title: 'Vacuum the living room', category: 'household', priority: 'low', owner: 'm_johnny', due: -2, done: { daysAgo: 2, by: 'm_johnny' } },
    { id: 't_rent_prev', seriesId: 's_rent', title: 'Pay rent', category: 'bills', priority: 'critical', owner: 'm_adam', due: -26, frequency: 'monthly', done: { daysAgo: 27, by: 'm_adam' }, counts: [5, 1, 0] },
    { id: 't_bath_prev', seriesId: 's_bath', title: 'Clean the bathroom', category: 'household', priority: 'medium', owner: 'm_sam', due: -10, frequency: 'biweekly', rotate: true, rotation: houseRotation, done: { daysAgo: 8, by: 'm_sam', skipped: true }, counts: [5, 3, 1] },
    { id: 't_filter', title: 'Replace the AC filter', category: 'maintenance', priority: 'medium', owner: 'm_sam', due: -1, done: { daysAgo: 1, by: 'm_sam' } },
    { id: 't_lamp', title: 'Buy a new hallway bulb', category: 'errands', priority: 'low', owner: 'm_tamara', due: -4, done: { daysAgo: 4, by: 'm_tamara' } },
  ];

  const studioTasks: TaskSpec[] = [
    { id: 't_figma', seriesId: 's_figma', title: 'Renew Figma subscription', description: 'Annual plan – the card on file expired.', category: 'bills', priority: 'high', owner: null, due: 3, frequency: 'yearly', reminder: 7, counts: [1, 0, 0], createdBy: 'm_cat' },
    { id: 't_invoice', seriesId: 's_invoice', title: 'Send invoice to Acme Corp', category: 'other', priority: 'critical', owner: 'm_cat', due: 0, frequency: 'monthly', reminder: 2, counts: [4, 1, 0], createdBy: 'm_cat' },
    { id: 't_snacks', seriesId: 's_snacks', title: 'Order office snacks', category: 'groceries', priority: 'low', owner: 'm_mike', due: 6, frequency: 'biweekly', rotate: true, rotation: ['m_mike', 'm_priya', 'm_adam2'], reminder: 1, counts: [6, 0, 1], createdBy: 'm_adam2' },
    { id: 't_cowork', seriesId: 's_cowork', title: 'Pay coworking rent', category: 'bills', priority: 'critical', owner: 'm_adam2', due: 8, frequency: 'monthly', reminder: 3, counts: [2, 0, 0], createdBy: 'm_adam2' },
    { id: 't_vertex', title: 'Book kickoff call with Vertex', category: 'other', priority: 'medium', owner: null, due: -2, reminder: 1, createdBy: 'm_priya' },
    { id: 't_tax', title: 'Submit quarterly tax filing', category: 'bills', priority: 'critical', owner: 'm_priya', due: -10, done: { daysAgo: 10, by: 'm_priya' }, createdBy: 'm_cat' },
  ];

  const tasks = [
    ...houseTasks.map((s) => task(HOUSE, today, s)),
    ...studioTasks.map((s) => task(STUDIO, today, s)),
  ];

  const activities: Activity[] = [
    activity(HOUSE, 'a1', 'completed', 'm_sam', hoursAgo(3), 't_filter', 'Replace the AC filter'),
    activity(HOUSE, 'a2', 'created', 'm_johnny', hoursAgo(5), 't_gift', "Buy Tamara's birthday gift"),
    activity(HOUSE, 'a3', 'assigned', 'm_johnny', hoursAgo(5), 't_gift', "Buy Tamara's birthday gift", 'Samantha James'),
    activity(HOUSE, 'a4', 'unassigned', 'm_tamara', hoursAgo(20), 't_elec', 'Pay electricity bill', 'Tamara Reed'),
    activity(HOUSE, 'a5', 'completed', 'm_johnny', hoursAgo(41), 't_vac', 'Vacuum the living room'),
    activity(HOUSE, 'a6', 'created', 'm_adam', hoursAgo(50), 't_gas', 'Book gas cylinder'),
    activity(HOUSE, 'a7', 'completed', 'm_tamara', hoursAgo(96), 't_lamp', 'Buy a new hallway bulb'),
    activity(HOUSE, 'a8', 'completed', 'm_adam', hoursAgo(140), 't_groc_prev', 'Buy groceries'),
    activity(HOUSE, 'a9', 'auto_assigned', 'm_adam', hoursAgo(140), 't_groc', 'Buy groceries', 'Tamara Reed'),
    activity(HOUSE, 'a10', 'skipped', 'm_sam', hoursAgo(190), 't_bath_prev', 'Clean the bathroom'),
    activity(HOUSE, 'a11', 'member_added', 'm_adam', daysAgoTs(95), null, null, 'Samantha James'),
    activity(HOUSE, 'a12', 'group_created', 'm_adam', daysAgoTs(120), null, null, 'Maple Street House'),
    activity(STUDIO, 'b1', 'created', 'm_cat', hoursAgo(8), 't_figma', 'Renew Figma subscription'),
    activity(STUDIO, 'b2', 'completed', 'm_priya', daysAgoTs(10), 't_tax', 'Submit quarterly tax filing'),
    activity(STUDIO, 'b3', 'created', 'm_priya', hoursAgo(70), 't_vertex', 'Book kickoff call with Vertex'),
    activity(STUDIO, 'b4', 'group_created', 'm_adam2', daysAgoTs(60), null, null, 'Northwind Studio'),
  ];

  return { accounts, groups, members, tasks, activities };
}
