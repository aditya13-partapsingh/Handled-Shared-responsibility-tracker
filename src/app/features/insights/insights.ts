import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PALETTE } from '../../core/models';
import { PercentPipe } from '../../core/pipes';
import { GroupService } from '../../core/services/group.service';
import { InsightsService } from '../../core/services/insights.service';
import { TaskService } from '../../core/services/task.service';
import { ToastService } from '../../core/services/toast.service';
import { AvatarComponent } from '../../shared/avatar';
import { HeroComponent } from '../../shared/hero';
import { IconComponent } from '../../shared/icon';
import { BarComponent, StatCardComponent } from '../../shared/widgets';

@Component({
  selector: 'app-insights',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HeroComponent, AvatarComponent, IconComponent, BarComponent, StatCardComponent, PercentPipe],
  templateUrl: './insights.html',
  styleUrl: './insights.scss',
})
export class InsightsComponent {
  readonly insights = inject(InsightsService);
  readonly group = inject(GroupService);
  readonly tasks = inject(TaskService);
  private readonly toast = inject(ToastService);

  readonly palette = PALETTE;
  readonly summary = computed(() => this.insights.summary());
  readonly maxWeekly = computed(() => Math.max(1, ...this.insights.weekly().map((w) => w.completed)));

  /** Conic-gradient stops for the category donut. */
  readonly donut = computed(() => {
    let acc = 0;
    const stops = this.insights.categoryBreakdown().map((c) => {
      const start = acc;
      acc += c.share * 100;
      return `${c.color} ${start}% ${acc}%`;
    });
    return stops.length ? `conic-gradient(${stops.join(', ')})` : 'var(--surface-3)';
  });

  readonly fairness = computed(() => {
    const stats = this.insights.memberStats();
    if (stats.length < 2) return null;
    const loads = stats.map((s) => s.load);
    const max = Math.max(...loads);
    const min = Math.min(...loads);
    if (max === 0) return 1;
    return 1 - (max - min) / max;
  });

  applyRebalance(): void {
    const n = this.insights.applyRebalance();
    this.toast.success(`Moved ${n} task${n === 1 ? '' : 's'}`, 'Workload is more even now.');
  }
}
