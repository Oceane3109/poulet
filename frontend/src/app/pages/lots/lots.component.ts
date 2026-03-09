import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { DateService } from '../../services/date.service';
import { ToastService } from '../../services/toast.service';
import { FormatNumberPipe, FormatArPipe, FormatDatePipe } from '../../pipes/format.pipe';

@Component({
  selector: 'app-lots',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatNumberPipe, FormatArPipe, FormatDatePipe],
  templateUrl: './lots.component.html'
})
export class LotsComponent implements OnInit {
  lots: any[] = [];
  filteredLots: any[] = [];
  races: any[] = [];
  fiches: any[] = [];
  nourriture: any[] = [];

  filterSearch = '';
  filterRace = '';
  filterOrigine = '';

  showModal = false;
  step = 1;

  // Step 1 data
  newLot: any = { nom_lot: '', id_race: null, nombre: null, age_arrivee: 1, date_arrivee: '', origine: 'achat', prix_achat: 0, id_lot_mere: null };
  modalError = '';

  // Step 2 data
  ficheMode: 'manual' | 'existing' | 'default' = 'default';
  selectedFicheId: number | null = null;
  manualRows: any[] = [];
  addPoids = 0;
  addVar = 0;
  addNourr: number | null = null;

  constructor(private api: ApiService, private dateService: DateService, private toast: ToastService) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    const [lotsRes, racesRes, fichesRes, nourrRes] = await Promise.all([
      this.api.getLots().toPromise(),
      this.api.getRaces().toPromise(),
      this.api.getFiches().toPromise(),
      this.api.getNourriture().toPromise()
    ]);
    this.lots = lotsRes?.data || [];
    this.races = racesRes?.data || [];
    this.fiches = fichesRes?.data || [];
    this.nourriture = nourrRes?.data || [];
    this.newLot.date_arrivee = this.dateService.currentDate;
    this.applyFilters();
  }

  applyFilters() {
    let list = this.lots;
    if (this.filterSearch) {
      const s = this.filterSearch.toLowerCase();
      list = list.filter((l: any) => l.nom_lot.toLowerCase().includes(s));
    }
    if (this.filterRace) list = list.filter((l: any) => l.id_race === parseInt(this.filterRace));
    if (this.filterOrigine) list = list.filter((l: any) => l.origine === this.filterOrigine);
    this.filteredLots = list;
  }

  clearFilters() {
    this.filterSearch = '';
    this.filterRace = '';
    this.filterOrigine = '';
    this.applyFilters();
  }

  openModal() {
    this.showModal = true;
    this.step = 1;
    this.newLot = { nom_lot: '', id_race: this.races[0]?.id_race, nombre: null, age_arrivee: 1, date_arrivee: this.dateService.currentDate, origine: 'achat', prix_achat: 0, id_lot_mere: null };
    this.modalError = '';
    this.ficheMode = 'default';
    this.manualRows = [];
    this.selectedFicheId = null;
    this.addNourr = this.nourriture[0]?.id_nourriture || null;
    this.addPoids = 0;
    this.addVar = 0;
  }

  closeModal() { this.showModal = false; }

  nextStep() {
    this.modalError = '';
    if (this.step === 1) {
      if (!this.newLot.nom_lot?.trim()) { this.modalError = 'Le nom du lot est requis'; return; }
      if (!this.newLot.nombre || this.newLot.nombre < 1) { this.modalError = 'Le nombre de poules doit être > 0'; return; }
      if (!this.newLot.age_arrivee || this.newLot.age_arrivee < 1) { this.modalError = "L'âge d'arrivée doit être ≥ 1"; return; }
      if (!this.newLot.date_arrivee) { this.modalError = "La date d'arrivée est requise"; return; }
    }
    if (this.step === 2 && this.ficheMode === 'manual') {
      // Auto-add pending row if user filled in poids but didn't click +
      if (this.addPoids && this.addPoids > 0) {
        this.addManualRow();
      }
    }
    if (this.step < 3) this.step++;
  }
  prevStep() { if (this.step > 1) this.step--; }

  addManualRow() {
    if (!this.addPoids || this.addPoids <= 0) {
      this.toast.show('La quantité est requise', 'warning');
      return;
    }
    const sem = this.manualRows.length + 1;
    const age = this.newLot.age_arrivee + sem - 1;
    this.manualRows.push({
      semaine: sem, age,
      id_nourriture: this.addNourr || this.nourriture[0]?.id_nourriture,
      poids: this.addPoids, variation: this.addVar || 0
    });
    this.addPoids = null as any;
    this.addVar = null as any;
  }

  removeManualRow(i: number) {
    if (i === this.manualRows.length - 1) this.manualRows.pop();
  }

  getNextManualSem(): number { return this.manualRows.length + 1; }
  getNextManualAge(): number { return this.newLot.age_arrivee + this.manualRows.length; }

  getNourritureName(id: number): string {
    return this.nourriture.find((n: any) => n.id_nourriture === id)?.nom_nourriture || '?';
  }

  getRaceName(id: number): string {
    return this.races.find((r: any) => r.id_race === id)?.nom_race || '—';
  }

  async createLot() {
    const body: any = {
      nom_lot: this.newLot.nom_lot,
      id_race: this.newLot.id_race,
      nombre: this.newLot.nombre,
      age_arrivee: this.newLot.age_arrivee,
      date_arrivee: this.newLot.date_arrivee,
      origine: this.newLot.origine,
      prix_achat: this.newLot.prix_achat || 0,
      id_lot_mere: this.newLot.id_lot_mere || null
    };

    if (this.ficheMode === 'existing' && this.selectedFicheId) {
      body.id_fiche = this.selectedFicheId;
    } else if (this.ficheMode === 'manual' && this.manualRows.length) {
      body.semaines = this.manualRows;
    }

    const { error } = await this.api.createLot(body).toPromise() ?? { error: 'Erreur' };
    if (error) { this.toast.show('Erreur : ' + error, 'danger'); return; }
    this.toast.show('Lot créé avec succès', 'success');
    this.closeModal();
    this.loadData();
  }
}
