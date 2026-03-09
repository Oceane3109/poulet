/**
 * AKOHO — Rentabilité Page
 */
let RENTA_DATA = [];

document.addEventListener('partialsReady', () => loadRentabilite());
document.addEventListener('dateChanged', () => loadRentabilite());

async function loadRentabilite() {
    const date = getSelectedDate();
    document.getElementById('renta-subtitle').textContent = `Analyse financière au ${formatDate(date)}`;

    const { data, error } = await API.getRentabilite(date);
    if (error) {
        showToast('Erreur : ' + error, 'danger');
        return;
    }

    RENTA_DATA = data || [];
    populateRaceFilter();
    updateKPIs();
    renderTable();
}

function populateRaceFilter() {
    const races = [...new Set(RENTA_DATA.map(r => r.nom_race).filter(Boolean))];
    const sel = document.getElementById('filter-race');
    const current = sel.value;
    sel.innerHTML = '<option value="">Toutes les races</option>' + races.map(r => `<option value="${r}">${r}</option>`).join('');
    sel.value = current;
}

function getFilteredRenta() {
    const raceFilter = document.getElementById('filter-race').value;
    const margeFilter = document.getElementById('filter-marge').value;
    let list = RENTA_DATA;
    if (raceFilter) list = list.filter(r => r.nom_race === raceFilter);
    if (margeFilter) {
        list = list.filter(r => {
            const rev = (r.revenus_oeufs || 0) + (r.revenus_poulets || 0);
            const cout = (r.cout_acquisition || 0) + (r.cout_nourriture_estime || 0);
            const benef = rev - cout;
            return margeFilter === 'positif' ? benef >= 0 : benef < 0;
        });
    }
    return list;
}

function clearRentaFilters() {
    document.getElementById('filter-race').value = '';
    document.getElementById('filter-marge').value = '';
    renderTable();
}

function updateKPIs() {
    // Calculate net profit for each lot
    const lotProfits = RENTA_DATA.map(r => {
        const revenus = (r.revenus_oeufs || 0) + (r.revenus_poulets || 0);
        const couts = (r.cout_acquisition || 0) + (r.cout_nourriture_estime || 0);
        return { ...r, benefice: revenus - couts };
    });

    // Global profit
    const totalBenefice = lotProfits.reduce((s, r) => s + r.benefice, 0);
    document.getElementById('kpi-benefice').textContent = formatAr(totalBenefice);

    // Best lot
    if (lotProfits.length) {
        const best = lotProfits.reduce((a, b) => a.benefice > b.benefice ? a : b);
        document.getElementById('kpi-meilleur').textContent = best.benefice > 0
            ? `${best.nom_lot} (${formatAr(best.benefice)})`
            : '—';

        // Worst lot (deficit)
        const worst = lotProfits.reduce((a, b) => a.benefice < b.benefice ? a : b);
        document.getElementById('kpi-deficitaire').textContent = worst.benefice < 0
            ? `${worst.nom_lot} (${formatAr(worst.benefice)})`
            : 'Aucun';
    } else {
        document.getElementById('kpi-meilleur').textContent = '—';
        document.getElementById('kpi-deficitaire').textContent = '—';
    }
}

function renderTable() {
    const tbody = document.getElementById('renta-tbody');
    const filtered = getFilteredRenta();

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:32px;"><i class="bi bi-graph-up-arrow" style="font-size:32px;display:block;margin-bottom:8px;"></i>Aucune donnée de rentabilité</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(r => {
        const revOeufs = r.revenus_oeufs || 0;
        const revPoulets = r.revenus_poulets || 0;
        const coutAcq = r.cout_acquisition || 0;
        const coutNourr = r.cout_nourriture_estime || 0;
        const totalRev = revOeufs + revPoulets;
        const totalCout = coutAcq + coutNourr;
        const benefice = totalRev - totalCout;
        const marge = totalRev > 0 ? Math.round((benefice / totalRev) * 100) : (benefice >= 0 ? 0 : -100);

        const beneficeClass = benefice >= 0 ? 'color:var(--success);' : 'color:var(--danger);';
        const margeClass = marge >= 0 ? 'badge-success' : 'badge-danger';

        return `<tr>
            <td><strong>${r.nom_lot}</strong></td>
            <td>${r.nom_race || '—'}</td>
            <td class="text-end">${formatAr(coutAcq)}</td>
            <td class="text-end">${formatAr(coutNourr)}</td>
            <td class="text-end">${formatAr(revOeufs)}</td>
            <td class="text-end">${formatAr(revPoulets)}</td>
            <td class="text-end"><strong style="${beneficeClass}">${formatAr(benefice)}</strong></td>
            <td class="text-end"><span class="badge ${margeClass}">${marge}%</span></td>
        </tr>`;
    }).join('');

    // Footer row with totals
    const totals = filtered.reduce((acc, r) => ({
        acq: acc.acq + (r.cout_acquisition || 0),
        nourr: acc.nourr + (r.cout_nourriture_estime || 0),
        rOeufs: acc.rOeufs + (r.revenus_oeufs || 0),
        rPoulets: acc.rPoulets + (r.revenus_poulets || 0)
    }), { acq: 0, nourr: 0, rOeufs: 0, rPoulets: 0 });

    const totalBenef = (totals.rOeufs + totals.rPoulets) - (totals.acq + totals.nourr);
    const totalMarge = (totals.rOeufs + totals.rPoulets) > 0
        ? Math.round((totalBenef / (totals.rOeufs + totals.rPoulets)) * 100)
        : 0;

    tbody.innerHTML += `<tr style="font-weight:700;background:var(--bg);">
        <td colspan="2">TOTAL</td>
        <td class="text-end">${formatAr(totals.acq)}</td>
        <td class="text-end">${formatAr(totals.nourr)}</td>
        <td class="text-end">${formatAr(totals.rOeufs)}</td>
        <td class="text-end">${formatAr(totals.rPoulets)}</td>
        <td class="text-end" style="${totalBenef >= 0 ? 'color:var(--success)' : 'color:var(--danger)'}">${formatAr(totalBenef)}</td>
        <td class="text-end"><span class="badge ${totalMarge >= 0 ? 'badge-success' : 'badge-danger'}">${totalMarge}%</span></td>
    </tr>`;
}
