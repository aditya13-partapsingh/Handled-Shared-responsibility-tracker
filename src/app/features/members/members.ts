import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PALETTE } from '../../core/models';
import { PercentPipe } from '../../core/pipes';
import { GroupService } from '../../core/services/group.service';
import { InsightsService } from '../../core/services/insights.service';
import { OverlayService } from '../../core/services/overlay.service';
import { TaskService } from '../../core/services/task.service';
import { ToastService } from '../../core/services/toast.service';
import { AvatarComponent } from '../../shared/avatar';
import { HeroComponent } from '../../shared/hero';
import { IconComponent } from '../../shared/icon';
import { TaskRowComponent } from '../../shared/task-row';
import { BarComponent, EmptyStateComponent, SheetComponent, StatCardComponent } from '../../shared/widgets';

@Component({
  selector: 'app-members',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, HeroComponent, AvatarComponent, IconComponent, BarComponent, SheetComponent, PercentPipe],
  template: `
    <div class="page">
      <app-hero title="Members" [eyebrow]="group.activeGroup()?.name ?? ''" [showAdd]="false">
        <div hero-actions>
          <button class="hero-btn" (click)="adding.set(true)" aria-label="Add member"><app-icon name="user-plus" /></button>
        </div>
        <div class="invite frost">
          <div class="grow">
            <div class="tiny" style="opacity: 0.85">Invite code</div>
            <div class="code">{{ group.activeGroup()?.inviteCode }}</div>
          </div>
          <button class="btn btn-sm invite-btn" (click)="copyCode()"><app-icon name="copy" [size]="15" /> Copy</button>
        </div>
      </app-hero>

      <div class="section-head mt">
        <h2>{{ stats().length }} people</h2>
        <button class="btn btn-soft btn-sm" (click)="adding.set(true)"><app-icon name="user-plus" [size]="15" /> Add member</button>
      </div>

      <div class="list">
        @for (s of stats(); track s.member.id) {
          <a class="list-row clickable" [routerLink]="['/members', s.member.id]">
            <app-avatar [name]="s.member.name" [colorIndex]="s.member.colorIndex" [size]="46" [ring]="s.member.id === group.me()?.id" [status]="s.member.accountId ? 'online' : null" />
            <div class="grow">
              <div class="row gap-sm">
                <span class="list-title">{{ s.member.name }}</span>
                @if (s.member.role === 'admin') {
                  <span class="badge badge-primary">Admin</span>
                }
                @if (s.member.id === group.me()?.id) {
                  <span class="badge">You</span>
                }
              </div>
              <div class="list-sub">
                {{ s.open }} open
                @if (s.overdue) {<span class="text-danger"> · {{ s.overdue }} overdue</span>}
                · {{ s.onTimeRate | percent: 'no history' }} on time
              </div>
              <div class="mt-sm">
                <app-bar [value]="s.load / insights.maxLoad()" [color]="palette[s.member.colorIndex % 8]" [height]="5" />
              </div>
            </div>
            <app-icon name="chevron-right" class="faint" />
          </a>
        }
      </div>
    </div>

    @if (adding()) {
      <app-sheet title="Add a member" icon="user-plus" [small]="true" (closed)="adding.set(false)">
        <form class="stack gap-lg" (submit)="add($event)">
          <p class="muted small">They'll appear immediately and can be given tasks. Share the invite code so they can sign in on their own device later.</p>
          <div class="field">
            <label class="label" for="am-name">Name</label>
            <input id="am-name" class="input" [(ngModel)]="name" name="name" placeholder="e.g. Priya Sharma" autofocus />
          </div>
          <div class="field">
            <label class="label" for="am-email">Email <span class="faint">(optional)</span></label>
            <input id="am-email" class="input" type="email" [(ngModel)]="email" name="email" placeholder="priya@example.com" />
          </div>
        </form>
        <div sheet-foot class="sheet-foot">
          <button class="btn btn-ghost" (click)="adding.set(false)">Cancel</button>
          <button class="btn btn-primary" [disabled]="!name.trim()" (click)="add()"><app-icon name="check" [size]="17" /> Add</button>
        </div>
      </app-sheet>
    }
  `,
  styles: [
    `
      .invite {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
      }
      .code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-weight: 700;
        font-size: 1.1rem;
        letter-spacing: 0.08em;
      }
      .invite-btn {
        background: #fff;
        color: var(--primary-strong);
        border: 0;
      }
    `,
  ],
})
export class MembersComponent {
  readonly group = inject(GroupService);
  readonly insights = inject(InsightsService);
  private readonly toast = inject(ToastService);

