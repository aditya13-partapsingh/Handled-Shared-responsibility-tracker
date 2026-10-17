import { Routes } from '@angular/router';
import { appGuard, guestGuard, signedInGuard } from './core/guards/auth.guard';
import { ShellComponent } from './layout/shell';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth').then((m) => m.AuthLayoutComponent),
    canActivate: [guestGuard],
    children: [
      {
        path: 'sign-in',
        loadComponent: () => import('./features/auth/auth').then((m) => m.SignInComponent),
        title: 'Sign in · Handled',
      },
      {
        path: 'sign-up',
        loadComponent: () => import('./features/auth/auth').then((m) => m.SignUpComponent),
        title: 'Create account · Handled',
      },
      { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
    ],
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./features/onboarding/onboarding').then((m) => m.OnboardingComponent),
    canActivate: [signedInGuard],
    title: 'Set up your group · Handled',
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [appGuard],
    canActivateChild: [appGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home').then((m) => m.HomeComponent),
        title: 'Home · Handled',
      },
      {
        path: 'tasks',
        loadComponent: () => import('./features/tasks/tasks').then((m) => m.TasksComponent),
        title: 'Tasks · Handled',
      },
      {
        path: 'tasks/:id',
        loadComponent: () => import('./features/tasks/task-detail').then((m) => m.TaskDetailComponent),
        title: 'Task · Handled',
      },
      {
        path: 'calendar',
        loadComponent: () => import('./features/calendar/calendar').then((m) => m.CalendarComponent),
        title: 'Calendar · Handled',
      },
      {
        path: 'members',
        loadComponent: () => import('./features/members/members').then((m) => m.MembersComponent),
        title: 'Members · Handled',
      },
      {
        path: 'members/:id',
        loadComponent: () => import('./features/members/members').then((m) => m.MemberDetailComponent),
        title: 'Member · Handled',
      },
      {
        path: 'insights',
        loadComponent: () => import('./features/insights/insights').then((m) => m.InsightsComponent),
        title: 'Insights · Handled',
      },
      {
        path: 'activity',
        loadComponent: () => import('./features/activity/activity').then((m) => m.ActivityComponent),
        title: 'Activity · Handled',
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings').then((m) => m.SettingsComponent),
        title: 'Settings · Handled',
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
