# Handled

A shared space for families, roommates and small teams where every responsibility — paying the
electricity bill, booking gas, buying groceries, calling the plumber, paying rent — has a clear
**owner**, **deadline** and **status**.

Its signature feature is **"No Owner" detection**: important tasks that nobody has claimed are
flagged on the dashboard, in reminders and on the calendar until someone takes them, so nothing is
lost because everyone assumed someone else would handle it.

> Frontend only. There is no backend — all data (accounts, groups, tasks, activity) is stored in the
> browser's `localStorage`. Built with Angular 22 (standalone components, signals, zoneless).

## Run it

```bash
npm install
npm start          # → http://localhost:4200
```

Sign in with the demo account (**adam@handled.app** / **demo1234**) or press
**"Try the demo household"** on the sign-in page. You can also create your own account and set up a
new group from scratch.

Production build: `npm run build` (output in `dist/handled`).

## Features

- **Dashboard** – greeting header, No-Owner / Overdue / Due-today / Done-this-week tiles, the
  "Needs an owner" alert list with one-click *Claim*, *Assign* and *Auto-assign all* (balances by
  weighted workload), today & upcoming lists, workload overview, "keeps slipping" tasks and activity.
- **Tasks** – filters (Open / Mine / No owner / Overdue / Today / Done), category row, search,
  sorting, grouping by time horizon. Task detail with claim / assign / start / done / skip / reopen /
  edit / delete, track record (on-time / late / missed), previous occurrences and activity.
- **Recurring tasks** – daily → yearly cadence, optional **owner rotation**; completing or skipping
  an occurrence automatically schedules the next one and hands it to the next person.
- **Reminders** – derived from due dates, reminder lead time, overdue state and unowned important
  tasks; badge count in the navigation.
- **Calendar** – month view with category dots and unowned markers, per-day task list.
- **Members** – workload bars, on-time rates, add / edit / remove members (their tasks become
  unowned, never lost), invite codes to join a group from another account.
- **Insights** – workload balance, "share recurring work" rebalance proposals (one-click apply),
  frequently missed tasks with suggestions, weekly completion chart, category breakdown.
- **Multiple groups** – switch between a household and a team; create or join via invite code.
- **Settings** – profile, password, group name/type, invite code, dark / light / system theme,
  JSON export & import, reset to demo data.

## Project layout

```
src/app
├── core/          models, utilities (dates, task rules, seed data), services, guards, pipes
├── shared/        icon set, avatar, task row, hero header, stat cards, sheet/modal, toasts
├── layout/        app shell (sidebar + bottom tab bar), task editor, assign & confirm dialogs
└── features/      auth, onboarding, home, tasks, calendar, members, insights, activity, settings
```
