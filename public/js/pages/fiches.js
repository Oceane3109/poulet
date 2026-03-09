/**
 * AKOHO — Fiches de croissance Page
 */
let LOTS = [];
let NOURRITURE = [];
let SELECTED_LOT = null;
let FICHE_ROWS = [];       // current working rows
let SAVED_ROWS = [];       // last saved state
let HAS_CHANGES = false;

document.addEventListener('partialsReady', async () => {
    await Promise.all([loadLots(), loadNourriture()]);
    populateLotSelect();
    setupKeyboard();
});

// --- Data loading ---
async function loadLots() {
    const { data } = await API.getLots();
    LOTS = data || [];
}
async function loadNourriture() {
    const { data } = await API.getNourriture();
    NOURRITURE = data || [];
}

function populateLotSelect() {
    const sel = document.getElementById('fiche-lot-select');
    sel.innerHTML = '<option value="">— Choisir un lot —</option>' +
        LOTS.map(l => `<option value="${l.id_lot}">${l.nom_lot} — ${l.nom_race || 'Race ' + l.id_race}</option>`).join('');
    // Populate nourriture dropdown
    const nourSel = document.getElementById('add-nourr');
    nourSel.innerHTML = NOURRITURE.map(n => `<option value="${n.id_nourriture}">${n.nom_nourriture}</option>`).join('');
}

// --- Lot selection ---
async function onLotChange() {
    const id = parseInt(document.getElementById('fiche-lot-select').value);
    if (!id) {
        SELECTED_LOT = null;
        document.getElementById('fiche-empty').style.display = '';
        document.getElementById('fiche-content').style.display = 'none';
        document.getElementById('btn-export').style.display = 'none';
        document.getElementById('btn-clear').style.display = 'none';
        document.getElementById('btn-save').style.display = 'none';
        document.getElementById('fiche-meta').innerHTML = '';
        return;
    }

    SELECTED_LOT = LOTS.find(l => l.id_lot === id);
    if (!SELECTED_LOT || !SELECTED_LOT.id_fiche) {
        document.getElementById('fiche-empty').style.display = '';
        document.getElementById('fiche-content').style.display = 'none';
        document.getElementById('fiche-meta').innerHTML = '<span class="badge badge-warning">Aucune fiche associée</span>';
        return;
    }

    // Load fiche detail
    const { data } = await API.getFiche(SELECTED_LOT.id_fiche);
    if (!data) {
        showToast('Erreur chargement fiche', 'danger');
        return;
    }

    FICHE_ROWS = (data.rows || []).map(r => ({ ...r, _saved: true }));
    SAVED_ROWS = FICHE_ROWS.map(r => ({ ...r }));
    HAS_CHANGES = false;

    // Show meta info
    const semaineActuelle = computeCurrentWeek();
    const ficheType = data.type === 'concessionnaire' ? 'Concessionnaire' : data.type === 'defaut' ? 'Par défaut' : 'Personnalisée';
    document.getElementById('fiche-meta').innerHTML = `
        <div><span class="badge badge-primary">${ficheType}</span></div>
        <div class="text-muted" style="font-size:13px;">Semaine actuelle : <strong>S${semaineActuelle}</strong></div>
        <div class="text-muted" style="font-size:13px;">${FICHE_ROWS.length} semaine(s)</div>
    `;

    document.getElementById('fiche-empty').style.display = 'none';
    document.getElementById('fiche-content').style.display = '';
    document.getElementById('btn-export').style.display = '';
    document.getElementById('btn-clear').style.display = '';

    renderTable();
    updateAddForm();
    updateSaveButton();
}

function computeCurrentWeek() {
    if (!SELECTED_LOT) return 0;
    const today = new Date(getSelectedDate());
    const arrival = new Date(SELECTED_LOT.date_arrivee);
    const weeks = Math.floor((today - arrival) / (7 * 24 * 60 * 60 * 1000));
    return SELECTED_LOT.age_arrivee + Math.max(0, weeks);
}

// --- Rendering ---
function renderTable() {
    const tbody = document.getElementById('fiche-tbody');
    const currentWeek = computeCurrentWeek();

    if (!FICHE_ROWS.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:32px;"><i class="bi bi-journal-x" style="font-size:32px;display:block;margin-bottom:8px;"></i>Aucune semaine dans cette fiche</td></tr>';
        return;
    }

    tbody.innerHTML = FICHE_ROWS.map((row, i) => {
        const isLast = i === FICHE_ROWS.length - 1;
        const nourr = NOURRITURE.find(n => n.id_nourriture === row.id_nourriture);
        const cost = nourr ? (row.poids * nourr.prix_gramme).toFixed(2) : '—';
        const savedClass = row._saved ? '' : ' style="background:#FFF7ED;"';

        // Status
        let statusBadge, statusClass;
        if (row.age < currentWeek) {
            statusBadge = '<span class="badge badge-success">Passée</span>';
            statusClass = '';
        } else if (row.age === currentWeek) {
            statusBadge = '<span class="badge badge-primary">En cours</span>';
            statusClass = ' style="background:#EFF6FF;"';
        } else {
            statusBadge = '<span class="badge badge-muted">À venir</span>';
            statusClass = '';
        }

        const unsavedBadge = row._saved ? '' : ' <span class="badge badge-warning" style="font-size:10px;">Non sauvegardé</span>';
        const semLabel = row._saved ? `S${row.semaine}` : `S${row.semaine} *`;

        return `<tr${row._saved ? '' : savedClass}${row._saved ? statusClass : ''}>
            <td><strong>${semLabel}</strong>${unsavedBadge}</td>
            <td>${row.age}</td>
            <td>${row.variation} g</td>
            <td>${nourr ? nourr.nom_nourriture : 'ID:' + row.id_nourriture}</td>
            <td>${row.poids} g</td>
            <td class="text-end">${cost} Ar</td>
            <td class="text-center">${statusBadge}</td>
            <td class="text-center">
                ${isLast
                    ? `<button class="btn-icon" onclick="removeLastRow()" title="Supprimer"><i class="bi bi-trash3" style="color:var(--danger);"></i></button>`
                    : `<i class="bi bi-lock" style="color:var(--muted);" title="Seule la dernière ligne peut être supprimée"></i>`
                }
            </td>
        </tr>`;
    }).join('');
}

