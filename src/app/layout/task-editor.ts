import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  RECURRENCE_OPTIONS,
  REMINDER_OPTIONS,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TaskDraft,
} from '../core/models';
import { GroupService } from '../core/services/group.service';
import { OverlayService } from '../core/services/overlay.service';
import { TaskService } from '../core/services/task.service';
import { ToastService } from '../core/services/toast.service';
import { todayIso } from '../core/utils/date.util';
import { AvatarComponent } from '../shared/avatar';
import { IconComponent } from '../shared/icon';
import { SheetComponent } from '../shared/widgets';

@Component({
  selector: 'app-task-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SheetComponent, IconComponent, AvatarComponent],
  template: `
    <app-sheet [title]="isEdit() ? 'Edit task' : 'New task'" icon="edit" (closed)="overlay.closeTaskEditor()">
      <form class="stack gap-lg" (submit)="save($event)">
        <div class="field">
          <label class="label" for="te-title">What needs to be done?</label>
          <input
            id="te-title"
            class="input"
            [class.invalid]="submitted() && !d.title.trim()"
            placeholder="e.g. Pay electricity bill"
            [(ngModel)]="d.title"
            name="title"
            autocomplete="off"
            autofocus
          />
        </div>

        <div class="field">
          <span class="label">Category</span>
          <div class="cats">
            @for (c of categories; track c.value) {
              <button
                type="button"
                class="cat"
                [class.active]="d.category === c.value"
                [style.--cat]="c.color"
                (click)="d.category = c.value"
              >
                <span class="cat-circle sm"><app-icon [name]="c.icon" [size]="17" /></span>
                <span class="tiny">{{ c.label }}</span>
              </button>
            }
          </div>
        </div>

        <div class="form-grid">
          <div class="field">
            <label class="label" for="te-due">Due date</label>
            <input id="te-due" type="date" class="input" [(ngModel)]="d.dueDate" name="dueDate" [min]="isEdit() ? null : today" />
          </div>
          <div class="field">
            <label class="label" for="te-prio">Priority</label>
            <select id="te-prio" class="select" [(ngModel)]="d.priority" name="priority">
              @for (p of priorities; track p.value) {
                <option [value]="p.value">{{ p.label }}</option>
              }
            </select>
          </div>
        </div>

        <div class="field">
          <div class="row between">
            <span class="label">Owner</span>
            <button type="button" class="btn btn-ghost btn-sm" (click)="suggest()">
              <app-icon name="sparkles" [size]="15" /> Suggest
            </button>
          </div>
          <div class="owners">
            <button type="button" class="owner" [class.active]="d.ownerId === null" (click)="d.ownerId = null">
              <app-avatar [unowned]="true" [size]="36" />
              <span class="tiny">Nobody yet</span>
            </button>
            @for (m of group.members(); track m.id) {
              <button type="button" class="owner" [class.active]="d.ownerId === m.id" (click)="d.ownerId = m.id">
                <app-avatar [name]="m.name" [colorIndex]="m.colorIndex" [size]="36" />
                <span class="tiny truncate">{{ m.name.split(' ')[0] }}</span>
              </button>
            }
          </div>
          @if (d.ownerId === null) {
            <div class="hint text-warning">
              <app-icon name="alert-triangle" [size]="13" /> This task will show up in "Needs an owner" until someone claims it.
            </div>
          }
        </div>

        <div class="form-grid">
          <div class="field">
            <label class="label" for="te-rec">Repeats</label>
            <select id="te-rec" class="select" [(ngModel)]="d.recurrence.frequency" name="frequency">
              @for (r of recurrences; track r.value) {
                <option [value]="r.value">{{ r.label }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label class="label" for="te-rem">Reminder</label>
            <select id="te-rem" class="select" [ngModel]="reminderValue()" (ngModelChange)="setReminder($event)" name="reminder">
              @for (r of reminders; track r.label) {
                <option [value]="r.value === null ? 'none' : r.value">{{ r.label }}</option>
              }
            </select>
          </div>
        </div>

        @if (d.recurrence.frequency !== 'none') {
          <div class="card card-pad stack">
            <div class="toggle-row" style="padding: 0">
              <div>
                <div class="toggle-text">Rotate owners</div>
                <div class="toggle-sub">Hand each new occurrence to the next person in line.</div>
              </div>
              <button
                type="button"
                class="toggle"
                [class.on]="d.recurrence.rotateOwners"
                (click)="d.recurrence.rotateOwners = !d.recurrence.rotateOwners"
                role="switch"
                [attr.aria-checked]="d.recurrence.rotateOwners"
              ></button>
            </div>
            @if (d.recurrence.rotateOwners) {
              <div class="hint">Who takes part? Leave everyone unchecked to rotate through the whole group.</div>
              <div class="row row-wrap gap-sm">
                @for (m of group.members(); track m.id) {
                  <button type="button" class="chip" [class.active]="inRotation(m.id)" (click)="toggleRotation(m.id)">
                    {{ m.name.split(' ')[0] }}
                    @if (inRotation(m.id)) {
                      <span class="count">{{ d.recurrence.rotation.indexOf(m.id) + 1 }}</span>
                    }
                  </button>
                }
              </div>
            }
          </div>
        }

        <div class="field">
          <label class="label" for="te-desc">Notes <span class="faint">(optional)</span></label>
          <textarea id="te-desc" class="textarea" [(ngModel)]="d.description" name="description" placeholder="Account numbers, where the supplies are, who to call…"></textarea>
        </div>
      </form>

      <div sheet-foot class="sheet-foot">
        <button type="button" class="btn btn-ghost" (click)="overlay.closeTaskEditor()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="save()">
          <app-icon name="check" [size]="18" /> {{ isEdit() ? 'Save changes' : 'Create task' }}
        </button>
      </div>
    </app-sheet>
  `,
  styles: [
    `
      .cats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }
      @media (min-width: 560px) {
        .cats {
          grid-template-columns: repeat(7, 1fr);
        }
      }
      .cat {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 4px;
        border-radius: 14px;
        border: 2px solid transparent;
        color: var(--text-2);
        transition: all 0.15s;
      }
      .cat:hover {
        background: var(--surface-2);
      }
      .cat.active {
        border-color: var(--cat);
        background: color-mix(in srgb, var(--cat) 10%, transparent);
        color: var(--text);
      }
      .owners {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding: 4px 2px;
      }
      .owner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        min-width: 64px;
        padding: 8px 4px;
        border-radius: 14px;
        border: 2px solid transparent;
        color: var(--text-2);
        transition: all 0.15s;
      }
      .owner.active {
        border-color: var(--primary);
        background: var(--primary-soft);
        color: var(--text);
      }
      .owner .tiny {
        max-width: 60px;
      }
      .hint {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    `,
  ],
})
export class TaskEditorComponent {
  readonly overlay = inject(OverlayService);
  readonly group = inject(GroupService);
  private readonly tasks = inject(TaskService);
  private readonly toast = inject(ToastService);

