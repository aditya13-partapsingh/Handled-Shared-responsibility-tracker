import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { GroupService } from '../services/group.service';

/** Signed in AND a member of at least one group – the main app shell. */
export const appGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const group = inject(GroupService);
  const router = inject(Router);
  if (!auth.isSignedIn()) return router.createUrlTree(['/auth/sign-in']);
  if (!group.hasGroup()) return router.createUrlTree(['/onboarding']);
  return true;
};

/** Signed in but must not have a group yet is NOT required – onboarding also serves "create another group". */
export const signedInGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isSignedIn() ? true : router.createUrlTree(['/auth/sign-in']);
};

/** Auth pages redirect signed-in users into the app. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const group = inject(GroupService);
  const router = inject(Router);
  if (!auth.isSignedIn()) return true;
  return router.createUrlTree([group.hasGroup() ? '/home' : '/onboarding']);
};
