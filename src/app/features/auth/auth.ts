import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GroupService } from '../../core/services/group.service';
import { ThemeService } from '../../core/services/theme.service';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../../core/utils/seed';
import { AvatarComponent } from '../../shared/avatar';
import { IconComponent } from '../../shared/icon';

/** Two-panel auth layout: product pitch + phone mockup on the left, form on the right. */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, IconComponent, AvatarComponent],
  template: `
    <div class="auth">
      <section class="pitch">
        <div class="brand">
          <span class="brand-mark"><app-icon name="check" [size]="18" [stroke]="3" /></span>
          <span>Handled</span>
        </div>
        <h1>Nothing important<br />falls through the cracks.</h1>
        <p class="lead">
          One shared space where every bill, chore and errand has a clear owner, a deadline and a status —
          and where tasks <strong>nobody</strong> has picked up get flagged before they're missed.
        </p>

        <div class="phone">
          <div class="phone-hero">
            <div class="row">
              <app-avatar name="Adam Smith" [colorIndex]="0" [size]="34" [ring]="true" />
              <div>
                <div class="tiny" style="opacity: 0.85">Good morning,</div>
                <div class="strong">Adam Smith</div>
              </div>
            </div>
            <div class="mini-stats">
              <div class="mini"><b>3</b><span>No owner</span></div>
              <div class="mini"><b>2</b><span>Overdue</span></div>
              <div class="mini"><b>4</b><span>Today</span></div>
            </div>
          </div>
          <div class="phone-list">
            <div class="mini-row">
              <app-avatar [unowned]="true" [size]="30" />
              <div class="grow"><div class="strong tiny">Pay electricity bill</div><div class="tiny faint">Due in 2 days · <span class="text-danger">No owner</span></div></div>
              <span class="dot danger"></span>
            </div>
            <div class="mini-row">
              <app-avatar name="Tamara Reed" [colorIndex]="5" [size]="30" />
              <div class="grow"><div class="strong tiny">Buy groceries</div><div class="tiny faint">Due today · rotates weekly</div></div>
              <span class="dot warning"></span>
            </div>
            <div class="mini-row">
              <app-avatar name="Johnny Lee" [colorIndex]="2" [size]="30" />
              <div class="grow"><div class="strong tiny">Call the plumber</div><div class="tiny faint">Overdue by 3 days</div></div>
              <span class="dot danger"></span>
            </div>
            <div class="mini-row">
              <app-avatar name="Samantha James" [colorIndex]="3" [size]="30" />
              <div class="grow"><div class="strong tiny">Return the shoes order</div><div class="tiny faint">Due tomorrow</div></div>
              <span class="dot success"></span>
            </div>
          </div>
        </div>

        <ul class="perks">
          <li><app-icon name="alert-triangle" [size]="16" /> "No Owner" detection for important tasks</li>
          <li><app-icon name="repeat" [size]="16" /> Recurring tasks that rotate between people</li>
          <li><app-icon name="bar-chart" [size]="16" /> Spot overdue &amp; frequently missed responsibilities</li>
        </ul>
      </section>

      <section class="panel">
        <div class="panel-inner">
          <router-outlet />
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .auth {
        min-height: 100dvh;
        display: grid;
        grid-template-columns: 1fr;
      }
      @media (min-width: 900px) {
        .auth {
          grid-template-columns: 1.1fr 1fr;
        }
      }
      .pitch {
        display: none;
        background: var(--grad);
        color: #fff;
        padding: 48px;
        position: relative;
        overflow: hidden;
        flex-direction: column;
        gap: 22px;
      }
      .pitch::before {
        content: '';
        position: absolute;
        inset: auto -20% -30% auto;
        width: 70%;
        aspect-ratio: 1;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.2), transparent 65%);
      }
      @media (min-width: 900px) {
        .pitch {
          display: flex;
        }
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
        background: rgba(255, 255, 255, 0.2);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      h1 {
        font-size: 2.4rem;
        line-height: 1.1;
        margin-top: 12px;
      }
      .lead {
        font-size: 1.05rem;
        opacity: 0.9;
        max-width: 480px;
      }
      .phone {
        width: 320px;
        border-radius: 30px;
        background: var(--bg);
        color: var(--text);
        border: 8px solid #0f1322;
        box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
        overflow: hidden;
        margin-top: 10px;
        transform: rotate(-3deg);
        position: relative;
      }
      .phone-hero {
        background: var(--grad);
        padding: 18px 16px;
        border-radius: 0 0 22px 22px;
        color: #fff;
      }
      .mini-stats {
        display: flex;
        gap: 8px;
        margin-top: 14px;
      }
      .mini {
        flex: 1;
        background: rgba(255, 255, 255, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 12px;
        padding: 8px;
        display: flex;
        flex-direction: column;
      }
      .mini b {
        font-size: 1.2rem;
      }
      .mini span {
        font-size: 0.7rem;
        opacity: 0.85;
      }
      .phone-list {
        padding: 10px 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .mini-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 12px;
        background: var(--surface);
      }
      .perks {
        list-style: none;
        padding: 0;
        margin: 8px 0 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-weight: 500;
      }
      .perks li {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .panel {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 16px 48px;
      }
      .panel-inner {
        width: 100%;
        max-width: 420px;
      }
    `,
  ],
})
export class AuthLayoutComponent {
  constructor() {
    inject(ThemeService);
  }
}

