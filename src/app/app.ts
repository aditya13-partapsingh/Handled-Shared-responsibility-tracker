import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { ToastsComponent } from './shared/widgets';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastsComponent],
  template: `
    <router-outlet />
    <app-toasts />
  `,
})
export class App {
  // Instantiated eagerly so the theme is applied before the first route renders.
  private readonly theme = inject(ThemeService);
}
