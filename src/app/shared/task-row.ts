import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Task, categoryColor, categoryIcon, categoryLabel } from '../core/models';
import { DueLabelPipe } from '../core/pipes';
import { GroupService } from '../core/services/group.service';
import { OverlayService } from '../core/services/overlay.service';
import { TaskService } from '../core/services/task.service';
import { daysUntil } from '../core/utils/date.util';
import { AvatarComponent } from './avatar';
import { IconComponent } from './icon';

/** The chat-list style row from the reference design, reused for every task list. */
@Component({
  selector: 'app-task-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, IconComponent, DueLabelPipe],
  template: `
    <div class="list-row clickable" role="link" tabindex="0" (click)="open()" (keydown.enter)="open()">
      @if (task().status === 'done') {
        <span class="cat-circle sm done-circle"><app-icon [name]="task().skipped ? 'skip-forward' : 'check'" [size]="16" /></span>
      } @else if (owner(); as o) {
        <app-avatar [name]="o.name" [colorIndex]="o.colorIndex" [size]="42" />
      } @else {
        <app-avatar [unowned]="true" [size]="42" />
      }

      <div class="grow">
        <div class="row gap-sm">
          <span class="list-title truncate" [class.done-text]="task().status === 'done'">{{ task().title }}</span>
          @if (task().recurrence.frequency !== 'none') {
            <app-icon name="repeat" [size]="13" class="faint" />
          }
        </div>
        <div class="list-sub truncate">
          @if (task().status === 'done') {
            <span>{{ task().skipped ? 'Skipped' : 'Done' }}</span>
          } @else {
            <span [class.text-danger]="days() < 0" [class.text-warning]="days() === 0">{{ task().dueDate | dueLabel }}</span>
          }
          <span class="sep">·</span>
          <span [style.color]="catColor()">{{ catLabel() }}</span>
          @if (showOwner()) {
            <span class="sep">·</span>
            @if (owner(); as o) {
              <span>{{ o.name.split(' ')[0] }}</span>
            } @else {
              <span class="text-danger strong">No owner</span>
            }
          }
        </div>
      </div>

      <div class="right">
        @if (task().status !== 'done') {
          @if (task().ownerId === null) {
            <button class="btn btn-soft btn-sm" (click)="claim($event)" title="Claim this task">
              <app-icon name="hand" [size]="15" /> <span class="lbl">Claim</span>
            </button>
          }
          <button class="check" [class.hot]="task().priority === 'critical' || task().priority === 'high'" (click)="complete($event)" title="Mark as done">
            <app-icon name="check" [size]="16" />
          </button>
        } @else {
          <span class="dot success"></span>
        }
        @if (task().status !== 'done' && task().priority !== 'low' && task().priority !== 'medium') {
          <span class="dot" [class.danger]="task().priority === 'critical'" [class.warning]="task().priority === 'high'"></span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .sep {
        margin: 0 5px;
        opacity: 0.6;
      }
      .right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .check {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 2px solid var(--border-strong);
        color: transparent;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .check:hover {
        border-color: var(--success);
        background: var(--success-soft);
        color: var(--success);
      }
      .done-circle {
        --cat: var(--success);
      }
      .done-text {
        text-decoration: line-through;
        color: var(--text-3);
      }
      @media (max-width: 480px) {
        .btn-sm {
          width: 34px;
          padding: 0;
          border-radius: 50%;
        }
        .btn-sm .lbl {
          display: none;
        }
        .list-row {
          padding-inline: 12px;
          gap: 10px;
        }
      }
    `,
  ],
})
export class TaskRowComponent {
  private readonly router = inject(Router);
  private readonly tasks = inject(TaskService);
  private readonly group = inject(GroupService);
  private readonly overlay = inject(OverlayService);

  readonly task = input.required<Task>();
  readonly showOwner = input(true);

  readonly owner = computed(() => this.group.memberById(this.task().ownerId));
  readonly days = computed(() => daysUntil(this.task().dueDate));
  readonly catLabel = computed(() => categoryLabel(this.task().category));
  readonly catIcon = computed(() => categoryIcon(this.task().category));
  readonly catColor = computed(() => categoryColor(this.task().category));

  open(): void {
    this.router.navigate(['/tasks', this.task().id]);
  }

  complete(e: Event): void {
    e.stopPropagation();
    this.tasks.complete(this.task().id);
  }

  claim(e: Event): void {
    e.stopPropagation();
    this.tasks.claim(this.task().id);
  }

  assign(e: Event): void {
    e.stopPropagation();
    this.overlay.assign(this.task().id);
  }
}
