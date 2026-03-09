/**
 * AKOHO — Layout Manager
 * Injecte header, aside, footer et gère le date picker global
 */
(function() {
    // Build sidebar immediately
    buildSidebar();

    // Build header
    const header = document.getElementById('partial-header');
    if (header) {
        const today = new Date().toISOString().split('T')[0];
        header.innerHTML = `
            <div class="header-left">
                <button class="btn-icon d-md-none" id="sidebar-toggle">
                    <i class="bi bi-list"></i>
                </button>
                <div class="header-search">
                    <i class="bi bi-search"></i>
                    <input type="text" placeholder="Rechercher..." id="global-search">
                </div>
            </div>
            <div class="header-right">
                <div class="header-date">
                    <i class="bi bi-calendar3"></i>
                    <input type="date" id="global-date" value="${today}">
                </div>
            </div>
        `;
    }

    // Build footer
    const footer = document.getElementById('partial-footer');
    if (footer) {
        footer.innerHTML = `AKOHO — Gestion d'élevage de poules pondeuses © ${new Date().getFullYear()}`;
    }

    // Toast container
    if (!document.getElementById('toast-container')) {
        const tc = document.createElement('div');
        tc.id = 'toast-container';
        tc.className = 'toast-container';
        document.body.appendChild(tc);
    }

    // Date picker event
    const datePicker = document.getElementById('global-date');
    if (datePicker) {
        datePicker.addEventListener('change', () => {
            document.dispatchEvent(new CustomEvent('dateChanged', { detail: datePicker.value }));
        });
    }

    // Sidebar toggle (mobile)
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('show'));
    }

    // Emit partialsReady after all sync scripts have loaded
    window._partialsReady = true;
    setTimeout(() => document.dispatchEvent(new Event('partialsReady')), 0);
})();

/** Get the currently selected date */
function getSelectedDate() {
    const el = document.getElementById('global-date');
    return el ? el.value : new Date().toISOString().split('T')[0];
}

/** Show a toast notification */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'bi-check-circle', danger: 'bi-exclamation-circle', warning: 'bi-exclamation-triangle', info: 'bi-info-circle' };
    toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 4000);
}

/** Format number with spaces as thousands separator */
function formatNumber(n) {
    if (n == null) return '0';
    return Math.round(n).toLocaleString('fr-FR');
}

/** Format Ariary currency */
function formatAr(n) {
    return formatNumber(n) + ' Ar';
}

/** Format date to readable French */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
