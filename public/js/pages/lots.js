/**
 * AKOHO — Lots Page
 */
let ALL_LOTS = [];
let ALL_RACES = [];
let ALL_NOURRITURE = [];
let ALL_FICHES = [];
let FICHE_SEMAINES = [];
let CURRENT_STEP = 1;

document.addEventListener('partialsReady', async () => {
    await Promise.all([loadLots(), loadRaces(), loadNourriture(), loadFiches()]);
    populateFilters();
});

async function loadLots() {
    const { data } = await API.getLots();
    ALL_LOTS = data || [];
    renderLots(ALL_LOTS);
}

async function loadRaces() {
    const { data } = await API.getRaces();
    ALL_RACES = data || [];
}

async function loadNourriture() {
    const { data } = await API.getNourriture();
    ALL_NOURRITURE = data || [];
}

async function loadFiches() {
    const { data } = await API.getFiches();
    ALL_FICHES = data || [];
}

function populateFilters() {
    const raceSelect = document.getElementById('filter-race');
    raceSelect.innerHTML = '<option value="">Toutes les races</option>' +
        ALL_RACES.map(r => `<option value="${r.id_race}">${r.nom_race}</option>`).join('');
}

function renderLots(lots) {
    const tbody = document.getElementById('lots-table-body');
    if (!lots.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:32px;"><i class="bi bi-inbox" style="font-size:32px;display:block;margin-bottom:8px;"></i>Aucun lot</td></tr>';
        return;
    }
    tbody.innerHTML = lots.map(l => `
        <tr>
            <td><strong>${l.nom_lot}</strong></td>
            <td><span class="badge-status badge-primary">${l.nom_race}</span></td>
            <td class="text-center num">${l.nombre}</td>
            <td class="text-center">S${l.age_arrivee}</td>
            <td>${formatDate(l.date_arrivee)}</td>
            <td><span class="badge-status ${l.origine === 'achat' ? 'badge-info' : 'badge-warning'}">${l.origine === 'achat' ? '🛒 Achat' : '🥚 Couvaison'}</span></td>
            <td>${l.fiche_label || '<span class="text-muted">—</span>'}</td>
            <td class="text-end num">${l.prix_achat > 0 ? formatAr(l.prix_achat) : '<span class="text-muted">0</span>'}</td>
        </tr>
    `).join('');
}

function filterLots() {
    const search = document.getElementById('filter-search').value.toLowerCase();
    const race = document.getElementById('filter-race').value;
    const origine = document.getElementById('filter-origine').value;
    let filtered = ALL_LOTS;
    if (search) filtered = filtered.filter(l => l.nom_lot.toLowerCase().includes(search) || l.nom_race.toLowerCase().includes(search));
    if (race) filtered = filtered.filter(l => l.id_race == race);
    if (origine) filtered = filtered.filter(l => l.origine === origine);
    renderLots(filtered);
}

// === Modal Stepper ===
function openCreateModal() {
    document.getElementById('modal-create').style.display = 'block';
    CURRENT_STEP = 1;
    FICHE_SEMAINES = [];
    showStep(1);
    // Populate race select
    document.getElementById('lot-race').innerHTML = ALL_RACES.map(r => `<option value="${r.id_race}">${r.nom_race}</option>`).join('');
    // Populate lot mere
    document.getElementById('lot-mere').innerHTML = ALL_LOTS.map(l => `<option value="${l.id_lot}">${l.nom_lot}</option>`).join('');
    // Populate nourriture
    document.getElementById('fiche-nourr').innerHTML = ALL_NOURRITURE.map(n => `<option value="${n.id_nourriture}">${n.nom_nourriture}</option>`).join('');
    // Populate fiches
    document.getElementById('fiche-select').innerHTML = '<option value="">Choisir une fiche existante...</option>' +
        ALL_FICHES.map(f => `<option value="${f.id_fiche}">${f.label || f.nom_race + ' — ' + f.type} (${f.nb_semaines}S)</option>`).join('');
    // Date and fiche
    document.getElementById('lot-date').value = getSelectedDate();
    updateFicheForm();
}

function closeModal() {
    document.getElementById('modal-create').style.display = 'none';
}

function showStep(step) {
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`panel-${i}`).style.display = i === step ? 'block' : 'none';
        const s = document.getElementById(`step-${i}`);
        s.className = 'stepper-step' + (i === step ? ' active' : i < step ? ' completed' : '');
    }
    document.querySelectorAll('.stepper-line').forEach((l, i) => {
        l.className = 'stepper-line' + (i + 1 < step ? ' completed' : '');
    });
    document.getElementById('btn-prev').style.display = step > 1 ? 'inline-flex' : 'none';
    document.getElementById('btn-next').textContent = step === 3 ? 'Créer le lot' : 'Suivant';
    document.getElementById('modal-error').textContent = '';
}

