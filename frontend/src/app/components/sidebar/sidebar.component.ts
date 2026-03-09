import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

interface NavItem { label: string; icon: string; route: string; badgeId?: string; }
interface NavSection { title: string; items: NavItem[]; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="sidebar-brand">
      <div class="sidebar-brand-icon">A</div>
      <span class="sidebar-brand-text">AKOHO</span>
    </div>
    <nav class="sidebar-nav">
      @for (section of sections; track section.title) {
        <div class="sidebar-section">
          <div class="sidebar-section-label">{{ section.title }}</div>
          @for (item of section.items; track item.route) {
            <a class="sidebar-link" [routerLink]="item.route" routerLinkActive="active">
              <i class="bi" [ngClass]="item.icon"></i>
              {{ item.label }}
            </a>
          }
        </div>
      }
    </nav>
  `
})
export class SidebarComponent {
  sections: NavSection[] = [
    {
      title: 'Élevage',
      items: [
        { label: 'Dashboard', icon: 'bi-grid-1x2', route: '/dashboard' },
        { label: 'Lots', icon: 'bi-collection', route: '/lots' },
        { label: 'Fiches', icon: 'bi-journal-text', route: '/fiches' },
      ]
    },
    {
      title: 'Œufs',
      items: [
        { label: 'Production', icon: 'bi-egg', route: '/oeufs' },
        { label: 'Couvaison', icon: 'bi-thermometer-half', route: '/couvaison' },
        { label: 'Pertes', icon: 'bi-heartbreak', route: '/pertes' },
      ]
    },
    {
      title: 'Finance',
      items: [
        { label: 'Ventes', icon: 'bi-cart3', route: '/ventes' },
        { label: 'Rentabilité', icon: 'bi-graph-up-arrow', route: '/rentabilite' },
      ]
    },
    {
      title: 'Référentiels',
      items: [
        { label: 'Races', icon: 'bi-bookmarks', route: '/races' },
        { label: 'Nourriture', icon: 'bi-basket2', route: '/nourriture' },
      ]
    },
    {
      title: 'Outils',
      items: [
        { label: 'Calendrier', icon: 'bi-calendar3', route: '/calendrier' },
        { label: 'Paramètres', icon: 'bi-gear', route: '/parametres' },
      ]
    }
  ];
}
