import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { FormatNumberPipe, FormatArPipe } from '../../pipes/format.pipe';

@Component({
  selector: 'app-fiches',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatNumberPipe, FormatArPipe],
  templateUrl: './fiches.component.html'
})
export class FichesComponent implements OnInit {
  lots: any[] = [];
  nourriture: any[] = [];
  selectedLotId: number | null = null;
  selectedLot: any = null;
  ficheRows: any[] = [];
  savedRows: any[] = [];
  hasChanges = false;

  addNourr: number | null = null;
  addPoids = 0;
  addVar = 0;

  showClearModal = false;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.loadData(); }

  async loadData() {
    const [lotsRes, nourrRes] = await Promise.all([
      this.api.getLots().toPromise(),
      this.api.getNourriture().toPromise()
    ]);
    this.lots = lotsRes?.data || [];
    this.nourriture = nourrRes?.data || [];
    this.addNourr = this.nourriture[0]?.id_nourriture || null;
  }

  async onLotChange() {
    if (!this.selectedLotId) { this.selectedLot = null; this.ficheRows = []; return; }
    const lot = this.lots.find((l: any) => l.id_lot === this.selectedLotId);
    if (!lot || !lot.id_fiche) { this.selectedLot = lot; this.ficheRows = []; return; }
    this.selectedLot = lot;
    const { data } = await this.api.getFiche(lot.id_fiche).toPromise() ?? { data: null };
    this.ficheRows = (data?.rows || []).map((r: any) => ({ ...r, _saved: true }));
    this.savedRows = this.ficheRows.map((r: any) => ({ ...r }));
    this.hasChanges = false;
  }

  getNourritureName(id: number): string {
    return this.nourriture.find((n: any) => n.id_nourriture === id)?.nom_nourriture || '?';
  }

  getCost(row: any): number {
    const n = this.nourriture.find((x: any) => x.id_nourriture === row.id_nourriture);
    return n ? row.poids * n.prix_gramme : 0;
  }

  getNextSemaine(): number { return this.ficheRows.length + 1; }
  getNextAge(): number {
    return this.selectedLot ? (this.selectedLot.age_arrivee - 1 + this.getNextSemaine()) : this.getNextSemaine();
  }

  computeCurrentWeek(): number {
    if (!this.selectedLot) return 0;
    const today = new Date();
    const arrival = new Date(this.selectedLot.date_arrivee);
    const weeks = Math.floor((today.getTime() - arrival.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return this.selectedLot.age_arrivee + Math.max(0, weeks);
  }

  getRowStatus(row: any): string {
    const cur = this.computeCurrentWeek();
    if (row.age < cur) return 'passed';
    if (row.age === cur) return 'current';
    return 'upcoming';
  }

  addRow() {
    this.ficheRows.push({
      semaine: this.getNextSemaine(),
      age: this.getNextAge(),
      id_nourriture: this.addNourr,
      poids: this.addPoids,
      variation: this.addVar,
      _saved: false
    });
    this.addPoids = 0;
    this.addVar = 0;
    this.hasChanges = true;
  }

  removeLastRow() {
    if (this.ficheRows.length) {
      this.ficheRows.pop();
      this.hasChanges = true;
    }
  }

  clearAll() {
    this.ficheRows = [];
    this.showClearModal = false;
    this.hasChanges = true;
    this.toast.show('Fiche vidée — pensez à sauvegarder', 'warning');
  }

  async saveFiche() {
    if (!this.selectedLot?.id_fiche) return;
    const payload = {
      id_lot: this.selectedLot.id_lot,
      semaines: this.ficheRows.map((r: any) => ({
        semaine: r.semaine, age: r.age,
        id_nourriture: r.id_nourriture,
        poids: r.poids, variation: r.variation
      }))
    };
    const { error } = await this.api.updateFiche(this.selectedLot.id_fiche, payload).toPromise() ?? { error: 'Erreur' };
    if (error) { this.toast.show('Erreur : ' + error, 'danger'); return; }
    this.ficheRows = this.ficheRows.map((r: any) => ({ ...r, _saved: true }));
    this.savedRows = this.ficheRows.map((r: any) => ({ ...r }));
    this.hasChanges = false;
    this.toast.show('Fiche sauvegardée', 'success');
  }

  exportCSV() {
    if (!this.ficheRows.length || !this.selectedLot) return;
    const headers = ['semaine', 'age', 'nourriture', 'poids_g', 'variation_g', 'cout_estime'];
    const rows = this.ficheRows.map((r: any) => {
      const n = this.nourriture.find((x: any) => x.id_nourriture === r.id_nourriture);
      return [r.semaine, r.age, n ? n.nom_nourriture : r.id_nourriture, r.poids, r.variation, n ? (r.poids * n.prix_gramme).toFixed(2) : ''].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fiche_${this.selectedLot.nom_lot}.csv`;
    a.click();
  }
}