  readonly categories = TASK_CATEGORIES;
  readonly priorities = TASK_PRIORITIES;
  readonly recurrences = RECURRENCE_OPTIONS;
  readonly reminders = REMINDER_OPTIONS;
  readonly today = todayIso();

  readonly request = computed(() => this.overlay.taskEditor());
  readonly isEdit = computed(() => !!this.request()?.task);
  readonly submitted = signal(false);

  /** Plain mutable draft bound with ngModel; template events drive change detection. */
  d: TaskDraft = this.tasks.emptyDraft();

  constructor() {
    // The shell creates this component fresh for every open, so loading once is enough.
    const req = this.request();
    if (!req) return;
    const base: TaskDraft = req.task
      ? {
          title: req.task.title,
          description: req.task.description,
          category: req.task.category,
          priority: req.task.priority,
          ownerId: req.task.ownerId,
          dueDate: req.task.dueDate,
          recurrence: req.task.recurrence,
          reminderDaysBefore: req.task.reminderDaysBefore,
        }
      : this.tasks.emptyDraft(req.defaults);
    this.d = { ...base, recurrence: { ...base.recurrence, rotation: [...base.recurrence.rotation] } };
  }

  reminderValue(): string | number {
    return this.d.reminderDaysBefore === null ? 'none' : this.d.reminderDaysBefore;
  }

  setReminder(v: string | number): void {
    this.d.reminderDaysBefore = v === 'none' || v === '' ? null : Number(v);
  }

  inRotation(id: string): boolean {
    return this.d.recurrence.rotation.includes(id);
  }

  toggleRotation(id: string): void {
    const r = this.d.recurrence.rotation;
    this.d.recurrence.rotation = r.includes(id) ? r.filter((x) => x !== id) : [...r, id];
  }

  suggest(): void {
    const s = this.tasks.suggestOwner();
    if (s) {
      this.d.ownerId = s.id;
      this.toast.info(`Suggested ${s.name}`, 'Lightest workload right now.');
    }
  }

  save(e?: Event): void {
    e?.preventDefault();
    this.submitted.set(true);
    if (!this.d.title.trim()) return;
    if (!this.d.dueDate) {
      this.toast.error('Pick a due date');
      return;
    }
    const draft: TaskDraft = {
      ...this.d,
      title: this.d.title.trim(),
      recurrence: {
        ...this.d.recurrence,
        rotateOwners: this.d.recurrence.frequency !== 'none' && this.d.recurrence.rotateOwners,
      },
    };
    const req = this.request();
    if (req?.task) {
      this.tasks.update(req.task.id, draft);
      this.toast.success('Task updated');
    } else {
      this.tasks.create(draft);
      this.toast.success('Task created', draft.ownerId ? undefined : 'Flagged as needing an owner.');
    }
    this.overlay.closeTaskEditor();
  }
}
