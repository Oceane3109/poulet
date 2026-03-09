import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { DateService } from '../../services/date.service';
import { ToastService } from '../../services/toast.service';
import { FormatNumberPipe, FormatDatePipe } from '../../pipes/format.pipe';

const COUVAISON_DAYS = 45;

@Component({
  selector: 'app-couvaison',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatNumberPipe, FormatDatePipe],
  templateUrl: './couvaison.component.html'
})
export class CouvaisonComponent implements OnInit, OnDestroy {
  lots: any[] = [];
  couvaisons: any[] = [];
  activeList: any[] = [];
  historyList: any[] = [];

  // KPIs
  kpiEncours = 0;
  kpiImminente = 0;
  kpiTerminees = 0;
  kpiTotalOeufs = 0;

  // Filters
  filterLot = '';
  filterStatus = '';

  // New modal
  showNewModal = false;
  newLot: number | null = null;
  newDate = '';
  newNb: number | null = null;
  newPreview = 'Éclosion prévue : —';

  // Eclosion modal
  showEcloreModal = false;
  ecloreId: number | null = null;
  ecloreInfo = '';
  ecloreNb: number | null = null;
  ecloreNom = '';
  ecloreMax = 0;

  private sub!: Subscription;

  constructor(private api: ApiService, private dateService: DateService, private toast: ToastService) {}

  ngOnInit() {
    this.api.getLots().subscribe(res => {
      this.lots = res.data || [];
      if (this.lots.length) this.newLot = this.lots[0].id_lot;
    });
    this.sub = this.dateService.date$.subscribe(() => this.loadData());
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  loadData() {
    this.api.getCouvaisons().subscribe(res => {
      this.couvaisons = res.data || [];
      this.updateKPIs();
      this.renderFiltered();
    });
  }

  updateKPIs() {
    const today = new Date(this.dateService.getDate());
    const active = this.couvaisons.filter(c => c.nb_ecloses == null);
    const done = this.couvaisons.filter(c => c.nb_ecloses != null);
    const imminent = active.filter(c => {
      const diff = Math.ceil((new Date(c.date_eclosion).getTime() - today.getTime()) / 86400000);
      return diff <= 5 && diff >= 0;
    });

    this.kpiEncours = active.length;
    this.kpiImminente = imminent.length;
    this.kpiTerminees = done.length;
    this.kpiTotalOeufs = this.couvaisons.reduce((s, c) => s + (c.nb_oeufs_couves || 0), 0);
  }

  renderFiltered() {
    let list = [...this.couvaisons];
    if (this.filterLot) list = list.filter(c => c.id_lot_mere === +this.filterLot);
    if (this.filterStatus === 'active') list = list.filter(c => c.nb_ecloses == null);
    else if (this.filterStatus === 'done') list = list.filter(c => c.nb_ecloses != null);

    this.activeList = list.filter(c => c.nb_ecloses == null);
    this.historyList = list.filter(c => c.nb_ecloses != null);
  }

  clearFilters() {
    this.filterLot = '';
    this.filterStatus = '';
    this.renderFiltered();
  }

  getLotName(id: number): string {
    return this.lots.find(l => l.id_lot === id)?.nom_lot || '#' + id;
  }

  getProgress(c: any): number {
    const today = new Date(this.dateService.getDate());
    const start = new Date(c.date_mise_couvaison);
    const elapsed = Math.max(0, Math.ceil((today.getTime() - start.getTime()) / 86400000));
    return Math.min(100, Math.round((elapsed / COUVAISON_DAYS) * 100));
  }

  getRemaining(c: any): number {
    const today = new Date(this.dateService.getDate());
    return Math.max(0, Math.ceil((new Date(c.date_eclosion).getTime() - today.getTime()) / 86400000));
  }

  isUrgent(c: any): boolean {
    return this.getRemaining(c) <= 5;
  }

  getTaux(c: any): number {
    return c.nb_oeufs_couves > 0 ? Math.round((c.nb_ecloses / c.nb_oeufs_couves) * 100) : 0;
  }

  getTauxClass(c: any): string {
    const t = this.getTaux(c);
    return t >= 70 ? 'badge-success' : t >= 40 ? 'badge-warning' : 'badge-danger';
  }

  // --- New couvaison ---
  openNewModal() {
    this.newDate = this.dateService.getDate();
    this.newNb = null;
    this.updateNewPreview();
    this.showNewModal = true;
  }

  closeNewModal() { this.showNewModal = false; }

  updateNewPreview() {
    if (this.newDate) {
      const ecl = new Date(this.newDate);
      ecl.setDate(ecl.getDate() + COUVAISON_DAYS);
      this.newPreview = `Éclosion prévue : ${ecl.toLocaleDateString('fr-FR')}`;
    } else {
      this.newPreview = 'Éclosion prévue : —';
    }
  }

  submitNew() {
    if (!this.newLot || !this.newDate || !this.newNb || this.newNb <= 0) {
      this.toast.show('Veuillez remplir tous les champs', 'warning');
      return;
    }
    this.api.createCouvaison({
      id_lot_mere: this.newLot,
      date_mise_couvaison: this.newDate,
      nb_oeufs_couves: this.newNb
    }).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.closeNewModal();
      this.toast.show('Couvaison lancée avec succès', 'success');
      this.api.getLots().subscribe(lr => { this.lots = lr.data || []; });
      this.loadData();
    });
  }

  // --- Eclosion ---
  openEcloreModal(id: number) {
    this.ecloreId = id;
    const couv = this.couvaisons.find(c => c.id_couvaison === id);
    const lot = this.lots.find(l => l.id_lot === couv?.id_lot_mere);
    this.ecloreInfo = couv
      ? `${couv.nb_oeufs_couves} œufs de ${lot ? lot.nom_lot : 'Lot #' + couv.id_lot_mere} — éclosion prévue le ${new Date(couv.date_eclosion).toLocaleDateString('fr-FR')}`
      : '';
    this.ecloreMax = couv ? couv.nb_oeufs_couves : 0;
    this.ecloreNb = null;
    this.ecloreNom = '';
    this.showEcloreModal = true;
  }

  closeEcloreModal() { this.showEcloreModal = false; this.ecloreId = null; }

  submitEclore() {
    if (!this.ecloreId || !this.ecloreNb || this.ecloreNb <= 0 || !this.ecloreNom.trim()) {
      this.toast.show('Veuillez remplir tous les champs', 'warning');
      return;
    }
    this.api.eclore(this.ecloreId, { nb_ecloses: this.ecloreNb, nom_lot: this.ecloreNom.trim() }).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.closeEcloreModal();
      this.toast.show(`Éclosion enregistrée — ${this.ecloreNb} poussins dans ${this.ecloreNom}`, 'success');
      this.api.getLots().subscribe(lr => {
        this.lots = lr.data || [];
        if (this.lots.length) this.newLot = this.lots[0].id_lot;
      });
      this.loadData();
    });
  }
}
