import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { DateService } from '../../services/date.service';
import { ToastService } from '../../services/toast.service';
import { FormatNumberPipe, FormatArPipe, FormatDatePipe } from '../../pipes/format.pipe';

@Component({
  selector: 'app-ventes',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatNumberPipe, FormatArPipe, FormatDatePipe],
  templateUrl: './ventes.component.html'
})
export class VentesComponent implements OnInit {
  lots: any[] = [];
  races: any[] = [];
  ventesOeufs: any[] = [];
  ventesPoulets: any[] = [];
  ventesLots: any[] = [];
  filteredOeufs: any[] = [];
  filteredPoulets: any[] = [];
  filteredLots: any[] = [];
  currentTab = 'oeufs';

  // Filters
  filterLot = '';
  filterFrom = '';
  filterTo = '';

  // Totals
  totalOeufs = 0;
  totalPoulets = 0;
  totalLots = 0;
  countOeufs = 0;
  countPoulets = 0;
  countLots = 0;

  // Vente oeuf modal
  showVOModal = false;
  voLot: number | null = null;
  voDate = '';
  voNb: number | null = null;
  voPrix: number | null = null;
  voTotal = 'Total estimé : —';

  // Vente poulet modal
  showVPModal = false;
  vpLot: number | null = null;
  vpDate = '';
  vpNb: number | null = null;
  vpPoids: number | null = null;
  vpPrix: number | null = null;
  vpTotal = 'Total estimé : —';
  vpPoidsHint = '';
  vpPoidsUnitaire: number | null = null;
  vpPrixKg: number | null = null;

  // Vente lot modal
  showVLModal = false;
  vlLot: number | null = null;
  vlDate = '';
  vlPrix: number | null = null;

  constructor(private api: ApiService, private dateService: DateService, private toast: ToastService) {}

  ngOnInit() {
    this.api.getLots().subscribe(res => {
      this.lots = res.data || [];
      if (this.lots.length) {
        this.voLot = this.vpLot = this.vlLot = this.lots[0].id_lot;
      }
    });
    this.api.getRaces().subscribe(res => this.races = res.data || []);
    this.loadAll();
  }

  loadAll() {
    this.api.getVentesOeufs().subscribe(res => {
      this.ventesOeufs = res.data || [];
      this.applyFilters();
    });
    this.api.getVentesPoulets().subscribe(res => {
      this.ventesPoulets = res.data || [];
      this.applyFilters();
    });
    this.api.getVentesLots().subscribe(res => {
      this.ventesLots = res.data || [];
      this.applyFilters();
    });
  }

  applyFilters() {
    this.filteredOeufs = this.filterList(this.ventesOeufs, 'date_vente');
    this.filteredPoulets = this.filterList(this.ventesPoulets, 'date_vente');
    this.filteredLots = this.filterList(this.ventesLots, 'date_vente');

    this.totalOeufs = this.filteredOeufs.reduce((s, v) => s + (v.prix_total || 0), 0);
    this.totalPoulets = this.filteredPoulets.reduce((s, v) => s + (v.prix_total || 0), 0);
    this.totalLots = this.filteredLots.reduce((s, v) => s + (v.prix_vente || 0), 0);
    this.countOeufs = this.filteredOeufs.length;
    this.countPoulets = this.filteredPoulets.length;
    this.countLots = this.filteredLots.length;
  }

  private filterList(list: any[], dateField: string): any[] {
    let filtered = [...list];
    if (this.filterLot) filtered = filtered.filter(v => v.id_lot === +this.filterLot);
    if (this.filterFrom) filtered = filtered.filter(v => v[dateField]?.substring(0, 10) >= this.filterFrom);
    if (this.filterTo) filtered = filtered.filter(v => v[dateField]?.substring(0, 10) <= this.filterTo);
    return filtered.sort((a, b) => new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime());
  }

  clearFilters() {
    this.filterLot = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.applyFilters();
  }

  getLotName(id: number): string {
    return this.lots.find(l => l.id_lot === id)?.nom_lot || '#' + id;
  }

  switchTab(tab: string) { this.currentTab = tab; }

  // --- Vente oeuf ---
  openVOModal() {
    this.voDate = this.dateService.getDate();
    this.voNb = null;
    this.voPrix = null;
    this.voTotal = 'Total estimé : —';
    this.showVOModal = true;
  }

