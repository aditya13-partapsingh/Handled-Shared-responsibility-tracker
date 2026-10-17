import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TASK_CATEGORIES, Task, TaskCategory } from '../../core/models';
import { GroupService } from '../../core/services/group.service';
import { OverlayService } from '../../core/services/overlay.service';
import { TaskService } from '../../core/services/task.service';
import { daysUntil } from '../../core/utils/date.util';
import { HeroComponent } from '../../shared/hero';
import { IconComponent } from '../../shared/icon';
import { TaskRowComponent } from '../../shared/task-row';
import { EmptyStateComponent, SegOption, SegmentedComponent } from '../../shared/widgets';

type Filter = 'open' | 'mine' | 'unowned' | 'overdue' | 'today' | 'done';
type Sort = 'urgency' | 'due' | 'priority' | 'title';

interface Bucket {
  key: string;
  label: string;
  tasks: Task[];
}

@Component({
  selector: 'app-tasks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, HeroComponent, SegmentedComponent, TaskRowComponent, EmptyStateComponent, IconComponent],
  template: `
    <div class="page">
      <app-hero title="Tasks" [eyebrow]="group.activeGroup()?.name ?? ''">
        <app-segmented [options]="filters()" [value]="activeFilter()" (valueChange)="setFilter($event)" [onHero]="true" />
        <div class="cat-row">
          <button class="cat-btn" [class.active]="!category()" (click)="setCategory(null)">
            <span class="cat-circle" style="--cat: #fff"><app-icon name="grid" [size]="20" /></span>
            <span>All</span>
          </button>
          @for (c of categories; track c.value) {
            <button class="cat-btn" [class.active]="category() === c.value" (click)="setCategory(c.value)">
              <span class="cat-circle" [style.--cat]="c.color"><app-icon [name]="c.icon" [size]="20" /></span>
              <span>{{ c.label }}</span>
            </button>
          }
        </div>
      </app-hero>

      <div class="toolbar">
        <div class="input-wrap grow">
          <app-icon name="search" [size]="18" />
          <input class="input" placeholder="Search tasks..." [ngModel]="query()" (ngModelChange)="query.set($event)" />
        </div>
        <select class="select sort" [ngModel]="sort()" (ngModelChange)="sort.set($event)" aria-label="Sort">
          <option value="urgency">Most urgent</option>
          <option value="due">Due date</option>
          <option value="priority">Priority</option>
          <option value="title">Title</option>
        </select>
      </div>

      @if (activeFilter() === 'unowned' && filtered().length > 0) {
        <div class="alert warning mb">
          <app-icon name="help-circle" class="text-warning" />
          <div class="small grow">
            <div class="alert-title">{{ filtered().length }} task{{ filtered().length === 1 ? '' : 's' }} with nobody responsible</div>
            Hand them out fairly based on who has the lightest load right now.
          </div>
          <button class="btn btn-sm btn-primary" (click)="tasks.autoAssignUnowned()"><app-icon name="sparkles" [size]="15" /> Auto-assign</button>
        </div>
      }

      @for (b of buckets(); track b.key) {
        <section class="section">
          <div class="section-head">
            <h2 class="small-h">{{ b.label }} <span class="faint">{{ b.tasks.length }}</span></h2>
          </div>
          <div class="list">
            @for (t of b.tasks; track t.id) {
              <app-task-row [task]="t" />
            }
          </div>
        </section>
      } @empty {
        <div class="list mt">
          <app-empty-state [icon]="activeFilter() === 'done' ? 'check-circle' : 'inbox'" [title]="emptyTitle()" [message]="emptyMessage()">
            @if (activeFilter() !== 'done') {
              <button class="btn btn-primary btn-sm mt-sm" (click)="overlay.newTask({ category: category() ?? 'household' })">
                <app-icon name="plus" [size]="15" /> New task
              </button>
            }
          </app-empty-state>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .cat-row {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        margin-top: 16px;
        padding-bottom: 4px;
        scrollbar-width: none;
      }
      .cat-row::-webkit-scrollbar {
        display: none;
      }
      .cat-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        min-width: 66px;
        padding: 6px 4px;
        border-radius: 14px;
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.72rem;
        font-weight: 600;
        transition: all 0.15s;
      }
      .cat-btn .cat-circle {
        background: rgba(255, 255, 255, 0.16);
        border: 2px solid transparent;
        color: #fff;
      }
      .cat-btn.active {
        color: #fff;
      }
      .cat-btn.active .cat-circle {
        background: #fff;
        color: var(--cat);
        border-color: #fff;
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.2);
      }
      .cat-btn.active .cat-circle[style*='#fff'] {
        color: var(--primary-strong);
      }
      .toolbar {
        display: flex;
        gap: 10px;
        margin-top: 18px;
      }
      .sort {
        width: 160px;
        flex-shrink: 0;
      }
      .small-h {
        font-size: 0.95rem;
      }
      .alert .btn {
        flex-shrink: 0;
      }
      @media (max-width: 520px) {
        .sort {
          width: 130px;
        }
      }
    `,
  ],
})
export class TasksComponent {
  readonly tasks = inject(TaskService);
  readonly group = inject(GroupService);
  readonly overlay = inject(OverlayService);
  private readonly router = inject(Router);

