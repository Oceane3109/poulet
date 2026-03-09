/**
 * AKOHO — Production d'œufs Page
 */
let LOTS = [];
let OEUFS = [];
let DASHBOARD = [];

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
    const date = getSelectedDate();
    const lot = document.getElementById('filter-lot').value || null;

    const [oeufRes, dashRes] = await Promise.all([
        API.getOeufs(null, lot),
        API.getDashboard(date)
    ]);

    OEUFS = oeufRes.data || [];
    DASHBOARD = dashRes.data || [];

    updateKPIs(date);
    renderTable();
}

function updateKPIs(date) {
    // Total produced (all time up to date)
    let totalProd = 0, totalVendu = 0, totalCouv = 0;
    for (const row of DASHBOARD) {
        totalProd += (row.stock_oeufs || 0);
        totalVendu += 0; // We approximate from dashboard data
    }

    // Use dashboard data for KPIs  
    const totalStock = DASHBOARD.reduce((s, r) => s + (r.stock_oeufs || 0), 0);
    const totalOeufJour = DASHBOARD.reduce((s, r) => s + (r.atody_oeufs || 0), 0);

    // For total produced / vendu, we sum from oeufs data
    const prodTotal = OEUFS.reduce((s, o) => s + (o.nb_oeufs || 0), 0);

    document.getElementById('kpi-total').textContent = formatNumber(prodTotal);
    document.getElementById('kpi-stock').textContent = formatNumber(totalStock);

    // Approximate vendu & couvaison from stock difference
    const estimated_vendu = Math.max(0, prodTotal - totalStock);
    document.getElementById('kpi-vendu').textContent = formatNumber(estimated_vendu);
    document.getElementById('kpi-couvaison').textContent = '-';

    // Sale rate
    const rate = prodTotal > 0 ? Math.round((estimated_vendu / prodTotal) * 100) : 0;
    document.getElementById('sale-rate-bar').style.width = rate + '%';
    document.getElementById('sale-rate-text').textContent = rate + '%';
}

function renderTable() {
    const tbody = document.getElementById('oeufs-tbody');
    if (!OEUFS.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding:32px;"><i class="bi bi-egg" style="font-size:32px;display:block;margin-bottom:8px;"></i>Aucune production enregistrée</td></tr>';
        return;
    }

    // Apply date range filter client-side
    const from = document.getElementById('filter-from').value;
    const to = document.getElementById('filter-to').value;
    let filtered = OEUFS;
    if (from) filtered = filtered.filter(o => o.date_production && o.date_production.substring(0, 10) >= from);
    if (to) filtered = filtered.filter(o => o.date_production && o.date_production.substring(0, 10) <= to);

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding:32px;">Aucun résultat pour ces filtres</td></tr>';
        return;
    }

    const sorted = [...filtered].sort((a, b) => new Date(b.date_production) - new Date(a.date_production));

    tbody.innerHTML = sorted.map(o => {
        const lot = LOTS.find(l => l.id_lot === o.id_lot);
        return `<tr>
            <td>${formatDate(o.date_production)}</td>
            <td>${lot ? lot.nom_lot : 'Lot #' + o.id_lot}</td>
            <td class="text-end"><strong>${formatNumber(o.nb_oeufs)}</strong></td>
            <td class="text-center">
                <button class="btn-icon" onclick="deleteOeuf(${o.id_production})" title="Supprimer">
                    <i class="bi bi-trash3" style="color:var(--danger);"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function openAddModal() {
    document.getElementById('add-date').value = getSelectedDate();
    document.getElementById('add-nb').value = '';
    document.getElementById('modal-add').style.display = '';
}

function closeAddModal() {
    document.getElementById('modal-add').style.display = 'none';
}

async function submitAdd() {
    const id_lot = parseInt(document.getElementById('add-lot').value);
    const date_production = document.getElementById('add-date').value;
    const nb_oeufs = parseInt(document.getElementById('add-nb').value);

    if (!id_lot || !date_production || !nb_oeufs || nb_oeufs <= 0) {
        showToast('Veuillez remplir tous les champs', 'warning');
        return;
    }

    const { error } = await API.createOeuf({ id_lot, date_production, nb_oeufs });
    if (error) {
        showToast('Erreur : ' + error, 'danger');
        return;
    }

    closeAddModal();
    showToast('Production enregistrée', 'success');
    await loadData();
}

async function deleteOeuf(id) {
    if (!confirm('Supprimer cette production ?')) return;
    const { error } = await API.deleteOeuf(id);
    if (error) {
        showToast('Erreur : ' + error, 'danger');
        return;
    }
    showToast('Production supprimée', 'success');
    await loadData();
}

function clearOeufsFilters() {
    document.getElementById('filter-lot').value = '';
    document.getElementById('filter-from').value = '';
    document.getElementById('filter-to').value = '';
    loadData();
}
