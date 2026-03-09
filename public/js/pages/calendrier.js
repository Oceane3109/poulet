/**
 * AKOHO — Calendrier Page (v2)
 * Date range, event type toggles, wider layout
 */
let CURRENT_YEAR, CURRENT_MONTH;
let ALL_EVENTS = [];
let RANGE_FROM = null, RANGE_TO = null;
let LAST_DAY = null; // track last selected day for re-render on toggle

const EVENT_COLORS = {
    production: '#22C55E',
    perte: '#EF4444',
    vente_oeuf: '#3B82F6',
    vente_poulet: '#3B82F6',
    vente_lot: '#3B82F6',
    couvaison: '#F59E0B',
    eclosion: '#8B5CF6'
};

const EVENT_LABELS = {
    production: 'Production',
    perte: 'Perte',
    vente_oeuf: 'Vente œufs',
    vente_poulet: 'Vente poulets',
    vente_lot: 'Cession lot',
    couvaison: 'Couvaison',
    eclosion: 'Éclosion'
};

const EVENT_ICONS = {
    production: 'bi-egg', perte: 'bi-heartbreak', vente_oeuf: 'bi-cart',
    vente_poulet: 'bi-cart-check', vente_lot: 'bi-box-arrow-right',
    couvaison: 'bi-clock-history', eclosion: 'bi-sun'
};

const TYPE_GROUP = {
    production: 'production', perte: 'perte',
    vente_oeuf: 'vente', vente_poulet: 'vente', vente_lot: 'vente',
    couvaison: 'couvaison', eclosion: 'eclosion'
};

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

document.addEventListener('partialsReady', () => {
    const today = new Date(getSelectedDate());
    CURRENT_YEAR = today.getFullYear();
    CURRENT_MONTH = today.getMonth();
    loadMonth();
});

/* ---------- helpers ---------- */
function isoLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getEnabledTypes() {
    const s = new Set();
    document.querySelectorAll('.evt-toggle input[data-type]').forEach(cb => { if (cb.checked) s.add(cb.dataset.type); });
    return s;
}

function filterEvents(events) {
    const enabled = getEnabledTypes();
    return events.filter(e => enabled.has(TYPE_GROUP[e.type] || e.type));
}

function getVisibleRange() {
    const first = new Date(CURRENT_YEAR, CURRENT_MONTH, 1);
    const last = new Date(CURRENT_YEAR, CURRENT_MONTH + 1, 0);
    const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
    const rangeStart = new Date(first);
    rangeStart.setDate(rangeStart.getDate() - startDay);
    const rangeEnd = new Date(last);
    const endDay = last.getDay() === 0 ? 0 : 7 - last.getDay();
    rangeEnd.setDate(rangeEnd.getDate() + endDay);
    return { rangeStart, rangeEnd };
}

/* ---------- month loading ---------- */
async function loadMonth() {
    updateLabel();
    const { rangeStart, rangeEnd } = getVisibleRange();
    const { data } = await API.getEvents(isoLocal(rangeStart), isoLocal(rangeEnd));
    ALL_EVENTS = data || [];
    renderCalendar(rangeStart, rangeEnd);
}

function updateLabel() {
    document.getElementById('cal-month-label').textContent = `${MONTHS_FR[CURRENT_MONTH]} ${CURRENT_YEAR}`;
}

function prevMonth() { CURRENT_MONTH--; if (CURRENT_MONTH < 0) { CURRENT_MONTH = 11; CURRENT_YEAR--; } loadMonth(); }
function nextMonth() { CURRENT_MONTH++; if (CURRENT_MONTH > 11) { CURRENT_MONTH = 0; CURRENT_YEAR++; } loadMonth(); }

function goToday() {
    const t = new Date();
    CURRENT_YEAR = t.getFullYear();
    CURRENT_MONTH = t.getMonth();
    RANGE_FROM = RANGE_TO = null;
    document.getElementById('cal-range-from').value = '';
    document.getElementById('cal-range-to').value = '';
    loadMonth();
}

/* ---------- toggles ---------- */
function onToggleFilter() {
    const { rangeStart, rangeEnd } = getVisibleRange();
    renderCalendar(rangeStart, rangeEnd);
    // re-render open detail panel
    const panel = document.getElementById('day-detail');
    if (panel.style.display !== 'none') {
        if (RANGE_FROM && RANGE_TO) showRange();
        else if (LAST_DAY) showDay(LAST_DAY);
    }
}

/* ---------- date range ---------- */
function loadRange() {
    const from = document.getElementById('cal-range-from').value;
    const to = document.getElementById('cal-range-to').value;
    if (!from || !to || from > to) { showToast('Sélectionnez une plage de dates valide', 'warning'); return; }
    RANGE_FROM = from;
    RANGE_TO = to;
    const d = new Date(from + 'T00:00:00');
    CURRENT_YEAR = d.getFullYear();
    CURRENT_MONTH = d.getMonth();
    loadMonth().then(() => showRange());
}

function clearRange() {
    RANGE_FROM = RANGE_TO = null;
    document.getElementById('cal-range-from').value = '';
    document.getElementById('cal-range-to').value = '';
    document.getElementById('day-detail').style.display = 'none';
    LAST_DAY = null;
    loadMonth();
}