  readonly palette = PALETTE;
  readonly adding = signal(false);
  readonly stats = computed(() => this.insights.memberStats());
  name = '';
  email = '';

  add(e?: Event): void {
    e?.preventDefault();
    const m = this.group.addMember(this.name, this.email);
    if (!m) return;
    this.toast.success(`${m.name} added`);
    this.name = '';
    this.email = '';
    this.adding.set(false);
  }

  async copyCode(): Promise<void> {
    const code = this.group.activeGroup()?.inviteCode ?? '';
    try {
      await navigator.clipboard.writeText(code);
      this.toast.success('Invite code copied', code);
    } catch {
      this.toast.info('Invite code', code);
    }
  }
}

@Component({
  selector: 'app-member-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, HeroComponent, AvatarComponent, IconComponent, TaskRowComponent, EmptyStateComponent, StatCardComponent, SheetComponent, PercentPipe],
  template: `
    @if (member(); as m) {
      <div class="page">
        <app-hero [title]="m.name" [eyebrow]="m.role === 'admin' ? 'Admin' : 'Member'" backLink="/members" [showAdd]="false" [showBell]="false">
          <div hero-actions class="row gap-sm">
            @if (group.isAdmin() || isMe()) {
              <button class="hero-btn" (click)="startEdit()" aria-label="Edit"><app-icon name="edit" [size]="18" /></button>
            }
            @if (group.isAdmin() && !isMe()) {
              <button class="hero-btn" (click)="remove()" aria-label="Remove"><app-icon name="user-x" [size]="18" /></button>
            }
          </div>
          <div class="row gap-lg">
            <app-avatar [name]="m.name" [colorIndex]="m.colorIndex" [size]="64" [ring]="true" />
            <div class="small">
              @if (m.email) {<div>{{ m.email }}</div>}
              <div style="opacity: 0.85">Joined {{ joined() }}</div>
            </div>
          </div>
          @if (stat(); as s) {
            <div class="stat-grid mt">
              <app-stat-card label="Open" [value]="s.open" icon="tasks" />
              <app-stat-card label="Overdue" [value]="s.overdue" icon="alert-circle" tone="danger" />
              <app-stat-card label="Completed" [value]="s.completed" icon="check" tone="success" />
              <app-stat-card label="On time" [value]="s.onTimeRate | percent" icon="target" tone="purple" />
            </div>
          }
        </app-hero>

        <section class="section">
          <div class="section-head">
            <h2>Open tasks</h2>
            <button class="btn btn-soft btn-sm" (click)="overlay.newTask({ ownerId: m.id })"><app-icon name="plus" [size]="15" /> Assign new</button>
          </div>
          <div class="list">
            @for (t of openTasks(); track t.id) {
              <app-task-row [task]="t" [showOwner]="false" />
            } @empty {
              <app-empty-state icon="sun" [title]="m.name.split(' ')[0] + ' has nothing open'" message="Hand them something from the unowned list.">
                <a class="btn btn-soft btn-sm mt-sm" routerLink="/tasks" [queryParams]="{ filter: 'unowned' }">See unowned tasks</a>
              </app-empty-state>
            }
          </div>
        </section>

        @if (doneTasks().length > 0) {
          <section class="section">
            <div class="section-head"><h2>Recently completed</h2></div>
            <div class="list">
              @for (t of doneTasks(); track t.id) {
                <app-task-row [task]="t" [showOwner]="false" />
              }
            </div>
          </section>
        }
      </div>

      @if (editing()) {
        <app-sheet title="Edit member" icon="edit" [small]="true" (closed)="editing.set(false)">
          <form class="stack gap-lg" (submit)="saveEdit($event)">
            <div class="field">
              <label class="label" for="em-name">Name</label>
              <input id="em-name" class="input" [(ngModel)]="editName" name="name" />
            </div>
            <div class="field">
              <label class="label" for="em-email">Email</label>
              <input id="em-email" class="input" type="email" [(ngModel)]="editEmail" name="email" />
            </div>
            @if (group.isAdmin() && !isMe()) {
              <div class="field">
                <label class="label" for="em-role">Role</label>
                <select id="em-role" class="select" [(ngModel)]="editRole" name="role">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            }
            <div class="field">
              <span class="label">Color</span>
              <div class="row row-wrap gap-sm">
                @for (c of palette; track c; let i = $index) {
                  <button type="button" class="swatch" [class.on]="editColor === i" [style.background]="c" (click)="editColor = i" [attr.aria-label]="'Color ' + (i + 1)"></button>
                }
              </div>
            </div>
          </form>
          <div sheet-foot class="sheet-foot">
            <button class="btn btn-ghost" (click)="editing.set(false)">Cancel</button>
            <button class="btn btn-primary" [disabled]="!editName.trim()" (click)="saveEdit()"><app-icon name="check" [size]="17" /> Save</button>
          </div>
        </app-sheet>
      }
    } @else {
      <div class="page">
        <div class="list mt"><app-empty-state title="Member not found"><a class="btn btn-soft btn-sm mt-sm" routerLink="/members">Back</a></app-empty-state></div>
      </div>
    }
  `,
  styles: [
    `
      .swatch {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid transparent;
        transition: transform 0.15s;
      }
      .swatch.on {
        border-color: var(--text);
        transform: scale(1.1);
      }
    `,
  ],
})
export class MemberDetailComponent {
  readonly group = inject(GroupService);
  readonly insights = inject(InsightsService);
  readonly overlay = inject(OverlayService);
  private readonly tasks = inject(TaskService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly palette = PALETTE;
  readonly editing = signal(false);

  readonly member = computed(() => this.group.memberById(this.id()));
  readonly isMe = computed(() => this.member()?.id === this.group.me()?.id);
  readonly stat = computed(() => this.insights.memberStats().find((s) => s.member.id === this.id()) ?? null);
  readonly openTasks = computed(() => this.tasks.open().filter((t) => t.ownerId === this.id()));
  readonly doneTasks = computed(() => this.tasks.done().filter((t) => t.completedBy === this.id()).slice(0, 5));
  readonly joined = computed(() => {
    const m = this.member();
    return m ? new Date(m.joinedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
  });

  editName = '';
  editEmail = '';
  editRole: 'admin' | 'member' = 'member';
  editColor = 0;

  startEdit(): void {
    const m = this.member();
    if (!m) return;
    this.editName = m.name;
    this.editEmail = m.email;
    this.editRole = m.role;
    this.editColor = m.colorIndex;
    this.editing.set(true);
  }

  saveEdit(e?: Event): void {
    e?.preventDefault();
    const m = this.member();
    if (!m || !this.editName.trim()) return;
    this.group.updateMember(m.id, {
      name: this.editName.trim(),
      email: this.editEmail.trim(),
      role: this.group.isAdmin() && !this.isMe() ? this.editRole : m.role,
      colorIndex: this.editColor,
    });
    this.editing.set(false);
    this.toast.success('Member updated');
  }

  async remove(): Promise<void> {
    const m = this.member();
    if (!m) return;
    const ok = await this.overlay.confirm({
      title: `Remove ${m.name}?`,
      message: 'Their open tasks will become unowned so nothing gets lost.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    this.group.removeMember(m.id);
    this.toast.info(`${m.name} removed`, 'Their tasks now need a new owner.');
    this.router.navigate(['/members']);
  }
}
