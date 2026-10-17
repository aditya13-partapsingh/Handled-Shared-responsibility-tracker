import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { categoryMeta } from '../../core/models';
import {
  CategoryLabelPipe,
  DueLabelPipe,
  MemberNamePipe,
  PriorityLabelPipe,
  RecurrenceLabelPipe,
  ShortDatePipe,
  TimeAgoPipe,
} from '../../core/pipes';
import { GroupService } from '../../core/services/group.service';
import { OverlayService } from '../../core/services/overlay.service';
import { TaskService } from '../../core/services/task.service';
import { daysUntil, formatDate, toIsoDate } from '../../core/utils/date.util';
import { missRate } from '../../core/utils/task.util';
import { AvatarComponent } from '../../shared/avatar';
import { HeroComponent } from '../../shared/hero';
import { IconComponent } from '../../shared/icon';
import { EmptyStateComponent } from '../../shared/widgets';
import { activityIcon, activityText } from '../home/home';

@Component({
  selector: 'app-task-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    HeroComponent,
    AvatarComponent,
    IconComponent,
    EmptyStateComponent,
    DueLabelPipe,
    ShortDatePipe,
    TimeAgoPipe,
    MemberNamePipe,
    CategoryLabelPipe,
    PriorityLabelPipe,
    RecurrenceLabelPipe,
  ],
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.scss',
})
export class TaskDetailComponent {
  readonly tasks = inject(TaskService);
  readonly group = inject(GroupService);
  readonly overlay = inject(OverlayService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  readonly task = computed(() => this.tasks.task(this.id()));
  readonly owner = computed(() => this.group.memberById(this.task()?.ownerId));
  readonly cat = computed(() => categoryMeta(this.task()?.category ?? 'other'));
  readonly days = computed(() => (this.task() ? daysUntil(this.task()!.dueDate) : 0));
  readonly isMine = computed(() => !!this.task()?.ownerId && this.task()!.ownerId === this.group.me()?.id);
  readonly history = computed(() => {
    const t = this.task();
    return t ? this.tasks.seriesHistory(t.seriesId).filter((x) => x.id !== t.id) : [];
  });
  readonly activity = computed(() => (this.task() ? this.tasks.activitiesFor(this.task()!.id) : []));
  readonly rate = computed(() => (this.task() ? missRate(this.task()!) : 0));
  readonly totalRuns = computed(() => {
    const t = this.task();
    return t ? t.completionCount + t.missedCount : 0;
  });
  readonly rotationNames = computed(() => {
    const t = this.task();
    if (!t) return [];
    const ids = t.recurrence.rotation.length ? t.recurrence.rotation : this.group.members().map((m) => m.id);
    return ids.map((id) => this.group.memberById(id)).filter((m) => !!m);
  });
  readonly suggestion = computed(() => this.tasks.suggestOwner());
  readonly completedLate = computed(() => {
    const t = this.task();
    return !!t?.completedAt && !t.skipped && toIsoDate(new Date(t.completedAt)) > t.dueDate;
  });

  text = activityText;
  icon = activityIcon;
  formatDate = formatDate;

  async remove(): Promise<void> {
    const t = this.task();
    if (!t) return;
    const ok = await this.overlay.confirm({
      title: 'Delete this task?',
      message: `"${t.title}" will be removed for everyone in the group. This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    this.tasks.remove(t.id);
    this.router.navigate(['/tasks']);
  }

  async skip(): Promise<void> {
    const t = this.task();
    if (!t) return;
    const ok = await this.overlay.confirm({
      title: 'Skip this occurrence?',
      message: 'It will count as missed for this series and the next occurrence will be scheduled.',
      confirmLabel: 'Skip',
    });
    if (ok) this.tasks.skip(t.id);
  }
}
