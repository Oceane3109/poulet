import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { DateService } from '../../services/date.service';
import { ToastService } from '../../services/toast.service';
import { FormatNumberPipe } from '../../pipes/format.pipe';

const EVENT_COLORS: Record<string, string> = {
  production: '#22C55E', perte: '#EF4444', vente_oeuf: '#3B82F6',
  vente_poulet: '#3B82F6', vente_lot: '#3B82F6', couvaison: '#F59E0B', eclosion: '#8B5CF6'
};
const EVENT_LABELS: Record<string, string> = {
  production: 'Production', perte: 'Perte', vente_oeuf: 'Vente œufs',
  vente_poulet: 'Vente poulets', vente_lot: 'Cession lot', couvaison: 'Couvaison', eclosion: 'Éclosion'
};
const EVENT_ICONS: Record<string, string> = {
  production: 'bi-egg', perte: 'bi-heartbreak', vente_oeuf: 'bi-cart',
  vente_poulet: 'bi-cart-check', vente_lot: 'bi-box-arrow-right',
  couvaison: 'bi-clock-history', eclosion: 'bi-sun'
};
const TYPE_GROUP: Record<string, string> = {
  production: 'production', perte: 'perte', vente_oeuf: 'vente',
  vente_poulet: 'vente', vente_lot: 'vente', couvaison: 'couvaison', eclosion: 'eclosion'
};
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

interface CalCell {
  dateStr: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  rangeClass: string;
  dots: { color: string; label: string }[];
  summary: string;
}

@Component({
  selector: 'app-calendrier',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatNumberPipe],
  templateUrl: './calendrier.component.html'
})
export class CalendrierComponent implements OnInit {
  currentYear = 0;
  currentMonth = 0;
  monthLabel = '';
  allEvents: any[] = [];
  cells: CalCell[] = [];

  rangeFrom = '';
  rangeTo = '';
  private activeRangeFrom: string | null = null;
  private activeRangeTo: string | null = null;

  // Toggles
  toggleProduction = true;
  togglePerte = true;
  toggleVente = true;
  toggleCouvaison = true;
  toggleEclosion = true;

  // Detail panel
  showDetail = false;
  detailTitle = '';
  detailEvents: any[] = [];
  detailGrouped: { dateLabel: string; events: any[] }[] = [];
  private lastDay: string | null = null;

  eventColors = EVENT_COLORS;
  eventLabels = EVENT_LABELS;
  eventIcons = EVENT_ICONS;

  constructor(private api: ApiService, private dateService: DateService, private toast: ToastService) {}

  ngOnInit() {
    const today = new Date(this.dateService.getDate());
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();
    this.loadMonth();
  }

