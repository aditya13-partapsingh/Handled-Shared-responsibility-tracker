import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { groupTypeMeta } from '../core/models';
import { AuthService } from '../core/services/auth.service';
import { GroupService } from '../core/services/group.service';
import { OverlayService } from '../core/services/overlay.service';
import { TaskService } from '../core/services/task.service';
import { ThemeService } from '../core/services/theme.service';
import { AvatarComponent } from '../shared/avatar';
import { IconComponent } from '../shared/icon';
import { SheetComponent } from '../shared/widgets';
import { AssignSheetComponent, ConfirmDialogComponent } from './dialogs';
import { TaskEditorComponent } from './task-editor';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    AvatarComponent,
    SheetComponent,
    TaskEditorComponent,
    AssignSheetComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly group = inject(GroupService);
  readonly tasks = inject(TaskService);
  readonly overlay = inject(OverlayService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly nav: NavItem[] = [
    { path: '/home', label: 'Home', icon: 'home' },
    { path: '/tasks', label: 'Tasks', icon: 'tasks' },
    { path: '/calendar', label: 'Calendar', icon: 'calendar' },
    { path: '/members', label: 'Members', icon: 'users' },
    { path: '/insights', label: 'Insights', icon: 'bar-chart' },
    { path: '/activity', label: 'Activity', icon: 'bell' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  /** Bottom bar: Home, Tasks, [+], Members, More – everything else lives in the More sheet. */
  readonly mobileNav: NavItem[] = this.nav.slice(0, 2);
  readonly mobileNavRight: NavItem[] = [this.nav[3]];
  readonly moreNav: NavItem[] = [this.nav[2], this.nav[4], this.nav[5], this.nav[6]];

  groupTypeLabel(type: string): string {
    return groupTypeMeta(type as never).label;
  }

  groupIcon(type: string): string {
    return groupTypeMeta(type as never).icon;
  }

  switchGroup(id: string): void {
    this.group.switchGroup(id);
    this.overlay.menuOpen.set(false);
    this.router.navigate(['/home']);
  }

  goTo(path: string): void {
    this.overlay.menuOpen.set(false);
    this.router.navigate([path]);
  }

  newGroup(): void {
    this.overlay.menuOpen.set(false);
    this.router.navigate(['/onboarding']);
  }

  signOut(): void {
    this.overlay.closeAll();
    this.auth.signOut();
    this.router.navigate(['/auth/sign-in']);
  }
}
