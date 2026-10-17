import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GroupService } from '../core/services/group.service';
import { InsightsService } from '../core/services/insights.service';
import { OverlayService } from '../core/services/overlay.service';
import { TaskService } from '../core/services/task.service';
import { AvatarComponent } from '../shared/avatar';
import { IconComponent } from '../shared/icon';
import { SheetComponent } from '../shared/widgets';

/** "Who should own this?" picker with the workload-based suggestion on top. */
@Component({
  selector: 'app-assign-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SheetComponent, AvatarComponent, IconComponent],
  template: `
    @if (task(); as t) {
      <app-sheet title="Who should own this?" icon="user-plus" [small]="true" (closed)="overlay.closeAssign()">
        <div class="muted small mb">{{ t.title }}</div>
        <div class="list">
          @for (s of stats(); track s.member.id) {
            <button class="list-row clickable" (click)="pick(s.member.id)">
              <app-avatar [name]="s.member.name" [colorIndex]="s.member.colorIndex" [size]="42" />
              <div class="grow">
                <div class="row gap-sm">
                  <span class="list-title">{{ s.member.name }}</span>
                  @if (s.member.id === suggestion()?.id) {
                    <span class="badge badge-success"><app-icon name="sparkles" [size]="11" /> Suggested</span>
                  }
                  @if (s.member.id === t.ownerId) {
                    <span class="badge badge-primary">Current</span>
                  }
                </div>
                <div class="list-sub">{{ s.open }} open · {{ s.overdue }} overdue · load {{ s.load }}</div>
              </div>
              <app-icon name="chevron-right" class="faint" />
            </button>
          }
          @if (t.ownerId) {
            <button class="list-row clickable" (click)="pick(null)">
              <app-avatar [unowned]="true" [size]="42" />
              <div class="grow">
                <div class="list-title text-danger">Remove owner</div>
                <div class="list-sub">It will be flagged until someone claims it.</div>
              </div>
            </button>
          }
        </div>
      </app-sheet>
    }
  `,
})
export class AssignSheetComponent {
  readonly overlay = inject(OverlayService);
  private readonly tasks = inject(TaskService);
  private readonly insights = inject(InsightsService);
  readonly group = inject(GroupService);

  readonly task = computed(() => {
    const id = this.overlay.assignTaskId();
    return id ? this.tasks.task(id) : null;
  });
  readonly stats = computed(() => [...this.insights.memberStats()].sort((a, b) => a.load - b.load));
  readonly suggestion = computed(() => this.tasks.suggestOwner());

  pick(memberId: string | null): void {
    const t = this.task();
    if (t) this.tasks.assign(t.id, memberId);
    this.overlay.closeAssign();
  }
}

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SheetComponent, IconComponent],
  template: `
    @if (overlay.confirmRequest(); as req) {
      <app-sheet
        [title]="req.title"
        [icon]="req.danger ? 'alert-triangle' : 'help-circle'"
        [iconColor]="req.danger ? 'var(--danger)' : 'var(--primary)'"
        [small]="true"
        (closed)="req.resolve(false)"
      >
        <p class="muted">{{ req.message }}</p>
        <div sheet-foot class="sheet-foot">
          <button class="btn btn-ghost" (click)="req.resolve(false)">Cancel</button>
          <button class="btn" [class.btn-danger]="req.danger" [class.btn-primary]="!req.danger" (click)="req.resolve(true)">
            <app-icon [name]="req.danger ? 'trash' : 'check'" [size]="17" /> {{ req.confirmLabel ?? 'Confirm' }}
          </button>
        </div>
      </app-sheet>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly overlay = inject(OverlayService);
}
