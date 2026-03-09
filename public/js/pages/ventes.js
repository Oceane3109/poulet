/**
 * AKOHO — Ventes Page
 */
let LOTS = [];
let RACES = [];
let VENTES_OEUFS = [];
let VENTES_POULETS = [];
let VENTES_LOTS = [];
let CURRENT_TAB = 'oeufs';

document.addEventListener('partialsReady', async () => {
    const [lotsRes, racesRes] = await Promise.all([API.getLots(), API.getRaces()]);
    LOTS = lotsRes.data || [];
    RACES = racesRes.data || [];
    populateSelects();
    await loadAll();
});

function populateSelects() {
    const options = LOTS.map(l => `<option value="${l.id_lot}">${l.nom_lot}</option>`).join('');
    ['vo-lot', 'vp-lot', 'vl-lot'].forEach(id => {
        document.getElementById(id).innerHTML = options;
    });
    // Populate filter lot
    document.getElementById('filter-lot').innerHTML = '<option value="">Tous les lots</option>' + options;
    const today = getSelectedDate();
    ['vo-date', 'vp-date', 'vl-date'].forEach(id => {
        document.getElementById(id).value = today;
    });
}

async function loadAll() {
    const [oR, pR, lR] = await Promise.all([
        API.getVentesOeufs(),
        API.getVentesPoulets(),
        API.getVentesLots()
    ]);
    VENTES_OEUFS = oR.data || [];
    VENTES_POULETS = pR.data || [];
    VENTES_LOTS = lR.data || [];

    applyVenteFilters();
}

function getVenteFilteredList(list, dateField) {
    const lotFilter = document.getElementById('filter-lot').value;
    const from = document.getElementById('filter-from').value;
    const to = document.getElementById('filter-to').value;
    let filtered = list;
    if (lotFilter) filtered = filtered.filter(v => v.id_lot === parseInt(lotFilter));
    if (from) filtered = filtered.filter(v => v[dateField] && v[dateField].substring(0, 10) >= from);
    if (to) filtered = filtered.filter(v => v[dateField] && v[dateField].substring(0, 10) <= to);
    return filtered;
}

function applyVenteFilters() {
    renderOeufs();
    renderPoulets();
    renderLots();
}

function clearVenteFilters() {
    document.getElementById('filter-lot').value = '';
    document.getElementById('filter-from').value = '';
    document.getElementById('filter-to').value = '';
    applyVenteFilters();
}

function switchTab(tab) {
    CURRENT_TAB = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('tab-oeufs').style.display = tab === 'oeufs' ? '' : 'none';
    document.getElementById('tab-poulets').style.display = tab === 'poulets' ? '' : 'none';
    document.getElementById('tab-lots').style.display = tab === 'lots' ? '' : 'none';
}

// --- Oeufs ---
function renderOeufs() {
    const tbody = document.getElementById('oeufs-tbody');
    const filtered = getVenteFilteredList(VENTES_OEUFS, 'date_vente');
    const total = filtered.reduce((s, v) => s + (v.prix_total || 0), 0);
    document.getElementById('oeufs-total').textContent = `Total : ${formatAr(total)} — ${filtered.length} vente(s)`;

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:24px;">Aucune vente d\'œufs</td></tr>';
        return;
    }
    const sorted = [...filtered].sort((a, b) => new Date(b.date_vente) - new Date(a.date_vente));
    tbody.innerHTML = sorted.map(v => {
        const lot = LOTS.find(l => l.id_lot === v.id_lot);
        return `<tr>
            <td>${formatDate(v.date_vente)}</td>
            <td>${lot ? lot.nom_lot : '#' + v.id_lot}</td>
            <td class="text-end">${formatNumber(v.nb_oeufs)}</td>
            <td class="text-end">${formatAr(v.prix_unitaire)}</td>
            <td class="text-end"><strong>${formatAr(v.prix_total)}</strong></td>
        </tr>`;
    }).join('');
}

