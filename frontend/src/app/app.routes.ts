import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'lots', loadComponent: () => import('./pages/lots/lots.component').then(m => m.LotsComponent) },
  { path: 'fiches', loadComponent: () => import('./pages/fiches/fiches.component').then(m => m.FichesComponent) },
  { path: 'oeufs', loadComponent: () => import('./pages/oeufs/oeufs.component').then(m => m.OeufsComponent) },
  { path: 'pertes', loadComponent: () => import('./pages/pertes/pertes.component').then(m => m.PertesComponent) },
  { path: 'couvaison', loadComponent: () => import('./pages/couvaison/couvaison.component').then(m => m.CouvaisonComponent) },
  { path: 'ventes', loadComponent: () => import('./pages/ventes/ventes.component').then(m => m.VentesComponent) },
  { path: 'rentabilite', loadComponent: () => import('./pages/rentabilite/rentabilite.component').then(m => m.RentabiliteComponent) },
  { path: 'races', loadComponent: () => import('./pages/races/races.component').then(m => m.RacesComponent) },
  { path: 'nourriture', loadComponent: () => import('./pages/nourriture/nourriture.component').then(m => m.NourritureComponent) },
  { path: 'calendrier', loadComponent: () => import('./pages/calendrier/calendrier.component').then(m => m.CalendrierComponent) },
];