function prevStep() {
    if (CURRENT_STEP > 1) { CURRENT_STEP--; showStep(CURRENT_STEP); }
}

async function nextStep() {
    const errEl = document.getElementById('modal-error');
    errEl.textContent = '';

    if (CURRENT_STEP === 1) {
        // Validate
        const nom = document.getElementById('lot-nom').value.trim();
        const nombre = parseInt(document.getElementById('lot-nombre').value);
        const age = parseInt(document.getElementById('lot-age').value);
        const date = document.getElementById('lot-date').value;
        if (!nom) { errEl.textContent = 'Le nom du lot est requis'; return; }
        if (!nombre || nombre < 1) { errEl.textContent = 'Le nombre de poules doit être > 0'; return; }
        if (!age || age < 1) { errEl.textContent = "L'âge d'arrivée doit être ≥ 1"; return; }
        if (!date) { errEl.textContent = "La date d'arrivée est requise"; return; }
        CURRENT_STEP = 2;
        showStep(2);
    } else if (CURRENT_STEP === 2) {
        buildRecap();
        CURRENT_STEP = 3;
        showStep(3);
    } else if (CURRENT_STEP === 3) {
        await createLot();
    }
}

function toggleOrigine() {
    const origine = document.getElementById('lot-origine').value;
    document.getElementById('lot-mere-group').style.display = origine === 'couvaison' ? 'block' : 'none';
    if (origine === 'couvaison') document.getElementById('lot-prix').value = 0;
}

// === Fiche management ===
function switchFicheSrc(src) {
    document.querySelectorAll('.fiche-src').forEach(b => b.classList.toggle('active', b.dataset.src === src));
    document.getElementById('fiche-manual').style.display = src === 'manual' ? 'block' : 'none';
    document.getElementById('fiche-existing').style.display = src === 'existing' ? 'block' : 'none';
    document.getElementById('fiche-default').style.display = src === 'default' ? 'block' : 'none';
    if (src === 'default') loadDefaultFiche();
}

function updateFicheForm() {
    const age = parseInt(document.getElementById('lot-age').value) || 1;
    const nextSem = FICHE_SEMAINES.length + 1;
    document.getElementById('fiche-sem').value = `S${nextSem}`;
    document.getElementById('fiche-age').value = age + nextSem - 1;
    renderFicheTable();
}

function addFicheRow() {
    const age = parseInt(document.getElementById('lot-age').value) || 1;
    const sem = FICHE_SEMAINES.length + 1;
    const id_nourriture = parseInt(document.getElementById('fiche-nourr').value);
    const poids = parseFloat(document.getElementById('fiche-poids').value);
    const variation = parseFloat(document.getElementById('fiche-var').value) || 0;
    if (!poids || poids <= 0) { showToast('La quantité est requise', 'warning'); return; }
    const nourr = ALL_NOURRITURE.find(n => n.id_nourriture === id_nourriture);
    FICHE_SEMAINES.push({ semaine: sem, age: age + sem - 1, id_nourriture, nom_nourriture: nourr?.nom_nourriture, poids, variation });
    document.getElementById('fiche-poids').value = '';
    document.getElementById('fiche-var').value = '';
    updateFicheForm();
    document.getElementById('fiche-poids').focus();
}

function removeFicheRow() {
    FICHE_SEMAINES.pop();
    updateFicheForm();
}

function renderFicheTable() {
    const tbody = document.getElementById('fiche-rows');
    if (!FICHE_SEMAINES.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:16px;">Aucune semaine ajoutée</td></tr>';
        return;
    }
    tbody.innerHTML = FICHE_SEMAINES.map((s, i) => `
        <tr>
            <td>S${s.semaine}</td>
            <td>${s.age}</td>
            <td>${s.nom_nourriture || '—'}</td>
            <td>${s.poids} g</td>
            <td>${s.variation} g</td>
            <td>${i === FICHE_SEMAINES.length - 1 ? `<button class="btn btn-sm btn-danger" onclick="removeFicheRow()"><i class="bi bi-trash"></i></button>` : '<i class="bi bi-lock text-muted"></i>'}</td>
        </tr>
    `).join('');
}

