/**
 * AKOHO — Nourriture Page
 */
let ALL_NOURRITURE = [];
let EDITING_ID = null;

document.addEventListener('partialsReady', () => loadNourriture());

async function loadNourriture() {
    const { data } = await API.getNourriture();
    ALL_NOURRITURE = data || [];
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('nourr-tbody');
    if (!ALL_NOURRITURE.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:32px;"><i class="bi bi-basket2" style="font-size:32px;display:block;margin-bottom:8px;"></i>Aucun aliment</td></tr>';
        return;
    }

    tbody.innerHTML = ALL_NOURRITURE.map(n => {
        const prixKg = (n.prix_gramme * 1000).toFixed(2);
        const hasFiches = (n.nb_fiches || 0) > 0;
        const typeBadge = n.type_aliment
            ? `<span class="badge badge-primary">${n.type_aliment}</span>`
            : '<span class="text-muted">—</span>';

        // Color code cost: green < 5, yellow 5-15, red > 15 per gram
        let costClass = '';
        if (n.prix_gramme > 0.015) costClass = 'color:var(--danger);';
        else if (n.prix_gramme > 0.005) costClass = 'color:var(--warning);';
        else costClass = 'color:var(--success);';

        return `<tr>
            <td><strong>${n.nom_nourriture}</strong></td>
            <td>${typeBadge}</td>
            <td class="text-end" style="${costClass}">${n.prix_gramme.toFixed(4)} Ar</td>
            <td class="text-end">${formatAr(parseFloat(prixKg))}</td>
            <td class="text-center"><span class="badge badge-muted">${n.nb_fiches || 0}</span></td>
            <td>
                <div style="display:flex;gap:4px;justify-content:center;">
                    <button class="btn-icon" onclick="editNourr(${n.id_nourriture})" title="Modifier"><i class="bi bi-pencil"></i></button>
                    <button class="btn-icon" onclick="deleteNourr(${n.id_nourriture})" title="Supprimer" ${hasFiches ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}>
                        <i class="bi bi-trash3" style="color:${hasFiches ? 'var(--muted)' : 'var(--danger)'};"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function openModal(editId = null) {
    EDITING_ID = editId;
    if (editId) {
        const n = ALL_NOURRITURE.find(n => n.id_nourriture === editId);
        if (!n) return;
        document.getElementById('modal-title').textContent = 'Modifier l\'aliment';
        document.getElementById('modal-submit').textContent = 'Enregistrer';
        document.getElementById('nourr-nom').value = n.nom_nourriture;
        document.getElementById('nourr-type').value = n.type_aliment || '';
        document.getElementById('nourr-prix').value = n.prix_gramme;
        updatePrixKg();
    } else {
        document.getElementById('modal-title').textContent = 'Nouvel aliment';
        document.getElementById('modal-submit').textContent = 'Créer';
        document.getElementById('nourr-nom').value = '';
        document.getElementById('nourr-type').value = '';
        document.getElementById('nourr-prix').value = '';
        document.getElementById('prix-kg-preview').textContent = 'Prix au kg : —';
    }
    document.getElementById('modal-nourr').style.display = '';
}

function closeModal() {
    document.getElementById('modal-nourr').style.display = 'none';
    EDITING_ID = null;
}

function editNourr(id) {
    openModal(id);
}

function updatePrixKg() {
    const prix = parseFloat(document.getElementById('nourr-prix').value);
    if (prix && prix > 0) {
        document.getElementById('prix-kg-preview').textContent = `Prix au kg : ${formatAr(prix * 1000)}`;
    } else {
        document.getElementById('prix-kg-preview').textContent = 'Prix au kg : —';
    }
}

async function submitNourr() {
    const nom_nourriture = document.getElementById('nourr-nom').value.trim();
    const type_aliment = document.getElementById('nourr-type').value || null;
    const prix_gramme = parseFloat(document.getElementById('nourr-prix').value);

    if (!nom_nourriture || isNaN(prix_gramme) || prix_gramme <= 0) {
        showToast('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }

    const body = { nom_nourriture, type_aliment, prix_gramme };
    let result;
    if (EDITING_ID) {
        result = await API.updateNourriture(EDITING_ID, body);
    } else {
        result = await API.createNourriture(body);
    }

    if (result.error) {
        showToast('Erreur : ' + result.error, 'danger');
        return;
    }

    closeModal();
    showToast(EDITING_ID ? 'Aliment modifié' : 'Aliment créé', 'success');
    await loadNourriture();
}

async function deleteNourr(id) {
    const n = ALL_NOURRITURE.find(n => n.id_nourriture === id);
    if (!confirm(`Supprimer l'aliment "${n?.nom_nourriture}" ?`)) return;

    const { error } = await API.deleteNourriture(id);
    if (error) {
        showToast('Erreur : ' + error, 'danger');
        return;
    }
    showToast('Aliment supprimé', 'success');
    await loadNourriture();
}
