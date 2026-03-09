import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

export interface ApiResponse<T> { data: T | null; error: string | null; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = '/api';

  constructor(private http: HttpClient) {}

  private extractError(err: any): string {
    return err?.error?.error || err?.message || 'Erreur réseau';
  }

  private get<T>(url: string): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(this.base + url).pipe(
      catchError(err => of({ data: null as T | null, error: this.extractError(err) }))
    );
  }

  private post<T>(url: string, body: any): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.base + url, body).pipe(
      catchError(err => of({ data: null as T | null, error: this.extractError(err) }))
    );
  }

  private put<T>(url: string, body: any): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(this.base + url, body).pipe(
      catchError(err => of({ data: null as T | null, error: this.extractError(err) }))
    );
  }

  private del<T>(url: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(this.base + url).pipe(
      catchError(err => of({ data: null as T | null, error: this.extractError(err) }))
    );
  }

  // Status
  getStatus() { return this.get<any>('/status'); }
  getSchema() { return this.get<any>('/schema'); }

  // Races
  getRaces() { return this.get<any[]>('/races'); }
  createRace(body: any) { return this.post<any>('/races', body); }
  updateRace(id: number, body: any) { return this.put<any>(`/races/${id}`, body); }
  deleteRace(id: number) { return this.del<any>(`/races/${id}`); }

  // Nourriture
  getNourriture() { return this.get<any[]>('/nourriture'); }
  createNourriture(body: any) { return this.post<any>('/nourriture', body); }
  updateNourriture(id: number, body: any) { return this.put<any>(`/nourriture/${id}`, body); }
  deleteNourriture(id: number) { return this.del<any>(`/nourriture/${id}`); }

  // Fiches
  getFiches() { return this.get<any[]>('/fiches'); }
  getFiche(id: number) { return this.get<any>(`/fiches/${id}`); }
  createFiche(body: any) { return this.post<any>('/fiches', body); }
  updateFiche(id: number, body: any) { return this.put<any>(`/fiches/${id}`, body); }

  // Lots
  getLots() { return this.get<any[]>('/lots'); }
  createLot(body: any) { return this.post<any>('/lots', body); }
  getStockOeufs(idLot: number) { return this.get<any>(`/lots/${idLot}/stock_oeufs`); }
  getPoidsLot(idLot: number, date: string) { return this.get<any>(`/lots/${idLot}/poids?date=${date}`); }

  // Oeufs
  getOeufs(date?: string | null, lot?: string | null) {
    const params: string[] = [];
    if (date) params.push('date=' + date);
    if (lot) params.push('lot=' + lot);
    const qs = params.length ? '?' + params.join('&') : '';
    return this.get<any[]>('/oeufs' + qs);
  }
  createOeuf(body: any) { return this.post<any>('/oeufs', body); }
  deleteOeuf(id: number) { return this.del<any>(`/oeufs/${id}`); }

  // Pertes
  getPertes() { return this.get<any[]>('/pertes'); }
  createPerte(body: any) { return this.post<any>('/pertes', body); }

  // Couvaisons
  getCouvaisons() { return this.get<any[]>('/couvaisons'); }
  createCouvaison(body: any) { return this.post<any>('/couvaisons', body); }
  eclore(id: number, body: any) { return this.post<any>(`/couvaisons/${id}/eclore`, body); }

  // Ventes
  getVentesOeufs() { return this.get<any[]>('/ventes/oeufs'); }
  getVentesPoulets() { return this.get<any[]>('/ventes/poulets'); }
  getVentesLots() { return this.get<any[]>('/ventes/lots'); }
  createVenteOeuf(body: any) { return this.post<any>('/ventes/oeufs', body); }
  createVentePoulet(body: any) { return this.post<any>('/ventes/poulets', body); }
  createVenteLot(body: any) { return this.post<any>('/ventes/lots', body); }

  // Dashboard & Rentabilité
  getDashboard(date: string) { return this.get<any[]>(`/dashboard?date=${date}`); }
  getRentabilite(date: string) { return this.get<any[]>(`/rentabilite?date=${date}`); }

  // Events
  getEvents(from: string, to: string) { return this.get<any[]>(`/events?from=${from}&to=${to}`); }

  // Paramètres
  getParametres() { return this.get<any[]>('/parametres'); }
  updateParametre(cle: string, valeur: string) { return this.put<any>(`/parametres/${cle}`, { valeur }); }

  // Fiche par défaut
  getFicheDefaut() { return this.get<any[]>('/fiche-defaut'); }
  updateFicheDefautRow(id: number, body: any) { return this.put<any[]>(`/fiche-defaut/${id}`, body); }
  createFicheDefautRow(body: any) { return this.post<any[]>('/fiche-defaut', body); }
  deleteFicheDefautRow(id: number) { return this.del<any[]>(`/fiche-defaut/${id}`); }
  saveFicheDefaut(rows: any[]) { return this.put<any[]>('/fiche-defaut', { rows }); }
}
