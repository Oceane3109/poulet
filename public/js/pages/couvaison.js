/**
 * AKOHO — Couvaison Page
 */
const COUVAISON_DAYS = 45;
let LOTS = [];
let COUVAISONS = [];
let ECLORE_ID = null;

document.addEventListener('partialsReady', async () => {
    const { data } = await API.getLots();
    LOTS = data || [];
    populateLotSelect();
    await loadData();
});

function populateLotSelect() {
    const options = LOTS.map(l => `<option value="${l.id_lot}">${l.nom_lot}</option>`).join('');
    document.getElementById('new-lot').innerHTML = options;
    document.getElementById('filter-lot').innerHTML = '<option value="">Tous les lots mères</option>' + options;
}

async function loadData() {
    const { data } = await API.getCouvaisons();
    COUVAISONS = data || [];
    updateKPIs();
    renderFiltered();
    updateBadge();
}

function renderFiltered() {
    const lotFilter = document.getElementById('filter-lot').value;
    const statusFilter = document.getElementById('filter-status').value;

    let list = COUVAISONS;
    if (lotFilter) list = list.filter(c => c.id_lot_mere === parseInt(lotFilter));
    if (statusFilter === 'active') list = list.filter(c => c.nb_ecloses == null);
    else if (statusFilter === 'done') list = list.filter(c => c.nb_ecloses != null);

    renderActive(list.filter(c => c.nb_ecloses == null));
    renderHistory(list.filter(c => c.nb_ecloses != null));
}

function clearCouvFilters() {
    document.getElementById('filter-lot').value = '';
    document.getElementById('filter-status').value = '';
    renderFiltered();
}

function updateKPIs() {
    const today = new Date(getSelectedDate());
    const active = COUVAISONS.filter(c => c.nb_ecloses == null);
    const done = COUVAISONS.filter(c => c.nb_ecloses != null);
    const imminent = active.filter(c => {
        const ecl = new Date(c.date_eclosion);
        const diff = Math.ceil((ecl - today) / (1000 * 60 * 60 * 24));
        return diff <= 5 && diff >= 0;
    });
    const totalOeufs = COUVAISONS.reduce((s, c) => s + (c.nb_oeufs_couves || 0), 0);

    document.getElementById('kpi-encours').textContent = active.length;
    document.getElementById('kpi-imminente').textContent = imminent.length;
    document.getElementById('kpi-terminees').textContent = done.length;
    document.getElementById('kpi-total-oeufs').textContent = formatNumber(totalOeufs);
}

function renderActive(active) {
    const tbody = document.getElementById('active-tbody');
    const today = new Date(getSelectedDate());

    if (!active.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:24px;"><i class="bi bi-thermometer" style="font-size:28px;display:block;margin-bottom:8px;"></i>Aucune couvaison active</td></tr>';
        return;
    }

    tbody.innerHTML = active.map(c => {
        const lot = LOTS.find(l => l.id_lot === c.id_lot_mere);
        const start = new Date(c.date_mise_couvaison);
        const eclosion = new Date(c.date_eclosion);
        const elapsed = Math.max(0, Math.ceil((today - start) / (1000 * 60 * 60 * 24)));
        const remaining = Math.max(0, Math.ceil((eclosion - today) / (1000 * 60 * 60 * 24)));
        const pct = Math.min(100, Math.round((elapsed / COUVAISON_DAYS) * 100));
        const isUrgent = remaining <= 5;

        return `<tr>
            <td><strong>${lot ? lot.nom_lot : '#' + c.id_lot_mere}</strong></td>
            <td>${formatDate(c.date_mise_couvaison)}</td>
            <td class="text-center">${c.nb_oeufs_couves}</td>
            <td>${formatDate(c.date_eclosion)}</td>
            <td style="min-width:140px;">
                <div class="progress">
                    <div class="progress-bar${isUrgent ? ' bg-danger' : ''}" style="width:${pct}%"></div>
                </div>
                <span style="font-size:11px;color:var(--muted);">${pct}%</span>
            </td>
            <td class="text-center">
                <span class="badge ${isUrgent ? 'badge-danger' : 'badge-primary'}">${remaining}j</span>
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-success" onclick="openEcloreModal(${c.id_couvaison})">
                    <i class="bi bi-sun"></i> Éclosion
                </button>
            </td>
        </tr>`;
    }).join('');
}