  private isoLocal(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private getEnabledTypes(): Set<string> {
    const s = new Set<string>();
    if (this.toggleProduction) s.add('production');
    if (this.togglePerte) s.add('perte');
    if (this.toggleVente) s.add('vente');
    if (this.toggleCouvaison) s.add('couvaison');
    if (this.toggleEclosion) s.add('eclosion');
    return s;
  }

  private filterEvents(events: any[]): any[] {
    const enabled = this.getEnabledTypes();
    return events.filter(e => enabled.has(TYPE_GROUP[e.type] || e.type));
  }

  private getVisibleRange(): { rangeStart: Date; rangeEnd: Date } {
    const first = new Date(this.currentYear, this.currentMonth, 1);
    const last = new Date(this.currentYear, this.currentMonth + 1, 0);
    const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
    const rangeStart = new Date(first);
    rangeStart.setDate(rangeStart.getDate() - startDay);
    const rangeEnd = new Date(last);
    const endDay = last.getDay() === 0 ? 0 : 7 - last.getDay();
    rangeEnd.setDate(rangeEnd.getDate() + endDay);
    return { rangeStart, rangeEnd };
  }

  loadMonth() {
    this.monthLabel = `${MONTHS_FR[this.currentMonth]} ${this.currentYear}`;
    const { rangeStart, rangeEnd } = this.getVisibleRange();
    this.api.getEvents(this.isoLocal(rangeStart), this.isoLocal(rangeEnd)).subscribe(res => {
      this.allEvents = res.data || [];
      this.renderCalendar(rangeStart, rangeEnd);
    });
  }

  prevMonth() { this.currentMonth--; if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; } this.loadMonth(); }
  nextMonth() { this.currentMonth++; if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; } this.loadMonth(); }

  goToday() {
    const t = new Date();
    this.currentYear = t.getFullYear();
    this.currentMonth = t.getMonth();
    this.activeRangeFrom = this.activeRangeTo = null;
    this.rangeFrom = this.rangeTo = '';
    this.loadMonth();
  }

  onToggleFilter() {
    const { rangeStart, rangeEnd } = this.getVisibleRange();
    this.renderCalendar(rangeStart, rangeEnd);
    if (this.showDetail) {
      if (this.activeRangeFrom && this.activeRangeTo) this.showRange();
      else if (this.lastDay) this.showDay(this.lastDay);
    }
  }

  loadRange() {
    if (!this.rangeFrom || !this.rangeTo || this.rangeFrom > this.rangeTo) {
      this.toast.show('Sélectionnez une plage de dates valide', 'warning'); return;
    }
    this.activeRangeFrom = this.rangeFrom;
    this.activeRangeTo = this.rangeTo;
    const d = new Date(this.rangeFrom + 'T00:00:00');
    this.currentYear = d.getFullYear();
    this.currentMonth = d.getMonth();
    this.loadMonth();
    setTimeout(() => this.showRange(), 200);
  }

  clearRange() {
    this.activeRangeFrom = this.activeRangeTo = null;
    this.rangeFrom = this.rangeTo = '';
    this.showDetail = false;
    this.lastDay = null;
    this.loadMonth();
  }

  showRange() {
    if (!this.activeRangeFrom || !this.activeRangeTo) return;
    this.api.getEvents(this.activeRangeFrom, this.activeRangeTo).subscribe(res => {
      const evts = this.filterEvents(res.data || []);
      const df = new Date(this.activeRangeFrom + 'T00:00:00');
      const dt = new Date(this.activeRangeTo! + 'T00:00:00');
      this.detailTitle = `Événements du ${df.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} (${evts.length})`;
      this.buildGroupedEvents(evts);
      this.detailEvents = evts;
      this.showDetail = true;
    });
  }

  private renderCalendar(rangeStart: Date, rangeEnd: Date) {
    const today = this.isoLocal(new Date());
    const filtered = this.filterEvents(this.allEvents);
    const evtMap: Record<string, any[]> = {};
    for (const evt of filtered) {
      const d = evt.date?.substring(0, 10);
      if (d) (evtMap[d] = evtMap[d] || []).push(evt);
    }

    const cells: CalCell[] = [];
    const cursor = new Date(rangeStart);
    while (cursor <= rangeEnd) {
      const dateStr = this.isoLocal(cursor);
      const dayEvts = evtMap[dateStr] || [];
      const types = [...new Set(dayEvts.map((e: any) => e.type))];

      let rangeClass = '';
      if (this.activeRangeFrom && this.activeRangeTo) {
        if (dateStr === this.activeRangeFrom) rangeClass = 'range-start';
        else if (dateStr === this.activeRangeTo) rangeClass = 'range-end';
        else if (dateStr > this.activeRangeFrom && dateStr < this.activeRangeTo) rangeClass = 'in-range';
      }

      const lots = [...new Set(dayEvts.map((e: any) => e.lot).filter(Boolean))];
      const summary = dayEvts.length ? `${lots.length ? lots.join(', ') + ' — ' : ''}${dayEvts.length} évt.` : '';

      cells.push({
        dateStr,
        day: cursor.getDate(),
        isCurrentMonth: cursor.getMonth() === this.currentMonth,
        isToday: dateStr === today,
        rangeClass,
        dots: types.map(t => ({ color: EVENT_COLORS[t] || '#94A3B8', label: EVENT_LABELS[t] || t })),
        summary
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    this.cells = cells;
  }

  showDay(dateStr: string) {
    this.lastDay = dateStr;
    const evts = this.filterEvents(this.allEvents.filter(e => e.date?.substring(0, 10) === dateStr));
    const d = new Date(dateStr + 'T00:00:00');
    this.detailTitle = `Événements du ${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${evts.length})`;
    this.detailEvents = evts;
    this.detailGrouped = [];
    this.showDetail = true;
  }

  private buildGroupedEvents(evts: any[]) {
    const grouped: Record<string, any[]> = {};
    evts.forEach(e => { const d = (e.date || '').substring(0, 10); (grouped[d] = grouped[d] || []).push(e); });
    this.detailGrouped = Object.keys(grouped).sort().map(dateStr => {
      const dayD = new Date(dateStr + 'T00:00:00');
      return { dateLabel: dayD.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }), events: grouped[dateStr] };
    });
  }

  onEventClick(type: string, dateStr: string) {
    if (!dateStr) return;
    const d = new Date(dateStr + 'T00:00:00');
    if (type === 'couvaison') d.setDate(d.getDate() + 45);
    else if (type === 'eclosion') d.setDate(d.getDate() - 45);
    const target = this.isoLocal(d);
    this.currentYear = d.getFullYear();
    this.currentMonth = d.getMonth();
    this.loadMonth();
    setTimeout(() => this.showDay(target), 200);
  }

  closeDetail() { this.showDetail = false; }
}