@Component({
  selector: 'app-sign-in',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="mobile-brand">
      <span class="brand-mark"><app-icon name="check" [size]="18" [stroke]="3" /></span> Handled
    </div>
    <h1>Welcome back</h1>
    <p class="muted mt-sm">Sign in to see what needs an owner today.</p>

    <form class="stack gap-lg mt" (submit)="submit($event)">
      @if (error()) {
        <div class="form-error">{{ error() }}</div>
      }
      <div class="field">
        <label class="label" for="si-email">Email</label>
        <div class="input-wrap">
          <app-icon name="mail" [size]="18" />
          <input id="si-email" class="input" type="email" [(ngModel)]="email" name="email" placeholder="you@example.com" autocomplete="email" required />
        </div>
      </div>
      <div class="field">
        <label class="label" for="si-pass">Password</label>
        <div class="input-wrap">
          <app-icon name="lock" [size]="18" />
          <input id="si-pass" class="input" [type]="show() ? 'text' : 'password'" [(ngModel)]="password" name="password" placeholder="••••••••" autocomplete="current-password" required />
          <button type="button" class="btn btn-ghost btn-icon btn-sm trail" (click)="show.set(!show())" aria-label="Toggle password">
            <app-icon [name]="show() ? 'eye-off' : 'eye'" [size]="17" />
          </button>
        </div>
      </div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Sign in <app-icon name="arrow-right" [size]="18" /></button>
    </form>

    <div class="or"><span>or</span></div>
    <button class="btn btn-outline btn-lg btn-block" (click)="demo()">
      <app-icon name="play" [size]="18" /> Try the demo household
    </button>
    <p class="tiny faint text-center mt-sm">Demo account: {{ demoEmail }} / {{ demoPassword }}</p>

    <p class="text-center mt muted small">New here? <a routerLink="/auth/sign-up" class="text-primary strong">Create an account</a></p>
  `,
  styles: [
    `
      .mobile-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 800;
        font-size: 1.2rem;
        margin-bottom: 28px;
      }
      @media (min-width: 900px) {
        .mobile-brand {
          display: none;
        }
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
      .or {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 18px 0;
        color: var(--text-3);
        font-size: 0.8rem;
      }
      .or::before,
      .or::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border);
      }
    `,
  ],
})
export class SignInComponent {
  private readonly auth = inject(AuthService);
  private readonly group = inject(GroupService);
  private readonly router = inject(Router);

  readonly demoEmail = DEMO_EMAIL;
  readonly demoPassword = DEMO_PASSWORD;
  readonly error = signal('');
  readonly show = signal(false);
  email = '';
  password = '';

  submit(e: Event): void {
    e.preventDefault();
    const res = this.auth.signIn(this.email, this.password);
    if (!res.ok) {
      this.error.set(res.error ?? 'Could not sign in.');
      return;
    }
    this.enter();
  }

  demo(): void {
    this.auth.signInDemo();
    this.enter();
  }

  private enter(): void {
    this.router.navigate([this.group.hasGroup() ? '/home' : '/onboarding']);
  }
}

@Component({
  selector: 'app-sign-up',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <h1>Create your account</h1>
    <p class="muted mt-sm">Then set up your household, flat or team in under a minute.</p>

    <form class="stack gap-lg mt" (submit)="submit($event)">
      @if (error()) {
        <div class="form-error">{{ error() }}</div>
      }
      <div class="field">
        <label class="label" for="su-name">Your name</label>
        <div class="input-wrap">
          <app-icon name="user" [size]="18" />
          <input id="su-name" class="input" [(ngModel)]="name" name="name" placeholder="Priya Sharma" autocomplete="name" required />
        </div>
      </div>
      <div class="field">
        <label class="label" for="su-email">Email</label>
        <div class="input-wrap">
          <app-icon name="mail" [size]="18" />
          <input id="su-email" class="input" type="email" [(ngModel)]="email" name="email" placeholder="you@example.com" autocomplete="email" required />
        </div>
      </div>
      <div class="field">
        <label class="label" for="su-pass">Password</label>
        <div class="input-wrap">
          <app-icon name="lock" [size]="18" />
          <input id="su-pass" class="input" type="password" [(ngModel)]="password" name="password" placeholder="At least 6 characters" autocomplete="new-password" required />
        </div>
        <span class="hint">Stored only in this browser — this app has no server.</span>
      </div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Continue <app-icon name="arrow-right" [size]="18" /></button>
    </form>

    <p class="text-center mt muted small">Already have an account? <a routerLink="/auth/sign-in" class="text-primary strong">Sign in</a></p>
  `,
})
export class SignUpComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal('');
  name = '';
  email = '';
  password = '';

  submit(e: Event): void {
    e.preventDefault();
    const res = this.auth.signUp(this.name, this.email, this.password);
    if (!res.ok) {
      this.error.set(res.error ?? 'Could not create the account.');
      return;
    }
    this.router.navigate(['/onboarding']);
  }
}