function renderHistory(done) {
    const tbody = document.getElementById('history-tbody');

    if (!done.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:24px;">Aucune éclosion enregistrée</td></tr>';
        return;
    }

    tbody.innerHTML = done.map(c => {
        const lotMere = LOTS.find(l => l.id_lot === c.id_lot_mere);
        const lotNe = LOTS.find(l => l.id_lot === c.id_lot_ne);
        const taux = c.nb_oeufs_couves > 0 ? Math.round((c.nb_ecloses / c.nb_oeufs_couves) * 100) : 0;
        const tauxClass = taux >= 70 ? 'badge-success' : taux >= 40 ? 'badge-warning' : 'badge-danger';

        return `<tr>
            <td>${lotMere ? lotMere.nom_lot : '#' + c.id_lot_mere}</td>
            <td>${formatDate(c.date_mise_couvaison)}</td>
            <td class="text-center">${c.nb_oeufs_couves}</td>
            <td class="text-center">${c.nb_ecloses}</td>
            <td class="text-center"><span class="badge ${tauxClass}">${taux}%</span></td>
            <td>${lotNe ? lotNe.nom_lot : '—'}</td>
            <td>${formatDate(c.date_eclosion)}</td>
        </tr>`;
    }).join('');
}

function updateBadge() {
    const today = new Date(getSelectedDate());
    const imminent = COUVAISONS.filter(c => {
        if (c.nb_ecloses != null) return false;
        const diff = Math.ceil((new Date(c.date_eclosion) - today) / (1000 * 60 * 60 * 24));
        return diff <= 5 && diff >= 0;
    }).length;
    SidebarBadge.set('badge-couvaison', imminent);
}

// --- New couvaison ---
function openNewModal() {
    document.getElementById('new-date').value = getSelectedDate();
    document.getElementById('new-nb').value = '';
    updateNewPreview();
    document.getElementById('new-date').addEventListener('input', updateNewPreview);
    document.getElementById('modal-new').style.display = '';
}

function closeNewModal() {
    document.getElementById('modal-new').style.display = 'none';
}

function updateNewPreview() {
    const dateStr = document.getElementById('new-date').value;
    if (dateStr) {
        const ecl = new Date(dateStr);
        ecl.setDate(ecl.getDate() + COUVAISON_DAYS);
        document.getElementById('new-preview').textContent = `Éclosion prévue : ${formatDate(ecl.toISOString())}`;
    }
}

async function submitNew() {
    const id_lot_mere = parseInt(document.getElementById('new-lot').value);
    const date_mise_couvaison = document.getElementById('new-date').value;
    const nb_oeufs_couves = parseInt(document.getElementById('new-nb').value);

    if (!id_lot_mere || !date_mise_couvaison || !nb_oeufs_couves || nb_oeufs_couves <= 0) {
        showToast('Veuillez remplir tous les champs', 'warning');
        return;
    }

    const { error } = await API.createCouvaison({ id_lot_mere, date_mise_couvaison, nb_oeufs_couves });
    if (error) {
        showToast('Erreur : ' + error, 'danger');
        return;
    }

    closeNewModal();
    showToast('Couvaison lancée avec succès', 'success');
    await loadData();
    // Reload lots in case new ones were added
    const { data } = await API.getLots();
    LOTS = data || [];
}

// --- Eclosion ---
function openEcloreModal(id) {
    ECLORE_ID = id;
    const couv = COUVAISONS.find(c => c.id_couvaison === id);
    const lot = LOTS.find(l => l.id_lot === couv?.id_lot_mere);
    document.getElementById('eclore-info').textContent = couv
        ? `${couv.nb_oeufs_couves} œufs de ${lot ? lot.nom_lot : 'Lot #' + couv.id_lot_mere} — éclosion prévue le ${formatDate(couv.date_eclosion)}`
        : '';
    document.getElementById('eclore-nb').value = '';
    document.getElementById('eclore-nb').max = couv ? couv.nb_oeufs_couves : '';
    document.getElementById('eclore-nom').value = '';
    document.getElementById('modal-eclore').style.display = '';
}

function closeEcloreModal() {
    document.getElementById('modal-eclore').style.display = 'none';
    ECLORE_ID = null;
}

async function submitEclore() {
    if (!ECLORE_ID) return;
    const nb_ecloses = parseInt(document.getElementById('eclore-nb').value);
    const nom_lot = document.getElementById('eclore-nom').value.trim();

    if (!nb_ecloses || nb_ecloses <= 0 || !nom_lot) {
        showToast('Veuillez remplir tous les champs', 'warning');
        return;
    }

    const { data, error } = await API.eclore(ECLORE_ID, { nb_ecloses, nom_lot });
    if (error) {
        showToast('Erreur : ' + error, 'danger');
        return;
    }

    closeEcloreModal();
    showToast(`Éclosion enregistrée — ${nb_ecloses} poussins dans ${nom_lot}`, 'success');

    // Reload everything
    const lotsRes = await API.getLots();
    LOTS = lotsRes.data || [];
    populateLotSelect();
    await loadData();
}
