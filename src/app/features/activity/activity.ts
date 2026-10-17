import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Activity, Reminder } from '../../core/models';
import { MemberNamePipe, TimeAgoPipe } from '../../core/pipes';
import { GroupService } from '../../core/services/group.service';
import { OverlayService } from '../../core/services/overlay.service';
import { TaskService } from '../../core/services/task.service';
import { formatDate, todayIso, toIsoDate, addDays } from '../../core/utils/date.util';
import { AvatarComponent } from '../../shared/avatar';
import { HeroComponent } from '../../shared/hero';
import { IconComponent } from '../../shared/icon';
import { EmptyStateComponent, SegmentedComponent } from '../../shared/widgets';
import { activityIcon, activityText } from '../home/home';

interface DayGroup {
  day: string;
  label: string;
  items: Activity[];
}

@Component({
  selector: 'app-activity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HeroComponent, AvatarComponent, IconComponent, EmptyStateComponent, SegmentedComponent, TimeAgoPipe, MemberNamePipe],
  template: `
    <div class="page">
      <app-hero title="Activity" eyebrow="Reminders & history" [showBell]="false">
        <app-segmented
          [options]="[
            { value: 'reminders', label: 'Reminders', count: tasks.reminderCount() },
            { value: 'feed', label: 'Feed', count: group.activities().length }
          ]"
          [value]="tab()"
          (valueChange)="tab.set($event)"
          [onHero]="true"
        />
      </app-hero>

      @if (tab() === 'reminders') {
        <div class="section">
          @if (tasks.reminders().length > 0) {
            <div class="section-head">
              <h2>Needs attention</h2>
              @if (tasks.unownedImportant().length > 0) {
                <button class="btn btn-soft btn-sm" (click)="tasks.autoAssignUnowned(true)"><app-icon name="sparkles" [size]="15" /> Assign unowned</button>
              }
            </div>
          }
          <div class="list">
            @for (r of tasks.reminders(); track r.key) {
              <a class="list-row clickable" [routerLink]="['/tasks', r.task.id]">
                <span class="cat-circle sm" [style.--cat]="tone(r)"><app-icon [name]="iconFor(r)" [size]="18" /></span>
                <div class="grow">
                  <div class="row gap-sm">
                    <span class="list-title truncate">{{ r.title }}</span>
                    <span class="badge" [class.badge-danger]="r.kind === 'overdue'" [class.badge-warning]="r.kind === 'no_owner'" [class.badge-primary]="r.kind === 'due_soon'">{{ label(r) }}</span>
                  </div>
                  <div class="list-sub">{{ r.message }}</div>
                </div>
                @if (r.kind === 'no_owner') {
                  <button class="btn btn-soft btn-sm" (click)="claim($event, r)"><app-icon name="hand" [size]="14" /> Claim</button>
                } @else {
                  <button class="btn btn-ghost btn-icon" (click)="done($event, r)" title="Mark done"><app-icon name="check" [size]="18" /></button>
                }
              </a>
            } @empty {
              <app-empty-state icon="bell" title="You're all caught up" message="Reminders appear here when a task is overdue, due soon, or important with no owner." />
            }
          </div>
        </div>
      } @else {
        @for (g of feed(); track g.day) {
          <div class="section">
            <div class="section-head"><h2 class="small-h">{{ g.label }}</h2></div>
            <div class="list">
              @for (a of g.items; track a.id) {
                <div class="list-row">
                  @if (group.memberById(a.actorId); as m) {
                    <app-avatar [name]="m.name" [colorIndex]="m.colorIndex" [size]="38" />
                  } @else {
                    <app-avatar name="?" [size]="38" />
                  }
                  <div class="grow small">
                    <span class="strong">{{ a.actorId | memberName }}</span>
                    {{ text(a) }}
                    @if (a.taskId) {
                      <a class="strong text-primary" [routerLink]="['/tasks', a.taskId]">{{ a.taskTitle }}</a>
                    }
                    <div class="tiny faint">{{ a.at | timeAgo }}</div>
                  </div>
                  <span class="act-icon"><app-icon [name]="icon(a)" [size]="14" /></span>
                </div>
              }
            </div>
          </div>
        } @empty {
          <div class="list mt"><app-empty-state icon="activity" title="No activity yet" message="Create, assign and complete tasks to build a history." /></div>
        }
      }
    </div>
  `,
  styles: [
    `
      .small-h {
        font-size: 0.95rem;
      }
      .act-icon {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--surface-2);
        color: var(--text-3);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
    `,
  ],
})
export class ActivityComponent {
  readonly tasks = inject(TaskService);
  readonly group = inject(GroupService);
  readonly overlay = inject(OverlayService);

  readonly tab = signal<string>('reminders');
  readonly feed = computed<DayGroup[]>(() => {
    const today = todayIso();
    const yesterday = addDays(today, -1);
    const groups = new Map<string, DayGroup>();
    for (const a of this.group.activities()) {
      const day = toIsoDate(new Date(a.at));
      if (!groups.has(day)) {
        groups.set(day, {
          day,
          label: day === today ? 'Today' : day === yesterday ? 'Yesterday' : formatDate(day, true),
          items: [],
        });
      }
      groups.get(day)!.items.push(a);
    }
    return [...groups.values()];
  });

  text = activityText;
  icon = activityIcon;

  label(r: Reminder): string {
    return r.kind === 'overdue' ? 'Overdue' : r.kind === 'no_owner' ? 'No owner' : 'Due soon';
  }
  iconFor(r: Reminder): string {
    return r.kind === 'overdue' ? 'alert-circle' : r.kind === 'no_owner' ? 'help-circle' : 'clock';
  }
  tone(r: Reminder): string {
    return r.kind === 'overdue' ? 'var(--danger)' : r.kind === 'no_owner' ? 'var(--warning)' : 'var(--primary)';
  }

  claim(e: Event, r: Reminder): void {
    e.preventDefault();
    e.stopPropagation();
    this.tasks.claim(r.task.id);
  }

  done(e: Event, r: Reminder): void {
    e.preventDefault();
    e.stopPropagation();
    this.tasks.complete(r.task.id);
  }
}
