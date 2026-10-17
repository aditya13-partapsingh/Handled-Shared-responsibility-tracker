import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Activity } from '../../core/models';
import { MemberNamePipe, TimeAgoPipe } from '../../core/pipes';
import { GroupService } from '../../core/services/group.service';
import { InsightsService } from '../../core/services/insights.service';
import { OverlayService } from '../../core/services/overlay.service';
import { TaskService } from '../../core/services/task.service';
import { AvatarComponent } from '../../shared/avatar';
import { HeroComponent } from '../../shared/hero';
import { IconComponent } from '../../shared/icon';
import { TaskRowComponent } from '../../shared/task-row';
import { BarComponent, EmptyStateComponent, StatCardComponent } from '../../shared/widgets';

export function activityText(a: Activity): string {
  switch (a.type) {
    case 'created':
      return 'created';
    case 'updated':
      return a.detail ? a.detail.toLowerCase() + ' on' : 'updated';
    case 'assigned':
      return `assigned ${a.detail} to`;
    case 'auto_assigned':
      return `auto-assigned ${a.detail} to`;
    case 'unassigned':
      return `removed ${a.detail} as owner of`;
    case 'claimed':
      return 'claimed';
    case 'completed':
      return a.detail ? 'completed (late)' : 'completed';
    case 'reopened':
      return 'reopened';
    case 'skipped':
      return 'skipped';
    case 'deleted':
      return 'deleted';
    case 'member_added':
      return `added ${a.detail} to the group`;
    case 'member_removed':
      return `removed ${a.detail} from the group`;
    case 'group_created':
      return `created ${a.detail}`;
  }
}

export function activityIcon(a: Activity): string {
  switch (a.type) {
    case 'completed':
      return 'check';
    case 'created':
      return 'plus';
    case 'assigned':
    case 'auto_assigned':
    case 'claimed':
      return 'user-plus';
    case 'unassigned':
      return 'user-x';
    case 'skipped':
      return 'skip-forward';
    case 'reopened':
      return 'rotate-ccw';
    case 'deleted':
      return 'trash';
    case 'member_added':
    case 'member_removed':
    case 'group_created':
      return 'users';
    default:
      return 'edit';
  }
}

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    HeroComponent,
    StatCardComponent,
    TaskRowComponent,
    EmptyStateComponent,
    IconComponent,
    AvatarComponent,
    BarComponent,
    TimeAgoPipe,
    MemberNamePipe,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  readonly tasks = inject(TaskService);
  readonly group = inject(GroupService);
  readonly insights = inject(InsightsService);
  readonly overlay = inject(OverlayService);

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 5 ? 'Still up?' : h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,';
  });

  readonly firstName = computed(() => this.group.me()?.name ?? '');

  /** Overdue + due today, most urgent first. */
  readonly todayList = computed(() => [...this.tasks.overdue(), ...this.tasks.dueToday()]);
  readonly upcoming = computed(() => this.tasks.upcoming().slice(0, 6));
  readonly recentActivity = computed(() => this.group.activities().slice(0, 6));
  readonly topLoad = computed(() => this.insights.memberStats().slice(0, 4));
  readonly maxLoad = computed(() => this.insights.maxLoad());

  readonly headline = computed(() => {
    const n = this.tasks.unownedImportant().length;
    const o = this.tasks.overdue().length;
    if (n === 0 && o === 0) return 'Everything important has an owner. Nice.';
    const parts: string[] = [];
    if (n) parts.push(`${n} important task${n === 1 ? '' : 's'} ${n === 1 ? 'has' : 'have'} no owner`);
    if (o) parts.push(`${o} overdue`);
    return parts.join(' · ');
  });

  text = activityText;
  icon = activityIcon;
}
