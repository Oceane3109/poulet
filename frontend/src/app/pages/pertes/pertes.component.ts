import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { DateService } from '../../services/date.service';
import { ToastService } from '../../services/toast.service';
import { FormatNumberPipe, FormatDatePipe } from '../../pipes/format.pipe';

@Component({
  selector: 'app-pertes',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatNumberPipe, FormatDatePipe],
  templateUrl: './pertes.component.html'
})
export class PertesComponent implements OnInit, OnDestroy {
  lots: any[] = [];
  allPertes: any[] = [];
  filtered: any[] = [];
  causes: string[] = [];

  // KPIs
  kpiJour = 0;
  kpiMois = 0;
  kpiTotal = 0;
  kpiLot = '—';

  // Filters
  filterLot = '';
  filterCause = '';
  filterEntite = '';
  filterFrom = '';
  filterTo = '';

  // Modal
  showModal = false;
  addLot: number | null = null;
  addDate = '';
  addNb: number | null = null;
  addEntite = 'Poulet';
  addCause = '';

  private sub!: Subscription;

  constructor(private api: ApiService, private dateService: DateService, private toast: ToastService) {}

  ngOnInit() {
    this.api.getLots().subscribe(res => {
      this.lots = res.data || [];
      if (this.lots.length) this.addLot = this.lots[0].id_lot;
    });
    this.sub = this.dateService.date$.subscribe(() => this.loadData());
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  loadData() {
    this.api.getPertes().subscribe(res => {
      this.allPertes = res.data || [];
      this.updateKPIs();
      this.causes = [...new Set(this.allPertes.map(p => p.cause).filter(Boolean))];
      this.applyFilters();
    });
  }

  updateKPIs() {
    const date = this.dateService.getDate();
    const d = new Date(date);
    const month = d.getMonth();
    const year = d.getFullYear();

    this.kpiJour = this.allPertes
      .filter(p => p.date_perte?.substring(0, 10) === date)
      .reduce((s, p) => s + (p.nb_perdus || 0), 0);

    this.kpiMois = this.allPertes
      .filter(p => { const pd = new Date(p.date_perte); return pd.getMonth() === month && pd.getFullYear() === year; })
      .reduce((s, p) => s + (p.nb_perdus || 0), 0);

    this.kpiTotal = this.allPertes.reduce((s, p) => s + (p.nb_perdus || 0), 0);

    const lotCounts: Record<number, number> = {};
    this.allPertes.forEach(p => lotCounts[p.id_lot] = (lotCounts[p.id_lot] || 0) + (p.nb_perdus || 0));
    let maxId = 0, maxCount = 0;
    for (const [id, count] of Object.entries(lotCounts)) {
      if ((count as number) > maxCount) { maxCount = count as number; maxId = +id; }
    }
    if (maxId) {
      const lot = this.lots.find(l => l.id_lot === maxId);
      this.kpiLot = lot ? `${lot.nom_lot} (${maxCount})` : `Lot #${maxId} (${maxCount})`;
    } else {
      this.kpiLot = '—';
    }
  }

  applyFilters() {
    let list = [...this.allPertes];
    if (this.filterLot) list = list.filter(p => p.id_lot === +this.filterLot);
    if (this.filterCause) list = list.filter(p => p.cause === this.filterCause);
    if (this.filterEntite) list = list.filter(p => (p.entite || 'Poulet') === this.filterEntite);
    if (this.filterFrom) list = list.filter(p => p.date_perte?.substring(0, 10) >= this.filterFrom);
    if (this.filterTo) list = list.filter(p => p.date_perte?.substring(0, 10) <= this.filterTo);
    this.filtered = list.sort((a, b) => new Date(b.date_perte).getTime() - new Date(a.date_perte).getTime());
  }

  clearFilters() {
    this.filterLot = '';
    this.filterCause = '';
    this.filterEntite = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.applyFilters();
  }

  getLotName(id: number): string {
    return this.lots.find(l => l.id_lot === id)?.nom_lot || 'Lot #' + id;
  }

  openModal() {
    this.addDate = this.dateService.getDate();
    this.addNb = null;
    this.addCause = '';
    this.addEntite = 'Poulet';
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  submitAdd() {
    if (!this.addLot || !this.addDate || !this.addNb || this.addNb <= 0) {
      this.toast.show('Veuillez remplir tous les champs obligatoires', 'warning');
      return;
    }
    this.api.createPerte({
      id_lot: this.addLot,
      date_perte: this.addDate,
      nb_perdus: this.addNb,
      cause: this.addCause.trim() || null,
      entite: this.addEntite
    }).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.closeModal();
      this.toast.show('Perte enregistrée', 'success');
      this.loadData();
    });
  }
}
