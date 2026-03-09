/**
 * AKOHO — Pertes / Mortalité Page
 */
let LOTS = [];
let ALL_PERTES = [];

document.addEventListener('partialsReady', async () => {
    const { data } = await API.getLots();
    LOTS = data || [];
    populateFilters();
    await loadData();
});

document.addEventListener('dateChanged', () => loadData());

function populateFilters() {
    const options = LOTS.map(l => `<option value="${l.id_lot}">${l.nom_lot}</option>`).join('');
    document.getElementById('filter-lot').innerHTML = '<option value="">Tous les lots</option>' + options;
    document.getElementById('add-lot').innerHTML = options;
    document.getElementById('add-date').value = getSelectedDate();
}

async function loadData() {
    const { data } = await API.getPertes();
    ALL_PERTES = data || [];

    updateKPIs();
    populateCauseFilter();
    filterPertes();
    updateBadge();
}

function updateKPIs() {
    const date = getSelectedDate();
    const dateObj = new Date(date);
    const month = dateObj.getMonth();
    const year = dateObj.getFullYear();

    // Day losses
    const pertesJour = ALL_PERTES.filter(p => p.date_perte && p.date_perte.substring(0, 10) === date)
        .reduce((s, p) => s + (p.nb_perdus || 0), 0);

    // Month losses
    const pertesMois = ALL_PERTES.filter(p => {
        const d = new Date(p.date_perte);
        return d.getMonth() === month && d.getFullYear() === year;
    }).reduce((s, p) => s + (p.nb_perdus || 0), 0);

    // Total
    const pertesTotal = ALL_PERTES.reduce((s, p) => s + (p.nb_perdus || 0), 0);

    // Most affected lot
    const lotCounts = {};
    ALL_PERTES.forEach(p => {
        lotCounts[p.id_lot] = (lotCounts[p.id_lot] || 0) + (p.nb_perdus || 0);
    });
    let maxLot = '—';
    let maxCount = 0;
    for (const [id, count] of Object.entries(lotCounts)) {
        if (count > maxCount) {
            maxCount = count;
            const lot = LOTS.find(l => l.id_lot === parseInt(id));
            maxLot = lot ? `${lot.nom_lot} (${count})` : `Lot #${id} (${count})`;
        }
    }

    document.getElementById('kpi-jour').textContent = formatNumber(pertesJour);
    document.getElementById('kpi-mois').textContent = formatNumber(pertesMois);
    document.getElementById('kpi-total').textContent = formatNumber(pertesTotal);
    document.getElementById('kpi-lot').textContent = maxLot;
}

function populateCauseFilter() {
    const causes = [...new Set(ALL_PERTES.map(p => p.cause).filter(Boolean))];
    const sel = document.getElementById('filter-cause');
    const current = sel.value;
    sel.innerHTML = '<option value="">Toutes les causes</option>' +
        causes.map(c => `<option value="${c}">${c}</option>`).join('');
    sel.value = current;
}

function filterPertes() {
    const lotFilter = document.getElementById('filter-lot').value;
    const causeFilter = document.getElementById('filter-cause').value;
    const entiteFilter = document.getElementById('filter-entite').value;
    const from = document.getElementById('filter-from').value;
    const to = document.getElementById('filter-to').value;

    let filtered = ALL_PERTES;
    if (lotFilter) filtered = filtered.filter(p => p.id_lot === parseInt(lotFilter));
    if (causeFilter) filtered = filtered.filter(p => p.cause === causeFilter);
    if (entiteFilter) filtered = filtered.filter(p => (p.entite || 'Poulet') === entiteFilter);
    if (from) filtered = filtered.filter(p => p.date_perte && p.date_perte.substring(0, 10) >= from);
    if (to) filtered = filtered.filter(p => p.date_perte && p.date_perte.substring(0, 10) <= to);

    renderTable(filtered);
}

function clearPertesFilters() {
    document.getElementById('filter-lot').value = '';
    document.getElementById('filter-cause').value = '';
    document.getElementById('filter-entite').value = '';
    document.getElementById('filter-from').value = '';
    document.getElementById('filter-to').value = '';
    filterPertes();
}

function renderTable(pertes) {
    const tbody = document.getElementById('pertes-tbody');
    if (!pertes.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:32px;"><i class="bi bi-heartbreak" style="font-size:32px;display:block;margin-bottom:8px;"></i>Aucune perte enregistrée</td></tr>';
        return;
    }

    const sorted = [...pertes].sort((a, b) => new Date(b.date_perte) - new Date(a.date_perte));

    tbody.innerHTML = sorted.map(p => {
        const lot = LOTS.find(l => l.id_lot === p.id_lot);
        const entiteIcon = p.entite === 'Oeuf' ? 'bi-egg' : 'bi-feather';
        const entiteColor = p.entite === 'Oeuf' ? 'var(--warning)' : 'var(--danger)';
        const entiteLabel = p.entite || 'Poulet';
        return `<tr>
            <td>${formatDate(p.date_perte)}</td>
            <td>${lot ? lot.nom_lot : 'Lot #' + p.id_lot}</td>
            <td><span style="display:inline-flex;align-items:center;gap:4px;"><i class="bi ${entiteIcon}" style="color:${entiteColor};"></i> ${entiteLabel}</span></td>
            <td class="text-end"><strong style="color:var(--danger);">${p.nb_perdus}</strong></td>
            <td>${p.cause ? `<span class="badge badge-danger">${p.cause}</span>` : '<span class="text-muted">Non spécifiée</span>'}</td>
        </tr>`;
    }).join('');
}

function updateBadge() {
    const date = getSelectedDate();
    const pertesJour = ALL_PERTES.filter(p => p.date_perte && p.date_perte.substring(0, 10) === date)
        .reduce((s, p) => s + (p.nb_perdus || 0), 0);
    SidebarBadge.set('badge-pertes', pertesJour);
}

function openAddModal() {
    document.getElementById('add-date').value = getSelectedDate();
    document.getElementById('add-nb').value = '';
    document.getElementById('add-cause').value = '';
    document.getElementById('modal-add').style.display = '';
}

function closeAddModal() {
    document.getElementById('modal-add').style.display = 'none';
}

async function submitAdd() {
    const id_lot = parseInt(document.getElementById('add-lot').value);
    const date_perte = document.getElementById('add-date').value;
    const nb_perdus = parseInt(document.getElementById('add-nb').value);
    const cause = document.getElementById('add-cause').value.trim() || null;
    const entite = document.getElementById('add-entite').value;

    if (!id_lot || !date_perte || !nb_perdus || nb_perdus <= 0) {
        showToast('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }

    const { error } = await API.createPerte({ id_lot, date_perte, nb_perdus, cause, entite });
    if (error) {
        showToast('Erreur : ' + error, 'danger');
        return;
    }

    closeAddModal();
    showToast('Perte enregistrée', 'success');
    await loadData();
}