async function showRange() {
    if (!RANGE_FROM || !RANGE_TO) return;
    const { data } = await API.getEvents(RANGE_FROM, RANGE_TO);
    const evts = filterEvents(data || []);
    const panel = document.getElementById('day-detail');
    const df = new Date(RANGE_FROM + 'T00:00:00');
    const dt = new Date(RANGE_TO + 'T00:00:00');
    document.getElementById('detail-title').textContent =
        `Événements du ${df.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} (${evts.length})`;

    if (!evts.length) {
        document.getElementById('detail-content').innerHTML = '<p class="text-muted" style="padding:16px 0;">Aucun événement sur cette période.</p>';
    } else {
        const grouped = {};
        evts.forEach(e => { const d = (e.date || '').substring(0, 10); (grouped[d] = grouped[d] || []).push(e); });
        let html = '';
        for (const dateStr of Object.keys(grouped).sort()) {
            const dayD = new Date(dateStr + 'T00:00:00');
            html += `<div style="font-size:13px;font-weight:700;color:var(--text);margin-top:16px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid var(--border);">
                ${dayD.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>`;
            html += grouped[dateStr].map(e => renderEventRow(e)).join('');
        }
        document.getElementById('detail-content').innerHTML = html;
    }
    panel.style.display = '';
}

/* ---------- calendar render ---------- */
function renderCalendar(rangeStart, rangeEnd) {
    const grid = document.getElementById('cal-grid');
    const today = isoLocal(new Date());
    const filtered = filterEvents(ALL_EVENTS);

    const evtMap = {};
    for (const evt of filtered) { const d = evt.date ? evt.date.substring(0, 10) : null; if (d) { (evtMap[d] = evtMap[d] || []).push(evt); } }

    let html = '';
    const cursor = new Date(rangeStart);
    while (cursor <= rangeEnd) {
        const dateStr = isoLocal(cursor);
        const isCurrentMonth = cursor.getMonth() === CURRENT_MONTH;
        const isToday = dateStr === today;
        const dayEvts = evtMap[dateStr] || [];

        let rangeClass = '';
        if (RANGE_FROM && RANGE_TO) {
            if (dateStr === RANGE_FROM) rangeClass = ' range-start';
            else if (dateStr === RANGE_TO) rangeClass = ' range-end';
            else if (dateStr > RANGE_FROM && dateStr < RANGE_TO) rangeClass = ' in-range';
        }

        const types = [...new Set(dayEvts.map(e => e.type))];
        const dots = types.map(t => `<span class="cal-dot" style="background:${EVENT_COLORS[t] || '#94A3B8'};" title="${EVENT_LABELS[t] || t}"></span>`).join('');

        let summary = '';
        if (dayEvts.length) {
            const lots = [...new Set(dayEvts.map(e => e.lot).filter(Boolean))];
            summary = `<div class="cal-summary">${lots.length ? lots.join(', ') + ' — ' : ''}${dayEvts.length} évt.</div>`;
        }

        html += `<div class="cal-cell${isCurrentMonth ? '' : ' other-month'}${isToday ? ' today' : ''}${rangeClass}" onclick="showDay('${dateStr}')">
            <div class="cal-day">${cursor.getDate()}</div>
            <div class="cal-dots">${dots}</div>
            ${summary}
        </div>`;
        cursor.setDate(cursor.getDate() + 1);
    }
    grid.innerHTML = html;
}

/* ---------- day detail ---------- */
function showDay(dateStr) {
    LAST_DAY = dateStr;
    const evts = filterEvents(ALL_EVENTS.filter(e => e.date && e.date.substring(0, 10) === dateStr));
    const panel = document.getElementById('day-detail');
    const d = new Date(dateStr + 'T00:00:00');
    document.getElementById('detail-title').textContent =
        `Événements du ${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${evts.length})`;

    if (!evts.length) {
        document.getElementById('detail-content').innerHTML = '<p class="text-muted" style="padding:16px 0;">Aucun événement ce jour.</p>';
    } else {
        document.getElementById('detail-content').innerHTML = evts.map(e => renderEventRow(e)).join('');
    }
    panel.style.display = '';
}

function renderEventRow(e) {
    const color = EVENT_COLORS[e.type] || '#94A3B8';
    const label = EVENT_LABELS[e.type] || e.type;
    const icon = EVENT_ICONS[e.type] || 'bi-circle';
    return `<div onclick="onEventClick('${e.type}','${(e.date || '').substring(0, 10)}')" style="cursor:pointer;display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid var(--border);">
        <div style="min-width:36px;height:36px;border-radius:10px;background:${color}15;display:flex;align-items:center;justify-content:center;">
            <i class="bi ${icon}" style="color:${color};font-size:16px;"></i>
        </div>
        <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span class="badge" style="background:${color}20;color:${color};font-size:12px;font-weight:600;">${label}</span>
                ${e.lot ? `<span style="font-size:13px;font-weight:600;color:var(--text);">${e.lot}</span>` : ''}
            </div>
            <div style="font-size:14px;color:var(--text-secondary);line-height:1.5;">${e.detail || ''}</div>
        </div>
        ${e.value ? `<div style="font-size:15px;font-weight:700;color:var(--text);white-space:nowrap;">${formatNumber(e.value)}</div>` : ''}
    </div>`;
}

/* ---------- navigation ---------- */
async function gotoDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    CURRENT_YEAR = d.getFullYear();
    CURRENT_MONTH = d.getMonth();
    await loadMonth();
    setTimeout(() => showDay(dateStr), 50);
}

function onEventClick(type, dateStr) {
    if (!dateStr) return;
    const d = new Date(dateStr + 'T00:00:00');
    if (type === 'couvaison') d.setDate(d.getDate() + 45);
    else if (type === 'eclosion') d.setDate(d.getDate() - 45);
    gotoDate(isoLocal(d));
}
