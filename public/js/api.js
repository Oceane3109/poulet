/**
 * AKOHO — API Client
 * Toutes les communications réseau passent par cet objet.
 * Chaque méthode retourne { data, error }
 */
const API = {
    _base: '/api',

    async _fetch(url, options = {}) {
        try {
            const res = await fetch(this._base + url, {
                headers: { 'Content-Type': 'application/json', ...options.headers },
                ...options
            });
            const json = await res.json();
            if (!res.ok && !json.error) json.error = `Erreur HTTP ${res.status}`;
            return json;
        } catch (e) {
            return { data: null, error: 'Erreur réseau : ' + e.message };
        }
    },

    // --- Utilitaires ---
    getStatus() { return this._fetch('/status'); },
    getSchema() { return this._fetch('/schema'); },
    getEvents(from, to) { return this._fetch(`/events?from=${from}&to=${to}`); },

    // --- Dashboard & Rentabilité ---
    getDashboard(date) { return this._fetch(`/dashboard?date=${date}`); },
    getRentabilite(date) { return this._fetch(`/rentabilite?date=${date}`); },

    // --- Races ---
    getRaces() { return this._fetch('/races'); },
    createRace(body) { return this._fetch('/races', { method: 'POST', body: JSON.stringify(body) }); },
    updateRace(id, body) { return this._fetch(`/races/${id}`, { method: 'PUT', body: JSON.stringify(body) }); },
    deleteRace(id) { return this._fetch(`/races/${id}`, { method: 'DELETE' }); },

    // --- Nourriture ---
    getNourriture() { return this._fetch('/nourriture'); },
    createNourriture(body) { return this._fetch('/nourriture', { method: 'POST', body: JSON.stringify(body) }); },
    updateNourriture(id, body) { return this._fetch(`/nourriture/${id}`, { method: 'PUT', body: JSON.stringify(body) }); },
    deleteNourriture(id) { return this._fetch(`/nourriture/${id}`, { method: 'DELETE' }); },

    // --- Fiches ---
    getFiches() { return this._fetch('/fiches'); },
    getFiche(id) { return this._fetch(`/fiches/${id}`); },
    createFiche(body) { return this._fetch('/fiches', { method: 'POST', body: JSON.stringify(body) }); },
    updateFiche(id, body) { return this._fetch(`/fiches/${id}`, { method: 'PUT', body: JSON.stringify(body) }); },
    deleteFiche(id) { return this._fetch(`/fiches/${id}`, { method: 'DELETE' }); },

    // --- Lots ---
    getLots() { return this._fetch('/lots'); },
    createLot(body) { return this._fetch('/lots', { method: 'POST', body: JSON.stringify(body) }); },
    updateLot(id, body) { return this._fetch(`/lots/${id}`, { method: 'PUT', body: JSON.stringify(body) }); },
    getStockOeufs(id, date) { return this._fetch(`/lots/${id}/stock_oeufs?date=${date}`); },
    getPoidsLot(id, date) { return this._fetch(`/lots/${id}/poids?date=${date}`); },

    // --- Production oeufs ---
    getOeufs(date, lot) {
        let url = '/oeufs?';
        if (date) url += `date=${date}&`;
        if (lot) url += `lot=${lot}`;
        return this._fetch(url);
    },
    createOeuf(body) { return this._fetch('/oeufs', { method: 'POST', body: JSON.stringify(body) }); },
    deleteOeuf(id) { return this._fetch(`/oeufs/${id}`, { method: 'DELETE' }); },

    // --- Ventes ---
    getVentesOeufs() { return this._fetch('/ventes/oeufs'); },
    createVenteOeuf(body) { return this._fetch('/ventes/oeufs', { method: 'POST', body: JSON.stringify(body) }); },
    getVentesPoulets() { return this._fetch('/ventes/poulets'); },
    createVentePoulet(body) { return this._fetch('/ventes/poulets', { method: 'POST', body: JSON.stringify(body) }); },
    getVentesLots() { return this._fetch('/ventes/lots'); },
    createVenteLot(body) { return this._fetch('/ventes/lots', { method: 'POST', body: JSON.stringify(body) }); },

    // --- Pertes ---
    getPertes(lot, cause) {
        let url = '/pertes?';
        if (lot) url += `lot=${lot}&`;
        if (cause) url += `cause=${cause}`;
        return this._fetch(url);
    },
    createPerte(body) { return this._fetch('/pertes', { method: 'POST', body: JSON.stringify(body) }); },

    // --- Couvaisons ---
    getCouvaisons() { return this._fetch('/couvaisons'); },
    createCouvaison(body) { return this._fetch('/couvaisons', { method: 'POST', body: JSON.stringify(body) }); },
    eclore(id, body) { return this._fetch(`/couvaisons/${id}/eclore`, { method: 'POST', body: JSON.stringify(body) }); },
};
