import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PALETTE } from '../core/models';
import { initials } from '../core/utils/id.util';
import { IconComponent } from './icon';

/**
 * Initials avatar with the identity color from the palette.
 * `unowned` renders the dashed "nobody" placeholder used across No-Owner UI.
 */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <span
      class="av"
      [class.ring]="ring()"
      [class.unowned]="unowned()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.font-size.px]="size() * 0.36"
      [style.background]="unowned() ? null : bg()"
      [attr.title]="unowned() ? 'No owner' : name()"
    >
      @if (unowned()) {
        <app-icon name="help-circle" [size]="size() * 0.5" />
      } @else {
        {{ text() }}
      }
      @if (status()) {
        <i class="status" [class]="status()"></i>
      }
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex-shrink: 0;
      }
      .av {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        color: #fff;
        font-weight: 700;
        letter-spacing: 0.02em;
        user-select: none;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
      }
      .ring {
        box-shadow:
          0 0 0 2px var(--bg-2),
          0 0 0 4px var(--primary);
      }
      .unowned {
        color: var(--danger);
        border: 2px dashed var(--danger);
        background: var(--danger-soft);
        text-shadow: none;
      }
      .status {
        position: absolute;
        right: -1px;
        bottom: -1px;
        width: 30%;
        height: 30%;
        min-width: 9px;
        min-height: 9px;
        border-radius: 50%;
        border: 2px solid var(--bg-2);
        background: var(--text-3);
      }
      .status.online {
        background: var(--success);
      }
      .status.busy {
        background: var(--danger);
      }
      .status.away {
        background: var(--warning);
      }
    `,
  ],
})
export class AvatarComponent {
  readonly name = input('');
  readonly colorIndex = input(0);
  readonly size = input(40);
  readonly ring = input(false);
  readonly unowned = input(false);
  readonly status = input<'online' | 'busy' | 'away' | null>(null);

  readonly text = computed(() => initials(this.name()) || '?');
  readonly bg = computed(() => {
    const c = PALETTE[Math.abs(this.colorIndex()) % PALETTE.length];
    return `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 70%, #000))`;
  });
}