  /** Bound from query params via withComponentInputBinding. */
  readonly filter = input<Filter>('open');
  readonly category = input<TaskCategory | null | undefined>(null);

  readonly activeFilter = computed<Filter>(() => this.filter() ?? 'open');

  readonly categories = TASK_CATEGORIES;
  readonly query = signal('');
  readonly sort = signal<Sort>('urgency');

  readonly filters = computed<SegOption[]>(() => [
    { value: 'open', label: 'Open', count: this.tasks.open().length },
    { value: 'mine', label: 'Mine', count: this.tasks.mine().length },
    { value: 'unowned', label: 'No owner', count: this.tasks.unowned().length },
    { value: 'overdue', label: 'Overdue', count: this.tasks.overdue().length },
    { value: 'today', label: 'Today', count: this.tasks.dueToday().length },
    { value: 'done', label: 'Done', count: this.tasks.done().length },
  ]);

  readonly filtered = computed<Task[]>(() => {
    let list: Task[];
    switch (this.activeFilter()) {
      case 'mine':
        list = this.tasks.mine();
        break;
      case 'unowned':
        list = this.tasks.unowned();
        break;
      case 'overdue':
        list = this.tasks.overdue();
        break;
      case 'today':
        list = [...this.tasks.overdue(), ...this.tasks.dueToday()];
        break;
      case 'done':
        list = this.tasks.done();
        break;
      default:
        list = this.tasks.open();
    }
    const cat = this.category();
    if (cat) list = list.filter((t) => t.category === cat);
    const q = this.query().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          this.group.memberName(t.ownerId).toLowerCase().includes(q),
      );
    }
    const weight = { critical: 4, high: 3, medium: 2, low: 1 };
    switch (this.sort()) {
      case 'due':
        return [...list].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      case 'priority':
        return [...list].sort((a, b) => weight[b.priority] - weight[a.priority] || a.dueDate.localeCompare(b.dueDate));
      case 'title':
        return [...list].sort((a, b) => a.title.localeCompare(b.title));
      default:
        return list;
    }
  });

  /** Group by time horizon (open lists) or completion month (done). */
  readonly buckets = computed<Bucket[]>(() => {
    const list = this.filtered();
    if (list.length === 0) return [];
    if (this.activeFilter() === 'done') {
      return [{ key: 'done', label: 'Completed', tasks: list }];
    }
    if (this.sort() !== 'urgency' && this.sort() !== 'due') {
      return [{ key: 'all', label: 'Tasks', tasks: list }];
    }
    const groups: Record<string, Bucket> = {
      overdue: { key: 'overdue', label: 'Overdue', tasks: [] },
      today: { key: 'today', label: 'Today', tasks: [] },
      tomorrow: { key: 'tomorrow', label: 'Tomorrow', tasks: [] },
      week: { key: 'week', label: 'This week', tasks: [] },
      later: { key: 'later', label: 'Later', tasks: [] },
    };
    for (const t of list) {
      const d = daysUntil(t.dueDate);
      const k = d < 0 ? 'overdue' : d === 0 ? 'today' : d === 1 ? 'tomorrow' : d <= 7 ? 'week' : 'later';
      groups[k].tasks.push(t);
    }
    return Object.values(groups).filter((b) => b.tasks.length > 0);
  });

  readonly emptyTitle = computed(() => {
    if (this.query()) return 'No matches';
    switch (this.activeFilter()) {
      case 'unowned':
        return 'Every task has an owner';
      case 'overdue':
        return 'Nothing is overdue';
      case 'today':
        return 'Nothing due today';
      case 'mine':
        return 'Nothing on your plate';
      case 'done':
        return 'Nothing completed yet';
      default:
        return 'No open tasks';
    }
  });

  readonly emptyMessage = computed(() =>
    this.query() ? 'Try a different search.' : this.category() ? 'Try clearing the category filter.' : '',
  );

  setFilter(value: string): void {
    this.navigate({ filter: value === 'open' ? null : value });
  }

  setCategory(value: string | null): void {
    this.navigate({ category: value });
  }

  private navigate(params: Record<string, string | null>): void {
    this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }
}