async function loadExistingFiche() {
    const id = document.getElementById('fiche-select').value;
    if (!id) { document.getElementById('fiche-preview').innerHTML = ''; return; }
    const { data } = await API.getFiche(id);
    if (!data || !data.rows) return;
    FICHE_SEMAINES = data.rows.map(r => ({
        semaine: r.semaine, age: r.age, id_nourriture: r.id_nourriture,
        nom_nourriture: r.nom_nourriture, poids: r.poids, variation: r.variation
    }));
    document.getElementById('fiche-preview').innerHTML = `<p class="text-success"><i class="bi bi-check-circle"></i> ${data.rows.length} semaines chargées</p>`;
}

async function loadDefaultFiche() {
    const raceId = parseInt(document.getElementById('lot-race').value);
    const fiche = ALL_FICHES.find(f => f.id_race === raceId && f.type === 'defaut');
    if (!fiche) {
        document.getElementById('fiche-default-preview').innerHTML = '<p class="text-warning">Aucune fiche par défaut pour cette race</p>';
        return;
    }
    const { data } = await API.getFiche(fiche.id_fiche);
    if (data && data.rows) {
        FICHE_SEMAINES = data.rows.map(r => ({
            semaine: r.semaine, age: r.age, id_nourriture: r.id_nourriture,
            nom_nourriture: r.nom_nourriture, poids: r.poids, variation: r.variation
        }));
        document.getElementById('fiche-default-preview').innerHTML = `<p class="text-success"><i class="bi bi-check-circle"></i> Fiche "${fiche.label}" — ${data.rows.length} semaines</p>`;
    }
}

function buildRecap() {
    const info = document.getElementById('recap-info');
    info.innerHTML = `
        <table style="font-size:13px;width:100%;">
            <tr><td class="text-muted" style="padding:4px 8px;">Nom</td><td style="padding:4px 8px;font-weight:600;">${document.getElementById('lot-nom').value}</td></tr>
            <tr><td class="text-muted" style="padding:4px 8px;">Race</td><td style="padding:4px 8px;">${document.getElementById('lot-race').selectedOptions[0]?.text}</td></tr>
            <tr><td class="text-muted" style="padding:4px 8px;">Nombre</td><td style="padding:4px 8px;">${document.getElementById('lot-nombre').value}</td></tr>
            <tr><td class="text-muted" style="padding:4px 8px;">Âge arrivée</td><td style="padding:4px 8px;">S${document.getElementById('lot-age').value}</td></tr>
            <tr><td class="text-muted" style="padding:4px 8px;">Date</td><td style="padding:4px 8px;">${formatDate(document.getElementById('lot-date').value)}</td></tr>
            <tr><td class="text-muted" style="padding:4px 8px;">Origine</td><td style="padding:4px 8px;">${document.getElementById('lot-origine').value}</td></tr>
            <tr><td class="text-muted" style="padding:4px 8px;">Prix achat</td><td style="padding:4px 8px;">${formatAr(document.getElementById('lot-prix').value)}</td></tr>
        </table>
    `;
    const recap = document.getElementById('recap-fiche');
    if (!FICHE_SEMAINES.length) {
        recap.innerHTML = '<p class="text-muted">Aucune fiche de croissance</p>';
    } else {
        recap.innerHTML = `<p class="mb-8">${FICHE_SEMAINES.length} semaines</p>` +
            '<div style="max-height:200px;overflow-y:auto;"><table class="table"><thead><tr><th>S</th><th>Âge</th><th>Nourriture</th><th>Qté</th></tr></thead><tbody>' +
            FICHE_SEMAINES.map(s => `<tr><td>S${s.semaine}</td><td>${s.age}</td><td>${s.nom_nourriture}</td><td>${s.poids}g</td></tr>`).join('') +
            '</tbody></table></div>';
    }
}

async function createLot() {
    const body = {
        nom_lot: document.getElementById('lot-nom').value.trim(),
        id_race: parseInt(document.getElementById('lot-race').value),
        nombre: parseInt(document.getElementById('lot-nombre').value),
        age_arrivee: parseInt(document.getElementById('lot-age').value),
        date_arrivee: document.getElementById('lot-date').value,
        prix_achat: parseFloat(document.getElementById('lot-prix').value) || 0,
        origine: document.getElementById('lot-origine').value,
        id_lot_mere: document.getElementById('lot-origine').value === 'couvaison' ? parseInt(document.getElementById('lot-mere').value) : null,
    };
    if (FICHE_SEMAINES.length) body.semaines = FICHE_SEMAINES;

    const { data, error } = await API.createLot(body);
    if (error) { document.getElementById('modal-error').textContent = error; return; }
    showToast(`Lot "${body.nom_lot}" créé avec succès`, 'success');
    closeModal();
    loadLots();
}

// Enter key for fiche form
document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.activeElement.id?.startsWith('fiche-')) {
        e.preventDefault();
        addFicheRow();
    }
});
