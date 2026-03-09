/**
 * AKOHO — Sidebar Navigation
 * Génère dynamiquement la navigation dans #partial-aside
 */
const NAV_ITEMS = [
    { type: 'link', label: 'Tableau de bord', icon: 'bi-grid-1x2', url: '/pages/dashboard.html' },
    { type: 'section', label: 'Élevage' },
    { type: 'link', label: 'Lots', icon: 'bi-collection', url: '/pages/lots.html' },
    { type: 'link', label: 'Fiches de croissance', icon: 'bi-journal-text', url: '/pages/fiches.html' },
    { type: 'link', label: 'Pertes / Mortalité', icon: 'bi-heartbreak', url: '/pages/pertes.html', badge: 'badge-pertes' },
    { type: 'section', label: 'Œufs' },
    { type: 'link', label: 'Production', icon: 'bi-egg', url: '/pages/oeufs.html' },
    { type: 'link', label: 'Couvaison', icon: 'bi-thermometer-half', url: '/pages/couvaison.html', badge: 'badge-couvaison' },
    { type: 'section', label: 'Finance' },
    { type: 'link', label: 'Ventes', icon: 'bi-cart3', url: '/pages/ventes.html' },
    { type: 'link', label: 'Rentabilité', icon: 'bi-graph-up-arrow', url: '/pages/rentabilite.html' },
    { type: 'section', label: 'Référentiels' },
    { type: 'link', label: 'Races', icon: 'bi-bookmarks', url: '/pages/races.html' },
    { type: 'link', label: 'Nourriture', icon: 'bi-basket2', url: '/pages/nourriture.html' },
    { type: 'section', label: 'Outils' },
    { type: 'link', label: 'Calendrier', icon: 'bi-calendar3', url: '/pages/calendrier.html' },
];

function buildSidebar() {
    const aside = document.getElementById('partial-aside');
    if (!aside) return;

    const currentPath = window.location.pathname;

    // Brand
    let html = `
        <div class="sidebar-brand">
            <div class="sidebar-brand-icon">🐔</div>
            <span class="sidebar-brand-text">AKOHO</span>
        </div>
        <nav class="sidebar-nav">
    `;

    for (const item of NAV_ITEMS) {
        if (item.type === 'section') {
            html += `<div class="sidebar-section"><div class="sidebar-section-label">${item.label}</div>`;
        } else {
            const active = currentPath === item.url ? ' active' : '';
            const badge = item.badge ? `<span class="sidebar-badge" id="${item.badge}"></span>` : '';
            html += `
                <a href="${item.url}" class="sidebar-link${active}">
                    <i class="bi ${item.icon}"></i>
                    <span>${item.label}</span>
                    ${badge}
                </a>
            `;
        }
    }

    // Close any open sections
    html += '</div></nav>';
    aside.innerHTML = html;
}

const SidebarBadge = {
    set(id, count) {
        const el = document.getElementById(id);
        if (el) el.textContent = count > 0 ? count : '';
    }
};
