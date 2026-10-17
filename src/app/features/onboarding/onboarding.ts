import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GROUP_TYPES, GroupType, TASK_TEMPLATES, TaskTemplate, categoryMeta, recurrenceLabel } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { GroupService } from '../../core/services/group.service';
import { TaskService } from '../../core/services/task.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { AvatarComponent } from '../../shared/avatar';
import { IconComponent } from '../../shared/icon';

type Mode = 'create' | 'join';

@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent, AvatarComponent],
  template: `
    <div class="wrap">
      <div class="top">
        <div class="brand"><span class="brand-mark"><app-icon name="check" [size]="18" [stroke]="3" /></span> Handled</div>
        @if (group.hasGroup()) {
          <button class="btn btn-ghost btn-sm" (click)="router.navigate(['/home'])"><app-icon name="x" [size]="16" /> Back to app</button>
        } @else {
          <button class="btn btn-ghost btn-sm" (click)="signOut()">Sign out</button>
        }
      </div>

      <div class="card card-pad body">
        <div class="seg mb">
          <button class="seg-item" [class.active]="mode() === 'create'" (click)="mode.set('create')">Create a group</button>
          <button class="seg-item" [class.active]="mode() === 'join'" (click)="mode.set('join')">Join with a code</button>
        </div>

        @if (mode() === 'join') {
          <h2>Join an existing group</h2>
          <p class="muted small mt-sm">Ask an admin for the invite code — it's in their Settings page.</p>
          <form class="stack gap-lg mt" (submit)="join($event)">
            @if (error()) {
              <div class="form-error">{{ error() }}</div>
            }
            <div class="input-wrap">
              <app-icon name="key" [size]="18" />
              <input class="input" [(ngModel)]="code" name="code" placeholder="e.g. MAPLE-2026" autocomplete="off" style="text-transform: uppercase" />
            </div>
            <button class="btn btn-primary btn-lg" type="submit">Join group <app-icon name="arrow-right" [size]="18" /></button>
          </form>
        } @else {
          <div class="steps">
            @for (s of ['Group', 'People', 'Tasks']; track s; let i = $index) {
              <div class="step" [class.active]="step() === i" [class.done]="step() > i">
                <span class="step-num">@if (step() > i) {<app-icon name="check" [size]="12" [stroke]="3" />} @else {{{ i + 1 }}}</span>
                {{ s }}
              </div>
            }
          </div>

          @switch (step()) {
            @case (0) {
              <h2>Who is this space for?</h2>
              <p class="muted small mt-sm">Hi {{ firstName() }} — pick the kind of group and give it a name.</p>
              <div class="stack mt">
                @for (t of types; track t.value) {
                  <button class="option-card" [class.selected]="type() === t.value" (click)="selectType(t.value)">
                    <span class="cat-circle" style="--cat: var(--primary)"><app-icon [name]="t.icon" [size]="20" /></span>
                    <div class="grow">
                      <div class="option-title">{{ t.label }}</div>
                      <div class="option-sub">{{ t.description }}</div>
                    </div>
                    @if (type() === t.value) {
                      <app-icon name="check-circle" class="text-primary" />
                    }
                  </button>
                }
              </div>
              <div class="field mt">
                <label class="label" for="ob-name">Group name</label>
                <input id="ob-name" class="input" [(ngModel)]="name" name="name" [placeholder]="placeholder()" />
              </div>
              <div class="row mt" style="justify-content: flex-end">
                <button class="btn btn-primary btn-lg" [disabled]="!name.trim()" (click)="step.set(1)">Next <app-icon name="arrow-right" [size]="18" /></button>
              </div>
            }
            @case (1) {
              <h2>Who's in {{ name }}?</h2>
              <p class="muted small mt-sm">Add the people who share these responsibilities. They don't need accounts — you can also invite them later with a code.</p>
              <form class="row mt" (submit)="addPerson($event)">
                <div class="input-wrap grow">
                  <app-icon name="user-plus" [size]="18" />
                  <input class="input" [(ngModel)]="personName" name="person" placeholder="Name, then press Enter" autocomplete="off" />
                </div>
                <button class="btn btn-soft" type="submit" [disabled]="!personName.trim()">Add</button>
              </form>
              <div class="people mt">
                <div class="person me">
                  <app-avatar [name]="auth.account()?.name ?? ''" [colorIndex]="auth.account()?.colorIndex ?? 0" [size]="34" />
                  <span>{{ auth.account()?.name }}</span>
                  <span class="badge badge-primary">You</span>
                </div>
                @for (p of people(); track p; let i = $index) {
                  <div class="person">
                    <app-avatar [name]="p" [colorIndex]="(i + 1) % 8" [size]="34" />
                    <span>{{ p }}</span>
                    <button class="btn btn-ghost btn-icon btn-sm" (click)="removePerson(i)" aria-label="Remove"><app-icon name="x" [size]="14" /></button>
                  </div>
                }
              </div>
              <div class="row mt between">
                <button class="btn btn-ghost" (click)="step.set(0)"><app-icon name="arrow-left" [size]="18" /> Back</button>
                <button class="btn btn-primary btn-lg" (click)="step.set(2)">{{ people().length ? 'Next' : 'Skip for now' }} <app-icon name="arrow-right" [size]="18" /></button>
              </div>
            }
            @case (2) {
              <h2>Start with some common tasks</h2>
              <p class="muted small mt-sm">Pick the ones that apply. They'll be created without an owner so you can hand them out from the dashboard.</p>
              <div class="list mt">
                @for (t of templates(); track t.title) {
                  <button class="list-row clickable" (click)="toggleTemplate(t.title)">
                    <span class="cat-circle sm" [style.--cat]="catColor(t)"><app-icon [name]="catIcon(t)" [size]="17" /></span>
                    <div class="grow">
                      <div class="list-title">{{ t.title }}</div>
                      <div class="list-sub">{{ recLabel(t) }} · {{ t.priority }} priority</div>
                    </div>
                    <span class="checkbox" [class.on]="selected().has(t.title)"><app-icon name="check" [size]="14" [stroke]="3" /></span>
                  </button>
                }
              </div>
              <div class="row mt between">
                <button class="btn btn-ghost" (click)="step.set(1)"><app-icon name="arrow-left" [size]="18" /> Back</button>
                <button class="btn btn-primary btn-lg" (click)="finish()">
                  <app-icon name="check" [size]="18" /> {{ selected().size ? 'Create ' + selected().size + ' tasks & finish' : 'Finish setup' }}
                </button>
              </div>
            }
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
      .wrap {
        min-height: 100dvh;
        max-width: 640px;
        margin: 0 auto;
        padding: 20px 16px 48px;
      }
      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 800;
        font-size: 1.2rem;
      }
      .brand-mark {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        background: var(--grad);
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .body {
        padding: 22px;
      }
      .steps {
        display: flex;
        gap: 8px;
        margin-bottom: 22px;
      }
      .step {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 999px;
        background: var(--surface-2);
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-3);
      }
      .step.active {
        background: var(--primary-soft);
        color: var(--primary);
      }
      .step.done {
        color: var(--success);
      }
      .step-num {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--surface-3);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.72rem;
      }
      .step.active .step-num {
        background: var(--primary);
        color: #fff;
      }
      .step.done .step-num {
        background: var(--success);
        color: #fff;
      }
      .people {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .person {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px 4px 4px;
        border-radius: 999px;
        background: var(--surface-2);
        border: 1px solid var(--border);
        font-weight: 600;
        font-size: 0.875rem;
      }
      .checkbox {
        width: 26px;
        height: 26px;
        border-radius: 8px;
        border: 2px solid var(--border-strong);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: transparent;
        transition: all 0.15s;
      }
      .checkbox.on {
        background: var(--primary);
        border-color: var(--primary);
        color: #fff;
      }
    `,
  ],
})
export class OnboardingComponent {
  readonly auth = inject(AuthService);
  readonly group = inject(GroupService);
  readonly router = inject(Router);
  private readonly tasks = inject(TaskService);
  private readonly toast = inject(ToastService);

