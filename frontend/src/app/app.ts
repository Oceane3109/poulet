import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, FooterComponent, ToastComponent],
  template: `
    <div class="app-layout">
      <aside class="app-sidebar">
        <app-sidebar />
      </aside>
      <div class="app-main">
        <header class="app-header">
          <app-header />
        </header>
        <main class="app-content">
          <router-outlet />
        </main>
        <footer class="app-footer">
          <app-footer />
        </footer>
      </div>
    </div>
    <app-toast />
  `
})
export class App {}