function updateAddForm() {
    const nextSem = FICHE_ROWS.length + 1;
    const age = SELECTED_LOT ? (SELECTED_LOT.age_arrivee - 1 + nextSem) : nextSem;
    document.getElementById('add-sem').value = `S${nextSem}`;
    document.getElementById('add-age').value = age;
    document.getElementById('add-hint').textContent = `→ Prochaine semaine : S${nextSem} (âge ${age})`;
    document.getElementById('add-poids').value = '';
    document.getElementById('add-var').value = '0';
    document.getElementById('cost-preview').textContent = '';
}

function updateCostPreview() {
    const poids = parseFloat(document.getElementById('add-poids').value);
    const nId = parseInt(document.getElementById('add-nourr').value);
    const nourr = NOURRITURE.find(n => n.id_nourriture === nId);
    if (poids && nourr) {
        document.getElementById('cost-preview').textContent = `Coût estimé : ${(poids * nourr.prix_gramme).toFixed(2)} Ar / poulet / semaine`;
    } else {
        document.getElementById('cost-preview').textContent = '';
    }
}

function updateSaveButton() {
    HAS_CHANGES = JSON.stringify(FICHE_ROWS.map(r => ({ semaine: r.semaine, age: r.age, variation: r.variation, id_nourriture: r.id_nourriture, poids: r.poids })))
        !== JSON.stringify(SAVED_ROWS.map(r => ({ semaine: r.semaine, age: r.age, variation: r.variation, id_nourriture: r.id_nourriture, poids: r.poids })));
    document.getElementById('btn-save').style.display = HAS_CHANGES ? '' : 'none';
}

// --- Actions ---
function addRow() {
    const poids = parseFloat(document.getElementById('add-poids').value);
    const variation = parseFloat(document.getElementById('add-var').value) || 0;
    const id_nourriture = parseInt(document.getElementById('add-nourr').value);

    if (!poids || poids <= 0) {
        showToast('Veuillez saisir une quantité valide', 'warning');
        return;
    }

    const nextSem = FICHE_ROWS.length + 1;
    const age = SELECTED_LOT ? (SELECTED_LOT.age_arrivee - 1 + nextSem) : nextSem;

    FICHE_ROWS.push({
        semaine: nextSem,
        age,
        variation,
        id_nourriture,
        poids,
        _saved: false
    });

    renderTable();
    updateAddForm();
    updateSaveButton();
    // Scroll to bottom of table
    const tbody = document.getElementById('fiche-tbody');
    tbody.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function removeLastRow() {
    if (!FICHE_ROWS.length) return;
    FICHE_ROWS.pop();
    renderTable();
    updateAddForm();
    updateSaveButton();
}

function confirmClear() {
    document.getElementById('modal-clear').style.display = '';
}

function clearAllRows() {
    FICHE_ROWS = [];
    document.getElementById('modal-clear').style.display = 'none';
    renderTable();
    updateAddForm();
    updateSaveButton();
    showToast('Fiche vidée — pensez à sauvegarder', 'warning');
}

async function saveFiche() {
    if (!SELECTED_LOT || !SELECTED_LOT.id_fiche) return;

    const payload = {
        id_lot: SELECTED_LOT.id_lot,
        semaines: FICHE_ROWS.map(r => ({
            semaine: r.semaine,
            age: r.age,
            id_nourriture: r.id_nourriture,
            poids: r.poids,
            variation: r.variation
        }))
    };

    const { error } = await API.updateFiche(SELECTED_LOT.id_fiche, payload);
    if (error) {
        showToast('Erreur : ' + error, 'danger');
        return;
    }

    // Mark all as saved
    FICHE_ROWS = FICHE_ROWS.map(r => ({ ...r, _saved: true }));
    SAVED_ROWS = FICHE_ROWS.map(r => ({ ...r }));
    HAS_CHANGES = false;

    renderTable();
    updateSaveButton();
    showToast('Fiche sauvegardée avec succès', 'success');
}

function exportCSV() {
    if (!FICHE_ROWS.length || !SELECTED_LOT) return;
    const headers = ['semaine', 'age', 'nourriture', 'poids_g', 'variation_g', 'cout_estime'];
    const rows = FICHE_ROWS.map(r => {
        const n = NOURRITURE.find(n => n.id_nourriture === r.id_nourriture);
        return [
            r.semaine,
            r.age,
            n ? n.nom_nourriture : r.id_nourriture,
            r.poids,
            r.variation,
            n ? (r.poids * n.prix_gramme).toFixed(2) : ''
        ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fiche_${SELECTED_LOT.nom_lot}.csv`;
    a.click();
}

// --- Keyboard shortcut ---
function setupKeyboard() {
    document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && document.activeElement?.closest('#add-poids, #add-var, #add-nourr')) {
            e.preventDefault();
            addRow();
        }
    });
}

// --- beforeunload warning ---
window.addEventListener('beforeunload', e => {
    if (HAS_CHANGES) {
        e.preventDefault();
        e.returnValue = '';
    }
});