  readonly types = GROUP_TYPES;
  readonly mode = signal<Mode>('create');
  readonly step = signal(0);
  readonly error = signal('');
  readonly people = signal<string[]>([]);
  readonly type = signal<GroupType>('roommates');
  readonly selected = signal(new Set(TASK_TEMPLATES['roommates'].slice(0, 4).map((t) => t.title)));

  name = '';
  personName = '';
  code = '';

  readonly templates = computed(() => TASK_TEMPLATES[this.type()]);
  readonly firstName = computed(() => (this.auth.account()?.name ?? '').split(' ')[0]);

  readonly placeholder = computed(
    () =>
      ({ family: 'The Sharma Family', roommates: 'Maple Street House', team: 'Northwind Studio' })[
        this.type()
      ],
  );

  constructor() {
    inject(ThemeService);
  }

  selectType(v: GroupType): void {
    this.type.set(v);
    this.selected.set(new Set(TASK_TEMPLATES[v].slice(0, 4).map((t) => t.title)));
  }

  catIcon(t: TaskTemplate): string {
    return categoryMeta(t.category).icon;
  }
  catColor(t: TaskTemplate): string {
    return categoryMeta(t.category).color;
  }
  recLabel(t: TaskTemplate): string {
    return recurrenceLabel(t.frequency);
  }

  addPerson(e: Event): void {
    e.preventDefault();
    const n = this.personName.trim();
    if (!n) return;
    this.people.update((p) => [...p, n]);
    this.personName = '';
  }

  removePerson(i: number): void {
    this.people.update((p) => p.filter((_, idx) => idx !== i));
  }

  toggleTemplate(title: string): void {
    this.selected.update((s) => {
      const next = new Set(s);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  finish(): void {
    const g = this.group.createGroup(this.name, this.type(), this.people());
    const chosen = this.templates().filter((t) => this.selected().has(t.title));
    const n = this.tasks.createFromTemplates(chosen);
    this.toast.success(`${g.name} is ready`, n ? `${n} starter tasks are waiting for owners.` : undefined);
    this.router.navigate(['/home']);
  }

  join(e: Event): void {
    e.preventDefault();
    const res = this.group.joinByCode(this.code);
    if (!res.ok) {
      this.error.set(res.error ?? 'Could not join.');
      return;
    }
    this.toast.success(`Welcome to ${res.group?.name}`);
    this.router.navigate(['/home']);
  }

  signOut(): void {
    this.auth.signOut();
    this.router.navigate(['/auth/sign-in']);
  }
}
