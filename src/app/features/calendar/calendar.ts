import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Task, categoryColor } from '../../core/models';
import { GroupService } from '../../core/services/group.service';
import { OverlayService } from '../../core/services/overlay.service';
import { TaskService } from '../../core/services/task.service';
import { addDays, addMonths, daysBetween, formatDate, parseIsoDate, startOfWeek, todayIso } from '../../core/utils/date.util';
import { HeroComponent } from '../../shared/hero';
import { IconComponent } from '../../shared/icon';
import { TaskRowComponent } from '../../shared/task-row';
import { EmptyStateComponent } from '../../shared/widgets';

interface Day {
  iso: string;
  num: number;
  inMonth: boolean;
  isToday: boolean;
  tasks: Task[];
  unowned: number;
  overdue: number;
}

@Component({
  selector: 'app-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeroComponent, IconComponent, TaskRowComponent, EmptyStateComponent],
  template: `
    <div class="page">
      <app-hero title="Calendar" [eyebrow]="group.activeGroup()?.name ?? ''">
        <div class="row between">
          <button class="hero-btn" (click)="shift(-1)" aria-label="Previous month"><app-icon name="chevron-left" /></button>
          <div class="text-center">
            <div class="strong month">{{ monthLabel() }}</div>
            <button class="today-btn" (click)="goToday()">Today</button>
          </div>
          <button class="hero-btn" (click)="shift(1)" aria-label="Next month"><app-icon name="chevron-right" /></button>
        </div>
      </app-hero>

      <div class="card cal mt">
        <div class="dow">
          @for (d of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; track d) {
            <span>{{ d }}</span>
          }
        </div>
        <div class="grid">
          @for (d of days(); track d.iso) {
            <button class="day" [class.out]="!d.inMonth" [class.today]="d.isToday" [class.selected]="d.iso === selected()" (click)="selected.set(d.iso)">
              <span class="num">{{ d.num }}</span>
              <span class="marks">
                @for (t of d.tasks.slice(0, 3); track t.id) {
                  <i [style.background]="t.status === 'done' ? 'var(--text-3)' : color(t)"></i>
                }
                @if (d.tasks.length > 3) {
                  <em class="tiny">+{{ d.tasks.length - 3 }}</em>
                }
              </span>
              @if (d.unowned > 0) {
                <span class="flag" title="Unowned"></span>
              }
            </button>
          }
        </div>
      </div>

      <section class="section">
        <div class="section-head">
          <h2>{{ selectedLabel() }}</h2>
          <button class="btn btn-soft btn-sm" (click)="overlay.newTask({ dueDate: selected() })"><app-icon name="plus" [size]="15" /> Add for this day</button>
        </div>
        <div class="list">
          @for (t of selectedTasks(); track t.id) {
            <app-task-row [task]="t" />
          } @empty {
            <app-empty-state icon="calendar" title="Nothing due this day" />
          }
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .month {
        font-size: 1.05rem;
      }
      .today-btn {
        font-size: 0.75rem;
        font-weight: 600;
        opacity: 0.85;
        text-decoration: underline;
        color: #fff;
      }
      .cal {
        padding: 12px;
      }
      .dow {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        text-align: center;
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--text-3);
        margin-bottom: 6px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
      }
      .day {
        position: relative;
        aspect-ratio: 1;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--text);
        transition: background 0.15s;
      }
      .day:hover {
        background: var(--surface-2);
      }
      .day.out {
        color: var(--text-3);
        opacity: 0.6;
      }
      .day.today .num {
        background: var(--primary);
        color: #fff;
        border-radius: 50%;
        width: 26px;
        height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .day.selected {
        background: var(--primary-soft);
        box-shadow: inset 0 0 0 2px var(--primary);
      }
      .marks {
        display: flex;
        gap: 3px;
        align-items: center;
        height: 8px;
      }
      .marks i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        display: inline-block;
      }
      .marks em {
        font-style: normal;
        font-size: 0.6rem;
        color: var(--text-3);
      }
      .flag {
        position: absolute;
        top: 9px;
        left: calc(50% + 11px);
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--danger);
      }
      @media (min-width: 720px) {
        .day {
          aspect-ratio: auto;
          height: 64px;
        }
      }
    `,
  ],
})
export class CalendarComponent {
  readonly tasks = inject(TaskService);
  readonly group = inject(GroupService);
  readonly overlay = inject(OverlayService);

  readonly month = signal(todayIso().slice(0, 7) + '-01');
  readonly selected = signal(todayIso());

  readonly monthLabel = computed(() =>
    parseIsoDate(this.month()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );

  readonly byDay = computed(() => {
    const map = new Map<string, Task[]>();
    for (const t of this.tasks.all()) {
      if (!map.has(t.dueDate)) map.set(t.dueDate, []);
      map.get(t.dueDate)!.push(t);
    }
    return map;
  });

  readonly days = computed<Day[]>(() => {
    const first = this.month();
    const start = startOfWeek(first);
    const today = todayIso();
    const lastDay = addDays(addMonths(first, 1), -1);
    const count = daysBetween(start, addDays(startOfWeek(lastDay), 6)) + 1;
    const out: Day[] = [];
    for (let i = 0; i < count; i++) {
      const iso = addDays(start, i);
      const list = (this.byDay().get(iso) ?? []).slice().sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0));
      out.push({
        iso,
        num: Number(iso.slice(8, 10)),
        inMonth: iso.slice(0, 7) === first.slice(0, 7),
        isToday: iso === today,
        tasks: list,
        unowned: list.filter((t) => t.status !== 'done' && t.ownerId === null).length,
        overdue: iso < today ? list.filter((t) => t.status !== 'done').length : 0,
      });
    }
    return out;
  });

  readonly selectedTasks = computed(() => this.byDay().get(this.selected()) ?? []);
  readonly selectedLabel = computed(() => {
    const s = this.selected();
    const today = todayIso();
    if (s === today) return 'Today';
    if (s === addDays(today, 1)) return 'Tomorrow';
    if (s === addDays(today, -1)) return 'Yesterday';
    return formatDate(s, true);
  });

  color(t: Task): string {
    return categoryColor(t.category);
  }

  shift(n: number): void {
    this.month.set(addMonths(this.month(), n));
  }

  goToday(): void {
    this.month.set(todayIso().slice(0, 7) + '-01');
    this.selected.set(todayIso());
  }
}
