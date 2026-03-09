import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { DateService } from '../../services/date.service';
import { ToastService } from '../../services/toast.service';
import { FormatArPipe, FormatDatePipe } from '../../pipes/format.pipe';

@Component({
  selector: 'app-rentabilite',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatArPipe, FormatDatePipe],
  templateUrl: './rentabilite.component.html'
})
export class RentabiliteComponent implements OnInit, OnDestroy {
  allData: any[] = [];
  filtered: any[] = [];
  raceNames: string[] = [];
  subtitle = 'Analyse financière par lot';

  // KPIs
  kpiBenefice = '—';
  kpiMeilleur = '—';
  kpiDeficitaire = '—';

  // Filters
  filterRace = '';
  filterMarge = '';

  // Footer totals
  totals = { acq: 0, nourr: 0, rOeufs: 0, rPoulets: 0, benefice: 0, marge: 0 };

  private sub!: Subscription;

  constructor(private api: ApiService, private dateService: DateService, private toast: ToastService) {}

  ngOnInit() {
    this.sub = this.dateService.date$.subscribe(() => this.loadData());
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  loadData() {
    const date = this.dateService.getDate();
    this.subtitle = `Analyse financière au ${new Date(date + 'T00:00:00').toLocaleDateString('fr-FR')}`;
    this.api.getRentabilite(date).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.allData = res.data || [];
      this.raceNames = [...new Set(this.allData.map(r => r.nom_race).filter(Boolean))];
      this.updateKPIs();
      this.applyFilters();
    });
  }

  updateKPIs() {
    const profits = this.allData.map(r => ({
      ...r,
      benefice: (r.revenus_oeufs || 0) + (r.revenus_poulets || 0) - (r.cout_acquisition || 0) - (r.cout_nourriture_estime || 0)
    }));

    const totalBenefice = profits.reduce((s, r) => s + r.benefice, 0);
    this.kpiBenefice = totalBenefice.toLocaleString('fr-FR') + ' Ar';

    if (profits.length) {
      const best = profits.reduce((a, b) => a.benefice > b.benefice ? a : b);
      this.kpiMeilleur = best.benefice > 0 ? `${best.nom_lot} (${best.benefice.toLocaleString('fr-FR')} Ar)` : '—';
      const worst = profits.reduce((a, b) => a.benefice < b.benefice ? a : b);
      this.kpiDeficitaire = worst.benefice < 0 ? `${worst.nom_lot} (${worst.benefice.toLocaleString('fr-FR')} Ar)` : 'Aucun';
    } else {
      this.kpiMeilleur = '—';
      this.kpiDeficitaire = '—';
    }
  }

  applyFilters() {
    let list = [...this.allData];
    if (this.filterRace) list = list.filter(r => r.nom_race === this.filterRace);
    if (this.filterMarge) {
      list = list.filter(r => {
        const rev = (r.revenus_oeufs || 0) + (r.revenus_poulets || 0);
        const cout = (r.cout_acquisition || 0) + (r.cout_nourriture_estime || 0);
        const benef = rev - cout;
        return this.filterMarge === 'positif' ? benef >= 0 : benef < 0;
      });
    }
    this.filtered = list;
    this.computeTotals();
  }

  clearFilters() {
    this.filterRace = '';
    this.filterMarge = '';
    this.applyFilters();
  }

  getBenefice(r: any): number {
    return (r.revenus_oeufs || 0) + (r.revenus_poulets || 0) - (r.cout_acquisition || 0) - (r.cout_nourriture_estime || 0);
  }

  getMarge(r: any): number {
    const rev = (r.revenus_oeufs || 0) + (r.revenus_poulets || 0);
    const benef = this.getBenefice(r);
    return rev > 0 ? Math.round((benef / rev) * 100) : (benef >= 0 ? 0 : -100);
  }

  private computeTotals() {
    const t = this.filtered.reduce((acc, r) => ({
      acq: acc.acq + (r.cout_acquisition || 0),
      nourr: acc.nourr + (r.cout_nourriture_estime || 0),
      rOeufs: acc.rOeufs + (r.revenus_oeufs || 0),
      rPoulets: acc.rPoulets + (r.revenus_poulets || 0)
    }), { acq: 0, nourr: 0, rOeufs: 0, rPoulets: 0 });

    const benefice = (t.rOeufs + t.rPoulets) - (t.acq + t.nourr);
    const totalRev = t.rOeufs + t.rPoulets;
    const marge = totalRev > 0 ? Math.round((benefice / totalRev) * 100) : 0;
    this.totals = { ...t, benefice, marge };
  }
}
