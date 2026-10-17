import { ChangeDetectionStrategy, Component, inject, input, model, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../core/services/toast.service';
import { IconComponent } from './icon';

export interface SegOption {
  value: string;
  label: string;
  count?: number;
}

/** Frosted / solid segmented pill control ("News | Channels" in the reference). */
@Component({
  selector: 'app-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="seg" [class.on-hero]="onHero()" role="tablist">
      @for (o of options(); track o.value) {
        <button
          class="seg-item"
          role="tab"
          [class.active]="o.value === value()"
          [attr.aria-selected]="o.value === value()"
          (click)="value.set(o.value)"
        >
          {{ o.label }}
          @if (o.count !== undefined) {
            <span class="count">{{ o.count }}</span>
          }
        </button>
      }
    </div>
  `,
})
export class SegmentedComponent {
  readonly options = input.required<SegOption[]>();
  readonly value = model<string>('');
  readonly onHero = input(false);
}

/** Small KPI tile. */
@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RouterLink],
  template: `
    <a class="stat" [class]="'tone-' + tone()" [routerLink]="link()" [queryParams]="queryParams()">
      <span class="stat-icon"><app-icon [name]="icon()" [size]="18" /></span>
      <span class="stat-value">{{ value() }}</span>
      <span class="stat-label">{{ label() }}</span>
    </a>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .stat {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 14px;
        border-radius: var(--r);
        background: var(--surface);
        border: 1px solid var(--border);
        box-shadow: var(--shadow-sm);
        transition:
          transform 0.15s,
          background 0.15s;
        --tone: var(--primary);
        --tone-soft: var(--primary-soft);
      }
      .stat:hover {
        transform: translateY(-2px);
        background: var(--surface-2);
      }
      .tone-danger {
        --tone: var(--danger);
        --tone-soft: var(--danger-soft);
      }
      .tone-warning {
        --tone: var(--warning);
        --tone-soft: var(--warning-soft);
      }
      .tone-success {
        --tone: var(--success);
        --tone-soft: var(--success-soft);
      }
      .tone-purple {
        --tone: var(--purple);
        --tone-soft: var(--purple-soft);
      }
      .stat-icon {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--tone);
        background: var(--tone-soft);
        margin-bottom: 4px;
      }
      .stat-value {
        font-size: 1.6rem;
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -0.02em;
      }
      .stat-label {
        font-size: 0.78rem;
        color: var(--text-3);
        font-weight: 600;
      }
      :host-context(.hero) .stat {
        background: rgba(255, 255, 255, 0.16);
        border-color: rgba(255, 255, 255, 0.22);
        backdrop-filter: blur(12px);
        color: #fff;
        box-shadow: none;
      }
      :host-context(.hero) .stat:hover {
        background: rgba(255, 255, 255, 0.26);
      }
      :host-context(.hero) .stat-label {
        color: rgba(255, 255, 255, 0.8);
      }
      :host-context(.hero) .stat-icon {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
      }
    `,
  ],
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input('activity');
  readonly tone = input<'primary' | 'danger' | 'warning' | 'success' | 'purple'>('primary');
  readonly link = input<string | any[] | null>(null);
  readonly queryParams = input<Record<string, string> | null>(null);
}

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="empty">
      <span class="empty-icon"><app-icon [name]="icon()" [size]="24" /></span>
      <div class="empty-title">{{ title() }}</div>
      @if (message()) {
        <div class="small">{{ message() }}</div>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly message = input('');
}

/** Progress bar with optional tone. */
@Component({
  selector: 'app-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar" [style.height.px]="height()">
      <div class="bar-fill" [style.width.%]="pct()" [style.background]="color()"></div>
    </div>
  `,
})
export class BarComponent {
  readonly value = input(0);
  readonly color = input('var(--primary)');
  readonly height = input(8);
  pct(): number {
    return Math.max(0, Math.min(100, this.value() * 100));
  }
}

/** Modal container: bottom sheet on phones, dialog on larger screens. */
@Component({
  selector: 'app-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="overlay" (click)="onBackdrop($event)">
      <div class="sheet" [class.sheet-sm]="small()" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <div class="sheet-head">
          @if (icon()) {
            <span class="cat-circle sm" [style.--cat]="iconColor()"><app-icon [name]="icon()" [size]="18" /></span>
          }
          <h2>{{ title() }}</h2>
          <button class="btn btn-ghost btn-icon" (click)="closed.emit()" aria-label="Close">
            <app-icon name="x" />
          </button>
        </div>
        <div class="sheet-body"><ng-content /></div>
        <ng-content select="[sheet-foot]" />
      </div>
    </div>
  `,
})
export class SheetComponent {
  readonly title = input('');
  readonly icon = input('');
  readonly iconColor = input('var(--primary)');
  readonly small = input(false);
  readonly closed = output<void>();

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('overlay')) this.closed.emit();
  }
}

@Component({
  selector: 'app-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast ' + t.kind">
          <span class="toast-icon"><app-icon [name]="iconFor(t.kind)" [size]="18" /></span>
          <div class="grow">
            <div class="strong small">{{ t.title }}</div>
            @if (t.message) {
              <div class="tiny muted">{{ t.message }}</div>
            }
          </div>
          @if (t.action) {
            <button class="btn btn-soft btn-sm" (click)="run(t.id, t.action.run)">{{ t.action.label }}</button>
          }
          <button class="btn btn-ghost btn-icon btn-sm" (click)="toast.dismiss(t.id)" aria-label="Dismiss">
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toasts {
        position: fixed;
        z-index: 100;
        left: 12px;
        right: 12px;
        bottom: calc(var(--bottom-nav-h) + 12px);
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      }
      @media (min-width: 960px) {
        .toasts {
          left: auto;
          right: 24px;
          bottom: 24px;
          width: 380px;
        }
      }
      .toast {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 10px 10px 12px;
        border-radius: var(--r);
        background: var(--surface);
        border: 1px solid var(--border-strong);
        box-shadow: var(--shadow);
        animation: slide-up 0.2s ease;
        --tone: var(--primary);
        --tone-soft: var(--primary-soft);
      }
      .toast.success {
        --tone: var(--success);
        --tone-soft: var(--success-soft);
      }
      .toast.warning {
        --tone: var(--warning);
        --tone-soft: var(--warning-soft);
      }
      .toast.error {
        --tone: var(--danger);
        --tone-soft: var(--danger-soft);
      }
      .toast-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--tone-soft);
        color: var(--tone);
        flex-shrink: 0;
      }
    `,
  ],
})
export class ToastsComponent {
  readonly toast = inject(ToastService);

  iconFor(kind: string): string {
    return kind === 'success' ? 'check' : kind === 'error' ? 'alert-circle' : kind === 'warning' ? 'alert-triangle' : 'info';
  }

  run(id: string, fn: () => void): void {
    this.toast.dismiss(id);
    fn();
  }
}