// --- Poulets ---
function renderPoulets() {
    const tbody = document.getElementById('poulets-tbody');
    const filtered = getVenteFilteredList(VENTES_POULETS, 'date_vente');
    const total = filtered.reduce((s, v) => s + (v.prix_total || 0), 0);
    document.getElementById('poulets-total').textContent = `Total : ${formatAr(total)} — ${filtered.length} vente(s)`;

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:24px;">Aucune vente de poulets</td></tr>';
        return;
    }
    const sorted = [...filtered].sort((a, b) => new Date(b.date_vente) - new Date(a.date_vente));
    tbody.innerHTML = sorted.map(v => {
        const lot = LOTS.find(l => l.id_lot === v.id_lot);
        return `<tr>
            <td>${formatDate(v.date_vente)}</td>
            <td>${lot ? lot.nom_lot : '#' + v.id_lot}</td>
            <td class="text-end">${v.nb_poulets}</td>
            <td class="text-end">${v.poids_total_kg} kg</td>
            <td class="text-end">${formatAr(v.prix_kg)}</td>
            <td class="text-end"><strong>${formatAr(v.prix_total)}</strong></td>
        </tr>`;
    }).join('');
}

// --- Lots ---
function renderLots() {
    const tbody = document.getElementById('lots-tbody');
    const filtered = getVenteFilteredList(VENTES_LOTS, 'date_vente');
    const total = filtered.reduce((s, v) => s + (v.prix_vente || 0), 0);
    document.getElementById('lots-total').textContent = `Total : ${formatAr(total)} — ${filtered.length} cession(s)`;

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding:24px;">Aucune cession de lot</td></tr>';
        return;
    }
    const sorted = [...filtered].sort((a, b) => new Date(b.date_vente) - new Date(a.date_vente));
    tbody.innerHTML = sorted.map(v => {
        const lot = LOTS.find(l => l.id_lot === v.id_lot);
        return `<tr>
            <td>${formatDate(v.date_vente)}</td>
            <td>${lot ? lot.nom_lot : '#' + v.id_lot}</td>
            <td class="text-end"><strong>${formatAr(v.prix_vente)}</strong></td>
        </tr>`;
    }).join('');
}

// --- Modals ---
function openVenteOeufModal() {
    document.getElementById('vo-nb').value = '';
    document.getElementById('vo-prix').value = '';
    document.getElementById('vo-total').textContent = 'Total estimé : —';
    document.getElementById('vo-date').value = getSelectedDate();
    document.getElementById('modal-vente-oeuf').style.display = '';
}
function closeVenteOeufModal() { document.getElementById('modal-vente-oeuf').style.display = 'none'; }

function updateVOTotal() {
    const nb = parseInt(document.getElementById('vo-nb').value) || 0;
    const prix = parseFloat(document.getElementById('vo-prix').value);
    if (nb > 0 && prix) {
        document.getElementById('vo-total').textContent = `Total estimé : ${formatAr(nb * prix)}`;
    } else if (nb > 0) {
        // Get race price
        const lotId = parseInt(document.getElementById('vo-lot').value);
        const lot = LOTS.find(l => l.id_lot === lotId);
        const race = lot ? RACES.find(r => r.id_race === lot.id_race) : null;
        if (race) {
            document.getElementById('vo-total').textContent = `Total estimé : ${formatAr(nb * race.prix_oeuf)} (prix race)`;
        } else {
            document.getElementById('vo-total').textContent = 'Total estimé : prix de la race appliqué';
        }
    } else {
        document.getElementById('vo-total').textContent = 'Total estimé : —';
    }
}

async function submitVenteOeuf() {
    const id_lot = parseInt(document.getElementById('vo-lot').value);
    const date_vente = document.getElementById('vo-date').value;
    const nb_oeufs = parseInt(document.getElementById('vo-nb').value);
    const prix_unitaire = parseFloat(document.getElementById('vo-prix').value) || null;

    if (!id_lot || !date_vente || !nb_oeufs || nb_oeufs <= 0) {
        showToast('Veuillez remplir les champs obligatoires', 'warning');
        return;
    }

    const { error } = await API.createVenteOeuf({ id_lot, date_vente, nb_oeufs, prix_unitaire });
    if (error) { showToast('Erreur : ' + error, 'danger'); return; }
    closeVenteOeufModal();
    showToast('Vente d\'œufs enregistrée', 'success');
    await loadAll();
}

let VP_POIDS_UNITAIRE = null; // poids unitaire en kg from fiche_row
let VP_PRIX_KG = null;       // prix/kg from race

