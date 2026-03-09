import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametres.component.html'
})
export class ParametresComponent implements OnInit {
  parametres: any[] = [];
  ficheDefaut: any[] = [];
  loading = true;

  // Edition fiche défaut
  editingRow: any = null; // row en cours d'édition (null = aucune)
  editForm = { semaine: 0, variation: 0, poids: 0 };
  addingRow = false;
  addForm = { semaine: 0, variation: 0 };
  insertingAfter: number | null = null; // id_row après lequel on insère
  insertForm = { semaine: 0, variation: 0 };
  ficheModified = false;

  // Groupes pour l'affichage
  groups = [
    {
      title: 'Limitation de vente',
      icon: 'bi-shield-check',
      description: 'Les poulets ne peuvent être vendus que s\'ils ont dépassé une certaine semaine ou atteint un certain poids.',
      keys: ['limite_vente_active', 'limite_vente_semaine', 'limite_vente_poids_kg']
    },
    {
      title: 'Arrêt de progression du poids',
      icon: 'bi-pause-circle',
      description: 'Définir la semaine à laquelle le poids des poulets ne doit plus augmenter.',
      keys: ['arret_poids_active', 'arret_poids_semaine']
    },
    {
      title: 'Fiche par défaut',
      icon: 'bi-journal-text',
      description: 'Utiliser une fiche par défaut pour combler les semaines manquantes des fiches de lot.',
      keys: ['fiche_defaut_active']
    }
  ];

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    this.api.getParametres().subscribe(res => {
      this.parametres = res.data || [];
      this.loading = false;
    });
    this.api.getFicheDefaut().subscribe(res => {
      this.ficheDefaut = res.data || [];
    });
  }

  getParam(cle: string): any {
    return this.parametres.find(p => p.cle === cle);
  }

  getParamValue(cle: string): string {
    return this.getParam(cle)?.valeur || '';
  }

  isToggleOn(cle: string): boolean {
    return this.getParamValue(cle) === '1';
  }

  toggleParam(cle: string) {
    const current = this.getParamValue(cle);
    const newVal = current === '1' ? '0' : '1';
    this.updateParam(cle, newVal);
  }

  updateParam(cle: string, valeur: string) {
    this.api.updateParametre(cle, valeur).subscribe(res => {
      if (res.error) {
        this.toast.show('Erreur : ' + res.error, 'danger');
        return;
      }
      // Update local
      const p = this.getParam(cle);
      if (p) p.valeur = valeur;
      this.toast.show('Paramètre mis à jour', 'success');
    });
  }

  onNumberChange(cle: string, event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.updateParam(cle, val);
  }

  // Check si le toggle parent du group est actif pour montrer les sous-params
  isGroupActive(group: any): boolean {
    const toggleKey = group.keys.find((k: string) => k.endsWith('_active'));
    return toggleKey ? this.isToggleOn(toggleKey) : true;
  }

  // ==========================================
  // FICHE PAR DÉFAUT - Édition avancée
  // ==========================================

  // Démarrer l'édition d'une ligne
  startEdit(row: any) {
    this.cancelInsert();
    this.cancelAdd();
    this.editingRow = row;
    this.editForm = { semaine: row.semaine, variation: row.variation, poids: row.poids };
  }

  cancelEdit() {
    this.editingRow = null;
  }

  saveEdit() {
    if (!this.editingRow) return;
    const { semaine, variation } = this.editForm;
    // Recalculer le poids cumulé en local : on va sauver poids = variation (le backend stocke la valeur)
    // On sauvegarde la ligne individuelle
    this.api.updateFicheDefautRow(this.editingRow.id_row, {
      semaine, variation, poids: this.editForm.poids
    }).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.ficheDefaut = res.data || [];
      this.recalcPoidsCumule();
      this.editingRow = null;
      this.toast.show('Ligne modifiée', 'success');
    });
  }

  // Supprimer une ligne
  deleteRow(row: any) {
    this.api.deleteFicheDefautRow(row.id_row).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.ficheDefaut = res.data || [];
      this.recalcPoidsCumule();
      this.toast.show('Ligne supprimée', 'success');
    });
  }

  // Ajouter une ligne à la fin
  startAdd() {
    this.cancelEdit();
    this.cancelInsert();
    this.addingRow = true;
    const lastSem = this.ficheDefaut.length ? Math.max(...this.ficheDefaut.map(r => r.semaine)) : 0;
    this.addForm = { semaine: lastSem + 1, variation: 0 };
  }

  cancelAdd() {
    this.addingRow = false;
  }

  saveAdd() {
    const { semaine, variation } = this.addForm;
    // Calculer le poids cumulé
    const prevRow = this.ficheDefaut.filter(r => r.semaine < semaine).sort((a, b) => b.semaine - a.semaine)[0];
    const poids = (prevRow ? prevRow.poids : 0) + variation;
    this.api.createFicheDefautRow({ semaine, variation, poids }).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.ficheDefaut = res.data || [];
      this.recalcPoidsCumule();
      this.addingRow = false;
      this.toast.show('Ligne ajoutée', 'success');
    });
  }

  // Insérer une ligne après une ligne existante
  startInsertAfter(row: any) {
    this.cancelEdit();
    this.cancelAdd();
    this.insertingAfter = row.id_row;
    this.insertForm = { semaine: row.semaine + 1, variation: 0 };
  }

  cancelInsert() {
    this.insertingAfter = null;
  }

  saveInsert() {
    if (this.insertingAfter == null) return;
    const { semaine, variation } = this.insertForm;
    const prevRow = this.ficheDefaut.filter(r => r.semaine < semaine).sort((a, b) => b.semaine - a.semaine)[0];
    const poids = (prevRow ? prevRow.poids : 0) + variation;
    this.api.createFicheDefautRow({ semaine, variation, poids }).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.ficheDefaut = res.data || [];
      this.recalcPoidsCumule();
      this.insertingAfter = null;
      this.toast.show('Ligne insérée', 'success');
    });
  }

  // Recalculer les poids cumulés et sauvegarder tout
  recalcPoidsCumule() {
    // Trier par semaine
    this.ficheDefaut.sort((a: any, b: any) => a.semaine - b.semaine);
    let cumul = 0;
    for (const row of this.ficheDefaut) {
      cumul += row.variation;
      row.poids = cumul;
    }
  }

  // Sauvegarder toute la fiche (recalcul inclus)
  saveAllFiche() {
    this.recalcPoidsCumule();
    const rows = this.ficheDefaut.map(r => ({ semaine: r.semaine, variation: r.variation, poids: r.poids }));
    this.api.saveFicheDefaut(rows).subscribe(res => {
      if (res.error) { this.toast.show('Erreur : ' + res.error, 'danger'); return; }
      this.ficheDefaut = res.data || [];
      this.recalcPoidsCumule();
      this.toast.show('Fiche sauvegardée — poids cumulés recalculés', 'success');
    });
  }
}