  updateVOTotal() {
    const nb = this.voNb || 0;
    const prix = this.voPrix;
    if (nb > 0 && prix) {
      this.voTotal = `Total estimé : ${(nb * prix).toLocaleString('fr-FR')} Ar`;
    } else if (nb > 0 && this.voLot) {
      const lot = this.lots.find(l => l.id_lot === this.voLot);
      const race = lot ? this.races.find(r => r.id_race === lot.id_race) : null;
      this.voTotal = race ? `Total estimé : ${(nb * race.prix_oeuf).toLocaleString('fr-FR')} Ar (prix race)` : 'Total estimé : prix de la race appliqué';
    } else {
      this.voTotal = 'Total estimé : —';
    }
  }

  submitVO() {
    if (!this.voLot || !this.voDate || !this.voNb || this.voNb <= 0) {
      this.toast.show('Veuillez remplir les champs obligatoires', 'warning'); return;
    }
    this.api.createVenteOeuf({ id_lot: this.voLot, date_vente: this.voDate, nb_oeufs: this.voNb, prix_unitaire: this.voPrix }).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.showVOModal = false;
      this.toast.show("Vente d'œufs enregistrée", 'success');
      this.loadAll();
    });
  }

  // --- Vente poulet ---
  openVPModal() {
    this.vpDate = this.dateService.getDate();
    this.vpNb = null;
    this.vpPoids = null;
    this.vpPrix = null;
    this.vpTotal = 'Total estimé : —';
    this.vpPoidsHint = '';
    this.vpPoidsUnitaire = null;
    this.vpPrixKg = null;
    this.showVPModal = true;
    this.updateVPEstimates();
  }

  updateVPEstimates() {
    if (!this.vpLot || !this.vpDate) return;
    this.api.getPoidsLot(this.vpLot, this.vpDate).subscribe(res => {
      if (res.data) {
        const poidsFromFiche = res.data.poids_unitaire_kg || 0;
        const poidsFromVariations = res.data.poids_estim_variation_kg || 0;
        const chosen = Math.max(poidsFromFiche, poidsFromVariations) || null;
        this.vpPoidsUnitaire = chosen;
        this.vpPrixKg = res.data.prix_kg;
        if (chosen) {
          const note = poidsFromVariations > poidsFromFiche ? ' (estim. par variations)' : '';
          this.vpPoidsHint = `(~${chosen.toFixed(2)} kg/poulet)${note}`;
        } else {
          this.vpPoidsHint = '(poids fiche non disponible)';
        }
      }
      this.updateVPPoids();
    });
  }

  updateVPPoids() {
    const nb = this.vpNb || 0;
    if (nb > 0 && this.vpPoidsUnitaire) {
      // Preserve high precision for weight: use 12 significant digits
      const raw = nb * this.vpPoidsUnitaire;
      this.vpPoids = Number(raw.toPrecision(12));
    }
    this.updateVPTotal();
  }

  updateVPTotal() {
    const poids = this.vpPoids || 0;
    const prix = this.vpPrix;
    if (poids > 0 && prix) {
      this.vpTotal = `Total estimé : ${(poids * prix).toLocaleString('fr-FR')} Ar`;
    } else if (poids > 0 && this.vpLot) {
      const lot = this.lots.find(l => l.id_lot === this.vpLot);
      const race = lot ? this.races.find(r => r.id_race === lot.id_race) : null;
      this.vpTotal = race ? `Total estimé : ${(poids * race.prix_kg).toLocaleString('fr-FR')} Ar (prix race)` : 'Total estimé : —';
    } else {
      this.vpTotal = 'Total estimé : —';
    }
  }

  submitVP() {
    if (!this.vpLot || !this.vpDate || !this.vpNb || !this.vpPoids) {
      this.toast.show('Veuillez remplir les champs obligatoires', 'warning'); return;
    }
    this.api.createVentePoulet({ id_lot: this.vpLot, date_vente: this.vpDate, nb_poulets: this.vpNb, poids_total_kg: this.vpPoids, prix_kg: this.vpPrix }).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.showVPModal = false;
      this.toast.show('Vente de poulets enregistrée', 'success');
      this.loadAll();
    });
  }

  // --- Vente lot ---
  openVLModal() {
    this.vlDate = this.dateService.getDate();
    this.vlPrix = null;
    this.showVLModal = true;
  }

  submitVL() {
    if (!this.vlLot || !this.vlDate || !this.vlPrix) {
      this.toast.show('Veuillez remplir tous les champs', 'warning'); return;
    }
    this.api.createVenteLot({ id_lot: this.vlLot, date_vente: this.vlDate, prix_vente: this.vlPrix }).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.showVLModal = false;
      this.toast.show('Cession de lot enregistrée', 'success');
      this.loadAll();
    });
  }
}
