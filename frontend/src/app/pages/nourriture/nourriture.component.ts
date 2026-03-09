import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { FormatArPipe, FormatNumberPipe } from '../../pipes/format.pipe';

@Component({
  selector: 'app-nourriture',
  standalone: true,
  imports: [CommonModule, FormsModule, FormatArPipe, FormatNumberPipe],
  templateUrl: './nourriture.component.html'
})
export class NourritureComponent implements OnInit {
  allNourriture: any[] = [];

  // Modal
  showModal = false;
  editingId: number | null = null;
  modalTitle = 'Nouvel aliment';
  modalSubmit = 'Créer';
  nourrNom = '';
  nourrType = '';
  nourrPrix: number | null = null;
  prixKgPreview = 'Prix au kg : —';

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.loadNourriture(); }

  loadNourriture() {
    this.api.getNourriture().subscribe(res => this.allNourriture = res.data || []);
  }

  getCostClass(n: any): string {
    if (n.prix_gramme > 0.015) return 'var(--danger)';
    if (n.prix_gramme > 0.005) return 'var(--warning)';
    return 'var(--success)';
  }

  getPrixKg(n: any): number {
    return parseFloat((n.prix_gramme * 1000).toFixed(2));
  }

  openModal(editId: number | null = null) {
    this.editingId = editId;
    if (editId) {
      const n = this.allNourriture.find(n => n.id_nourriture === editId);
      if (!n) return;
      this.modalTitle = "Modifier l'aliment";
      this.modalSubmit = 'Enregistrer';
      this.nourrNom = n.nom_nourriture;
      this.nourrType = n.type_aliment || '';
      this.nourrPrix = n.prix_gramme;
      this.updatePrixKg();
    } else {
      this.modalTitle = 'Nouvel aliment';
      this.modalSubmit = 'Créer';
      this.nourrNom = '';
      this.nourrType = '';
      this.nourrPrix = null;
      this.prixKgPreview = 'Prix au kg : —';
    }
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.editingId = null; }

  updatePrixKg() {
    if (this.nourrPrix && this.nourrPrix > 0) {
      this.prixKgPreview = `Prix au kg : ${(this.nourrPrix * 1000).toLocaleString('fr-FR')} Ar`;
    } else {
      this.prixKgPreview = 'Prix au kg : —';
    }
  }

  submitNourr() {
    if (!this.nourrNom.trim() || !this.nourrPrix || this.nourrPrix <= 0) {
      this.toast.show('Veuillez remplir tous les champs obligatoires', 'warning');
      return;
    }
    const body = { nom_nourriture: this.nourrNom.trim(), type_aliment: this.nourrType || null, prix_gramme: this.nourrPrix };
    const obs = this.editingId ? this.api.updateNourriture(this.editingId, body) : this.api.createNourriture(body);
    obs.subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.closeModal();
      this.toast.show(this.editingId ? 'Aliment modifié' : 'Aliment créé', 'success');
      this.loadNourriture();
    });
  }

  deleteNourr(id: number) {
    const n = this.allNourriture.find(n => n.id_nourriture === id);
    if (!confirm(`Supprimer l'aliment "${n?.nom_nourriture}" ?`)) return;
    this.api.deleteNourriture(id).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.toast.show('Aliment supprimé', 'success');
      this.loadNourriture();
    });
  }
}
