/**
 * AKOHO — Races Page
 */
let ALL_RACES = [];
let EDITING_ID = null;

const RACE_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#6366F1'];

document.addEventListener('partialsReady', () => loadRaces());

async function loadRaces() {
    const { data } = await API.getRaces();
    ALL_RACES = data || [];
    renderCards();
    renderTable();
}

function renderCards() {
    const container = document.getElementById('races-cards');
    if (!ALL_RACES.length) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = ALL_RACES.map((r, i) => {
        const color = RACE_COLORS[i % RACE_COLORS.length];
        return `<div class="card" style="padding:20px;border-left:4px solid ${color};">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="width:40px;height:40px;border-radius:10px;background:${color}15;display:flex;align-items:center;justify-content:center;">
                    <i class="bi bi-bookmarks" style="color:${color};font-size:18px;"></i>
                </div>
                <div>
                    <div style="font-weight:700;font-size:15px;">${r.nom_race}</div>
                    <div class="text-muted" style="font-size:12px;">${r.nb_lots || 0} lot(s)</div>
                </div>
            </div>
            <div style="display:flex;gap:16px;font-size:13px;">
                <div><span class="text-muted">Œuf :</span> <strong>${formatAr(r.prix_oeuf)}</strong></div>
                <div><span class="text-muted">Kg :</span> <strong>${formatAr(r.prix_kg)}</strong></div>
            </div>
        </div>`;
    }).join('');
}

function renderTable() {
    const tbody = document.getElementById('races-tbody');
    if (!ALL_RACES.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:32px;"><i class="bi bi-bookmarks" style="font-size:32px;display:block;margin-bottom:8px;"></i>Aucune race</td></tr>';
        return;
    }
    tbody.innerHTML = ALL_RACES.map(r => {
        const hasLots = (r.nb_lots || 0) > 0;
        return `<tr>
            <td><strong>${r.nom_race}</strong></td>
            <td class="text-end">${formatAr(r.prix_oeuf)}</td>
            <td class="text-end">${formatAr(r.prix_kg)}</td>
            <td class="text-center"><span class="badge badge-primary">${r.nb_lots || 0}</span></td>
            <td class="text-muted">${r.description || '—'}</td>
            <td>
                <div style="display:flex;gap:4px;justify-content:center;">
                    <button class="btn-icon" onclick="editRace(${r.id_race})" title="Modifier"><i class="bi bi-pencil"></i></button>
                    <button class="btn-icon" onclick="deleteRace(${r.id_race})" title="Supprimer" ${hasLots ? 'disabled style="opacity:0.3;cursor:not-allowed;" title="Des lots utilisent cette race"' : ''}>
                        <i class="bi bi-trash3" style="color:${hasLots ? 'var(--muted)' : 'var(--danger)'};"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function openModal(editId = null) {
    EDITING_ID = editId;
    if (editId) {
        const r = ALL_RACES.find(r => r.id_race === editId);
        if (!r) return;
        document.getElementById('modal-title').textContent = 'Modifier la race';
        document.getElementById('modal-submit').textContent = 'Enregistrer';
        document.getElementById('race-nom').value = r.nom_race;
        document.getElementById('race-prix-oeuf').value = r.prix_oeuf;
        document.getElementById('race-prix-kg').value = r.prix_kg;
        document.getElementById('race-desc').value = r.description || '';
    } else {
        document.getElementById('modal-title').textContent = 'Nouvelle race';
        document.getElementById('modal-submit').textContent = 'Créer';
        document.getElementById('race-nom').value = '';
        document.getElementById('race-prix-oeuf').value = '';
        document.getElementById('race-prix-kg').value = '';
        document.getElementById('race-desc').value = '';
    }
    document.getElementById('modal-race').style.display = '';
}

function closeModal() {
    document.getElementById('modal-race').style.display = 'none';
    EDITING_ID = null;
}

function editRace(id) {
    openModal(id);
}

async function submitRace() {
    const nom_race = document.getElementById('race-nom').value.trim();
    const prix_oeuf = parseFloat(document.getElementById('race-prix-oeuf').value);
    const prix_kg = parseFloat(document.getElementById('race-prix-kg').value);
    const description = document.getElementById('race-desc').value.trim() || null;

    if (!nom_race || isNaN(prix_oeuf) || isNaN(prix_kg)) {
        showToast('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }

    const body = { nom_race, prix_oeuf, prix_kg, description };
    let result;
    if (EDITING_ID) {
        result = await API.updateRace(EDITING_ID, body);
    } else {
        result = await API.createRace(body);
    }

    if (result.error) {
        showToast('Erreur : ' + result.error, 'danger');
        return;
    }

    closeModal();
    showToast(EDITING_ID ? 'Race modifiée' : 'Race créée', 'success');
    await loadRaces();
}

async function deleteRace(id) {
    const race = ALL_RACES.find(r => r.id_race === id);
    if (!confirm(`Supprimer la race "${race?.nom_race}" ?`)) return;

    const { error } = await API.deleteRace(id);
    if (error) {
        showToast('Erreur : ' + error, 'danger');
        return;
    }
    showToast('Race supprimée', 'success');
    await loadRaces();
}
