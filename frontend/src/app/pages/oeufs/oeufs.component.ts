import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { DateService } from '../../services/date.service';
import { ToastService } from '../../services/toast.service';
import { FormatNumberPipe, FormatArPipe, FormatDatePipe } from '../../pipes/format.pipe';

@Component({
  selector: 'app-oeufs',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatNumberPipe, FormatArPipe, FormatDatePipe],
  templateUrl: './oeufs.component.html'
})
export class OeufsComponent implements OnInit, OnDestroy {
  lots: any[] = [];
  oeufs: any[] = [];
  filtered: any[] = [];

  // KPIs
  kpiTotal = 0;
  kpiVendu = 0;
  kpiStock = 0;
  kpiCouvaison = '-';
  saleRate = 0;

  // Filters
  filterLot = '';
  filterFrom = '';
  filterTo = '';

  // Modal
  showModal = false;
  addLot: number | null = null;
  addDate = '';
  addNb: number | null = null;

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
    const date = this.dateService.getDate();
    const lot = this.filterLot || undefined;

    this.api.getOeufs(undefined, lot).subscribe(res => {
      this.oeufs = res.data || [];
      this.api.getDashboard(date).subscribe(dRes => {
        const dash = dRes.data || [];
        const totalStock = dash.reduce((s: number, r: any) => s + (r.stock_oeufs || 0), 0);
        const prodTotal = this.oeufs.reduce((s: number, o: any) => s + (o.nb_oeufs || 0), 0);
        const estimatedVendu = Math.max(0, prodTotal - totalStock);

        this.kpiTotal = prodTotal;
        this.kpiStock = totalStock;
        this.kpiVendu = estimatedVendu;
        this.saleRate = prodTotal > 0 ? Math.round((estimatedVendu / prodTotal) * 100) : 0;
        this.applyFilters();
      });
    });
  }

  applyFilters() {
    let list = [...this.oeufs];
    if (this.filterFrom) list = list.filter(o => o.date_production?.substring(0, 10) >= this.filterFrom);
    if (this.filterTo) list = list.filter(o => o.date_production?.substring(0, 10) <= this.filterTo);
    this.filtered = list.sort((a, b) => new Date(b.date_production).getTime() - new Date(a.date_production).getTime());
  }

  clearFilters() {
    this.filterLot = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.loadData();
  }

  getLotName(id: number): string {
    return this.lots.find(l => l.id_lot === id)?.nom_lot || 'Lot #' + id;
  }

  openModal() {
    this.addDate = this.dateService.getDate();
    this.addNb = null;
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  submitAdd() {
    if (!this.addLot || !this.addDate || !this.addNb || this.addNb <= 0) {
      this.toast.show('Veuillez remplir tous les champs', 'warning');
      return;
    }
    this.api.createOeuf({ id_lot: this.addLot, date_production: this.addDate, nb_oeufs: this.addNb }).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.closeModal();
      this.toast.show('Production enregistrée', 'success');
      this.loadData();
    });
  }

  deleteOeuf(id: number) {
    if (!confirm('Supprimer cette production ?')) return;
    this.api.deleteOeuf(id).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.toast.show('Production supprimée', 'success');
      this.loadData();
    });
  }
}
