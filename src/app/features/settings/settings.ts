import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GROUP_TYPES, GroupType, PALETTE } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { GroupService } from '../../core/services/group.service';
import { OverlayService } from '../../core/services/overlay.service';
import { StoreService } from '../../core/services/store.service';
import { TaskService } from '../../core/services/task.service';
import { ThemePreference, ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { AvatarComponent } from '../../shared/avatar';
import { HeroComponent } from '../../shared/hero';
import { IconComponent } from '../../shared/icon';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, HeroComponent, AvatarComponent, IconComponent],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent {
  readonly auth = inject(AuthService);
  readonly group = inject(GroupService);
  readonly theme = inject(ThemeService);
  readonly tasks = inject(TaskService);
  private readonly store = inject(StoreService);
  private readonly overlay = inject(OverlayService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly palette = PALETTE;
  readonly groupTypes = GROUP_TYPES;
  readonly themes: { value: ThemePreference; label: string; icon: string }[] = [
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'system', label: 'System', icon: 'monitor' },
  ];

  readonly importError = signal('');
  readonly pwError = signal('');
  readonly stats = computed(() => ({
    tasks: this.tasks.all().length,
    members: this.group.members().length,
    groups: this.group.myGroups().length,
  }));

  profileName = this.auth.account()?.name ?? '';
  groupName = this.group.activeGroup()?.name ?? '';
  groupType: GroupType = this.group.activeGroup()?.type ?? 'roommates';
  currentPw = '';
  newPw = '';

  saveProfile(e?: Event): void {
    e?.preventDefault();
    if (!this.profileName.trim()) return;
    this.auth.updateProfile({ name: this.profileName.trim() });
    this.toast.success('Profile saved');
  }

  setColor(i: number): void {
    this.auth.updateProfile({ colorIndex: i });
  }

  changePassword(e?: Event): void {
    e?.preventDefault();
    const res = this.auth.changePassword(this.currentPw, this.newPw);
    if (!res.ok) {
      this.pwError.set(res.error ?? 'Could not change password.');
      return;
    }
    this.pwError.set('');
    this.currentPw = '';
    this.newPw = '';
    this.toast.success('Password changed');
  }

  saveGroup(e?: Event): void {
    e?.preventDefault();
    if (!this.groupName.trim()) return;
    this.group.updateGroup({ name: this.groupName.trim(), type: this.groupType });
    this.toast.success('Group updated');
  }

  regenerate(): void {
    this.group.regenerateInviteCode();
    this.toast.info('New invite code', this.group.activeGroup()?.inviteCode);
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

  async leaveGroup(): Promise<void> {
    const g = this.group.activeGroup();
    if (!g) return;
    const last = this.group.members().length === 1;
    const ok = await this.overlay.confirm({
      title: last ? `Delete ${g.name}?` : `Leave ${g.name}?`,
      message: last
        ? 'You are the only member, so the group and all of its tasks will be deleted.'
        : 'Your open tasks will become unowned so the others can pick them up.',
      confirmLabel: last ? 'Delete group' : 'Leave',
      danger: true,
    });
    if (!ok) return;
    this.group.leaveGroup();
    this.router.navigate([this.group.hasGroup() ? '/home' : '/onboarding']);
  }

  async deleteGroup(): Promise<void> {
    const g = this.group.activeGroup();
    if (!g) return;
    const ok = await this.overlay.confirm({
      title: `Delete ${g.name} for everyone?`,
      message: 'All members, tasks and history in this group will be permanently removed.',
      confirmLabel: 'Delete group',
      danger: true,
    });
    if (!ok) return;
    this.group.deleteGroup();
    this.toast.info('Group deleted');
    this.router.navigate([this.group.hasGroup() ? '/home' : '/onboarding']);
  }

  exportData(): void {
    const blob = new Blob([this.store.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `handled-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importData(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    input.value = '';
    if (!this.store.importJson(text)) {
      this.importError.set('That file is not a Handled backup.');
      return;
    }
    this.importError.set('');
    this.toast.success('Data imported');
    this.router.navigate([this.auth.isSignedIn() ? (this.group.hasGroup() ? '/home' : '/onboarding') : '/auth/sign-in']);
  }

  async resetDemo(): Promise<void> {
    const ok = await this.overlay.confirm({
      title: 'Reset to demo data?',
      message: 'Everything you have added will be replaced by the sample household and team. You will be signed out.',
      confirmLabel: 'Reset',
      danger: true,
    });
    if (!ok) return;
    this.store.resetToDemo();
    this.router.navigate(['/auth/sign-in']);
  }

  signOut(): void {
    this.auth.signOut();
    this.router.navigate(['/auth/sign-in']);
  }
}
