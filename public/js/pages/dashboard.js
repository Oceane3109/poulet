/**
 * AKOHO — Dashboard Page
 */
let chartProd = null;
let chartRepart = null;

document.addEventListener('partialsReady', () => loadDashboard());
document.addEventListener('dateChanged', () => loadDashboard());

async function loadDashboard() {
    const date = getSelectedDate();
    document.getElementById('dash-subtitle').textContent = `Vue d'ensemble au ${formatDate(date)}`;

    const { data, error } = await API.getDashboard(date);
    if (error) { showToast(error, 'danger'); return; }

    // KPIs
    // Filter out lots with negative 'semaine_actuelle' for the selected date
    const allLots = data || [];
    const lots = allLots.filter(l => (l.semaine_actuelle == null ? true : l.semaine_actuelle >= 0));
    document.getElementById('kpi-lots').textContent = lots.length;
    document.getElementById('kpi-stock').textContent = formatNumber(lots.reduce((s, l) => s + (l.stock_oeufs || 0), 0));
    document.getElementById('kpi-poules').textContent = formatNumber(lots.reduce((s, l) => s + (l.nombre_actuel || 0), 0));
    document.getElementById('kpi-ca').textContent = formatAr(lots.reduce((s, l) => s + (l.prix_vente_jour || 0), 0));

    // Table
    const tbody = document.getElementById('dash-table-body');
    if (!lots.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:32px;">Aucun lot trouvé</td></tr>';
    } else {
        tbody.innerHTML = lots.map(l => `
            <tr>
                <td><strong>${l.lot}</strong></td>
                <td><span class="badge-status badge-primary">${l.nom_race}</span></td>
                <td class="text-center">S${l.semaine_actuelle}</td>
                <td class="text-end num">${formatNumber(l.nombre_actuel)}</td>
                <td class="text-end num">${l.atody_oeufs || 0}</td>
                <td class="text-end num">${formatNumber(l.stock_oeufs)}</td>
                <td class="text-end">${l.nb_mort_poulet > 0 ? `<span class="text-danger">${l.nb_mort_poulet}</span>` : '<span class="text-muted">0</span>'}</td>
                <td class="text-end num">${l.prix_vente_jour > 0 ? formatAr(l.prix_vente_jour) : '<span class="text-muted">—</span>'}</td>
            </tr>
        `).join('');
    }

    // Repartition chart
    renderRepartitionChart(lots);

    // Load activity
    loadActivity(date);

    // Load production chart with default period
    loadProductionChart(7);
}

function renderRepartitionChart(lots) {
    const ctx = document.getElementById('chart-repartition');
    if (chartRepart) chartRepart.destroy();

    const colors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];
    chartRepart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: lots.map(l => l.lot),
            datasets: [{
                data: lots.map(l => l.nombre_actuel || 0),
                backgroundColor: colors.slice(0, lots.length),
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 12 } } }
            }
        }
    });
}

async function loadProductionChart(days) {
    const date = getSelectedDate();
    const from = new Date(date);
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().split('T')[0];

    const { data } = await API.getEvents(fromStr, date);
    if (!data) return;

    const prodEvents = data.filter(e => e.type === 'production');

    // Group by date
    const byDate = {};
    prodEvents.forEach(e => {
        const d = e.date.split('T')[0];
        byDate[d] = (byDate[d] || 0) + (e.value || 0);
    });

    // Fill all dates
    const labels = [];
    const values = [];
    const cur = new Date(fromStr);
    const end = new Date(date);
    while (cur <= end) {
        const d = cur.toISOString().split('T')[0];
        labels.push(d.substring(5)); // MM-DD
        values.push(byDate[d] || 0);
        cur.setDate(cur.getDate() + 1);
    }

    const ctx = document.getElementById('chart-production');
    if (chartProd) chartProd.destroy();

    chartProd = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Œufs produits',
                data: values,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59,130,246,0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: days <= 7 ? 4 : 2,
                pointBackgroundColor: '#3B82F6'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

async function loadActivity(date) {
    const from = new Date(date);
    from.setDate(from.getDate() - 30);
    const { data } = await API.getEvents(from.toISOString().split('T')[0], date);
    const feed = document.getElementById('activity-feed');

    if (!data || !data.length) {
        feed.innerHTML = '<div class="empty-state"><i class="bi bi-clock-history"></i><h5>Aucune activité récente</h5></div>';
        return;
    }

    const recent = data.slice(0, 10);
    feed.innerHTML = recent.map(e => `
        <div class="activity-item">
            <div class="activity-dot ${e.type}"></div>
            <div>
                <div class="activity-text">${e.detail}</div>
                <div class="activity-meta">${e.lot} — ${formatDate(e.date)}</div>
            </div>
        </div>
    `).join('');
}

// Chart period buttons
document.addEventListener('click', e => {
    if (e.target.classList.contains('chart-period')) {
        document.querySelectorAll('.chart-period').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        loadProductionChart(parseInt(e.target.dataset.days));
    }
});
