import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GroupService } from '../core/services/group.service';
import { OverlayService } from '../core/services/overlay.service';
import { TaskService } from '../core/services/task.service';
import { AvatarComponent } from './avatar';
import { IconComponent } from './icon';

/**
 * Gradient page header. Shows the eyebrow/title (or a greeting), the reminder bell
 * and the current user's avatar, then projects page-specific content underneath.
 */
@Component({
  selector: 'app-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, IconComponent, RouterLink],
  template: `
    <header class="hero">
      <div class="hero-top">
        @if (backLink(); as back) {
          <a class="hero-btn" [routerLink]="back" aria-label="Back"><app-icon name="chevron-left" /></a>
        } @else if (group.me(); as me) {
          <a routerLink="/settings" aria-label="Settings">
            <app-avatar [name]="me.name" [colorIndex]="me.colorIndex" [size]="44" [ring]="true" />
          </a>
        }
        <div class="grow">
          @if (eyebrow()) {
            <div class="hero-eyebrow">{{ eyebrow() }}</div>
          }
          <h1 class="truncate">{{ title() }}</h1>
        </div>
        <div class="hero-actions">
          <ng-content select="[hero-actions]" />
          @if (showBell()) {
            <a class="hero-btn" routerLink="/activity" aria-label="Reminders">
              <app-icon name="bell" />
              @if (tasks.reminderCount() > 0) {
                <span class="notif-badge">{{ tasks.reminderCount() }}</span>
              }
            </a>
          }
          @if (showAdd()) {
            <button class="hero-btn" (click)="overlay.newTask()" aria-label="New task"><app-icon name="plus" /></button>
          }
        </div>
      </div>
      <div class="hero-body"><ng-content /></div>
    </header>
  `,
})
export class HeroComponent {
  readonly group = inject(GroupService);
  readonly tasks = inject(TaskService);
  readonly overlay = inject(OverlayService);

  readonly title = input.required<string>();
  readonly eyebrow = input('');
  readonly backLink = input<string | any[] | null>(null);
  readonly showBell = input(true);
  readonly showAdd = input(true);
}