function openVentePouletModal() {
    document.getElementById('vp-nb').value = '';
    document.getElementById('vp-poids').value = '';
    document.getElementById('vp-prix').value = '';
    document.getElementById('vp-total').textContent = 'Total estimé : —';
    document.getElementById('vp-poids-hint').textContent = '';
    document.getElementById('vp-date').value = getSelectedDate();
    VP_POIDS_UNITAIRE = null;
    VP_PRIX_KG = null;
    document.getElementById('modal-vente-poulet').style.display = '';
    updateVPEstimates();
}
function closeVentePouletModal() { document.getElementById('modal-vente-poulet').style.display = 'none'; }

async function updateVPEstimates() {
    const lotId = parseInt(document.getElementById('vp-lot').value);
    const date = document.getElementById('vp-date').value;
    if (!lotId || !date) return;

    const { data } = await API.getPoidsLot(lotId, date);
    if (data) {
        VP_POIDS_UNITAIRE = data.poids_unitaire_kg;
        VP_PRIX_KG = data.prix_kg;

        // Show poids hint
        if (VP_POIDS_UNITAIRE) {
            document.getElementById('vp-poids-hint').textContent = `(~${VP_POIDS_UNITAIRE.toFixed(2)} kg/poulet)`;
        } else {
            document.getElementById('vp-poids-hint').textContent = '(poids fiche non disponible)';
        }

        // Set prix placeholder
        if (VP_PRIX_KG) {
            document.getElementById('vp-prix').placeholder = `${formatNumber(VP_PRIX_KG)} Ar/kg (prix race)`;
        }
    }

    // Recalculate if nb is already filled
    updateVPPoids();
}

function updateVPPoids() {
    const nb = parseInt(document.getElementById('vp-nb').value) || 0;
    if (nb > 0 && VP_POIDS_UNITAIRE) {
        const poidsTotal = (nb * VP_POIDS_UNITAIRE).toFixed(2);
        document.getElementById('vp-poids').value = poidsTotal;
    }
    updateVPTotal();
}

function updateVPTotal() {
    const poids = parseFloat(document.getElementById('vp-poids').value) || 0;
    const prix = parseFloat(document.getElementById('vp-prix').value);
    if (poids > 0 && prix) {
        document.getElementById('vp-total').textContent = `Total estimé : ${formatAr(poids * prix)}`;
    } else if (poids > 0) {
        const lotId = parseInt(document.getElementById('vp-lot').value);
        const lot = LOTS.find(l => l.id_lot === lotId);
        const race = lot ? RACES.find(r => r.id_race === lot.id_race) : null;
        if (race) {
            document.getElementById('vp-total').textContent = `Total estimé : ${formatAr(poids * race.prix_kg)} (prix race)`;
        }
    } else {
        document.getElementById('vp-total').textContent = 'Total estimé : —';
    }
}

async function submitVentePoulet() {
    const id_lot = parseInt(document.getElementById('vp-lot').value);
    const date_vente = document.getElementById('vp-date').value;
    const nb_poulets = parseInt(document.getElementById('vp-nb').value);
    const poids_total_kg = parseFloat(document.getElementById('vp-poids').value);
    const prix_kg = parseFloat(document.getElementById('vp-prix').value) || null;

    if (!id_lot || !date_vente || !nb_poulets || !poids_total_kg) {
        showToast('Veuillez remplir les champs obligatoires', 'warning');
        return;
    }

    const { error } = await API.createVentePoulet({ id_lot, date_vente, nb_poulets, poids_total_kg, prix_kg });
    if (error) { showToast('Erreur : ' + error, 'danger'); return; }
    closeVentePouletModal();
    showToast('Vente de poulets enregistrée', 'success');
    await loadAll();
}

function openVenteLotModal() {
    document.getElementById('vl-prix').value = '';
    document.getElementById('vl-date').value = getSelectedDate();
    document.getElementById('modal-vente-lot').style.display = '';
}
function closeVenteLotModal() { document.getElementById('modal-vente-lot').style.display = 'none'; }

async function submitVenteLot() {
    const id_lot = parseInt(document.getElementById('vl-lot').value);
    const date_vente = document.getElementById('vl-date').value;
    const prix_vente = parseFloat(document.getElementById('vl-prix').value);

    if (!id_lot || !date_vente || !prix_vente) {
        showToast('Veuillez remplir tous les champs', 'warning');
        return;
    }

    const { error } = await API.createVenteLot({ id_lot, date_vente, prix_vente });
    if (error) { showToast('Erreur : ' + error, 'danger'); return; }
    closeVenteLotModal();
    showToast('Cession de lot enregistrée', 'success');
    await loadAll();
}
