import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { FormatArPipe } from '../../pipes/format.pipe';

const RACE_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#6366F1'];

@Component({
  selector: 'app-races',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatArPipe],
  templateUrl: './races.component.html'
})
export class RacesComponent implements OnInit {
  races: any[] = [];
  colors = RACE_COLORS;

  // Modal
  showModal = false;
  editingId: number | null = null;
  modalTitle = 'Nouvelle race';
  modalSubmit = 'Créer';
  raceNom = '';
  racePrixOeuf: number | null = null;
  racePrixKg: number | null = null;
  raceDesc = '';

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.loadRaces(); }

  loadRaces() {
    this.api.getRaces().subscribe(res => this.races = res.data || []);
  }

  getColor(i: number): string { return RACE_COLORS[i % RACE_COLORS.length]; }

  openModal(editId: number | null = null) {
    this.editingId = editId;
    if (editId) {
      const r = this.races.find(r => r.id_race === editId);
      if (!r) return;
      this.modalTitle = 'Modifier la race';
      this.modalSubmit = 'Enregistrer';
      this.raceNom = r.nom_race;
      this.racePrixOeuf = r.prix_oeuf;
      this.racePrixKg = r.prix_kg;
      this.raceDesc = r.description || '';
    } else {
      this.modalTitle = 'Nouvelle race';
      this.modalSubmit = 'Créer';
      this.raceNom = '';
      this.racePrixOeuf = null;
      this.racePrixKg = null;
      this.raceDesc = '';
    }
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.editingId = null; }

  submitRace() {
    if (!this.raceNom.trim() || this.racePrixOeuf == null || this.racePrixKg == null) {
      this.toast.show('Veuillez remplir tous les champs obligatoires', 'warning');
      return;
    }
    const body = { nom_race: this.raceNom.trim(), prix_oeuf: this.racePrixOeuf, prix_kg: this.racePrixKg, description: this.raceDesc.trim() || null };
    const obs = this.editingId ? this.api.updateRace(this.editingId, body) : this.api.createRace(body);
    obs.subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.closeModal();
      this.toast.show(this.editingId ? 'Race modifiée' : 'Race créée', 'success');
      this.loadRaces();
    });
  }

  deleteRace(id: number) {
    const race = this.races.find(r => r.id_race === id);
    if (!confirm(`Supprimer la race "${race?.nom_race}" ?`)) return;
    this.api.deleteRace(id).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.toast.show('Race supprimée', 'success');
      this.loadRaces();
    });
  }
}
