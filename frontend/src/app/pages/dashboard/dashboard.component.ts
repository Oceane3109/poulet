import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../services/api.service';
import { DateService } from '../../services/date.service';
import { FormatNumberPipe, FormatArPipe, FormatDatePipe } from '../../pipes/format.pipe';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormatNumberPipe, FormatArPipe, FormatDatePipe],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartProdCanvas') chartProdCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartRepartCanvas') chartRepartCanvas!: ElementRef<HTMLCanvasElement>;

  kpis = { lots: 0, stock_oeufs: 0, poules_vivantes: 0, ca_jour: 0 };
  recapLots: any[] = [];
  activity: any[] = [];
  chartProd: Chart | null = null;
  chartRepart: Chart | null = null;
  chartPeriod = 30;
  private sub!: Subscription;

  constructor(private api: ApiService, private dateService: DateService) {}

  ngOnInit() {
    this.sub = this.dateService.date$.subscribe(() => this.loadData());
  }

  ngAfterViewInit() {
    this.loadData();
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  async loadData() {
    const date = this.dateService.currentDate;
    const { data } = await this.api.getDashboard(date).toPromise() ?? { data: null };
    if (!data) return;

    const lots = (data as any[]).filter((r: any) => (r.semaine_actuelle ?? -1) >= 0);
    this.kpis.lots = lots.length;
    this.kpis.stock_oeufs = lots.reduce((s: number, r: any) => s + (r.stock_oeufs || 0), 0);
    this.kpis.poules_vivantes = lots.reduce((s: number, r: any) => s + (r.nombre_actuel || 0), 0);
    this.kpis.ca_jour = lots.reduce((s: number, r: any) => s + (r.prix_vente_jour || 0), 0);
    this.recapLots = lots;

    this.loadActivity(date);
    this.buildCharts(lots, date);
  }

  async loadActivity(date: string) {
    const d = new Date(date);
    const from = new Date(d);
    from.setDate(from.getDate() - 30);
    const { data } = await this.api.getEvents(this.dateService.isoLocal(from), date).toPromise() ?? { data: null };
    this.activity = (data || []).slice(0, 10);
  }

  setChartPeriod(days: number) {
    this.chartPeriod = days;
    this.loadData();
  }

  async buildCharts(lots: any[], date: string) {
    if (!this.chartProdCanvas || !this.chartRepartCanvas) return;

    // Production chart — load events from API like vanilla
    const from = new Date(date);
    from.setDate(from.getDate() - this.chartPeriod);
    const fromStr = this.dateService.isoLocal(from);
    const evtRes = await this.api.getEvents(fromStr, date).toPromise();
    const prodEvents = (evtRes?.data || []).filter((e: any) => e.type === 'production');
    const byDate: Record<string, number> = {};
    prodEvents.forEach((e: any) => {
      const d = (e.date || '').substring(0, 10);
      byDate[d] = (byDate[d] || 0) + (e.value || 0);
    });

    const labels: string[] = [];
    const prodData: number[] = [];
    const cursor = new Date(fromStr);
    const end = new Date(date);
    while (cursor <= end) {
      const ds = this.dateService.isoLocal(cursor);
      labels.push(ds.substring(5));
      prodData.push(byDate[ds] || 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    this.chartProd?.destroy();
    this.chartProd = new Chart(this.chartProdCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Œufs produits',
          data: prodData,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: this.chartPeriod <= 7 ? 4 : 2,
          pointBackgroundColor: '#3B82F6'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
          x: { grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });

    // Répartition chart
    const repartLabels = lots.map((l: any) => l.lot || l.nom_lot);
    const repartData = lots.map((l: any) => l.nombre_actuel || 0);
    const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#6366F1'];

    this.chartRepart?.destroy();
    this.chartRepart = new Chart(this.chartRepartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: repartLabels,
        datasets: [{ data: repartData, backgroundColor: colors.slice(0, repartData.length), borderWidth: 0, hoverOffset: 8 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 12 } } } }
      }
    });
  }

  getActivityDotClass(type: string): string {
    if (type.startsWith('vente')) return 'vente';
    return type;
  }
}
