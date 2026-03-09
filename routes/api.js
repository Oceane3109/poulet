/** * AKOHO — Routes API REST complètes
 */
const express = require('express');
const router = express.Router();
const { query, sql, getPool } = require('../db/connection');

// Helper: wrap async route handlers
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ============================================================
// UTILITAIRES
// ============================================================

router.get('/status', asyncHandler(async (req, res) => {
    try {
        await query('SELECT 1 AS ok');
        res.json({ data: { status: 'connected', database: process.env.DB_DATABASE }, error: null });
    } catch (e) {
        res.json({ data: null, error: 'Database connection failed: ' + e.message });
    }
}));

router.get('/schema', asyncHandler(async (req, res) => {
    const result = await query(`
        SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_CATALOG = 'akoho'
        ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);
    const schema = {};
    for (const row of result.recordset) {
        if (!schema[row.TABLE_NAME]) schema[row.TABLE_NAME] = [];
        schema[row.TABLE_NAME].push({
            column: row.COLUMN_NAME,
            type: row.DATA_TYPE,
            nullable: row.IS_NULLABLE === 'YES',
            maxLength: row.CHARACTER_MAXIMUM_LENGTH
        });
    }
    res.json({ data: schema, error: null });
}));

// ============================================================
// EVENTS (calendrier)
// ============================================================
router.get('/events', asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ data: null, error: 'Paramètres from et to requis' });

    const result = await query(`
        SELECT 'production' AS type, po.date_production AS date, l.nom_lot AS lot, 
               CAST(po.nb_oeufs AS VARCHAR) + ' œufs produits' AS detail, po.nb_oeufs AS value
        FROM production_oeuf po JOIN lot l ON po.id_lot = l.id_lot
        WHERE po.date_production BETWEEN @from AND @to

        UNION ALL
        SELECT 'vente_oeuf', vo.date_vente, l.nom_lot, 
               CAST(vo.nb_oeufs AS VARCHAR) + ' œufs vendus (' + FORMAT(vo.prix_total, 'N0') + ' Ar)', vo.nb_oeufs
        FROM vente_oeuf vo JOIN lot l ON vo.id_lot = l.id_lot
        WHERE vo.date_vente BETWEEN @from AND @to

        UNION ALL
        SELECT 'perte', p.date_perte, l.nom_lot, 
               CAST(p.nb_perdus AS VARCHAR) + ' pertes' + ISNULL(' (' + p.cause + ')', ''), p.nb_perdus
        FROM perte p JOIN lot l ON p.id_lot = l.id_lot
        WHERE p.date_perte BETWEEN @from AND @to

        UNION ALL
        SELECT 'couvaison', oc.date_mise_couvaison, l.nom_lot,
               CAST(oc.nb_oeufs_couves AS VARCHAR) + ' œufs mis en couvaison', oc.nb_oeufs_couves
        FROM oeuf_couvaison oc JOIN lot l ON oc.id_lot_mere = l.id_lot
        WHERE oc.date_mise_couvaison BETWEEN @from AND @to

        UNION ALL
        SELECT 'eclosion', oc.date_eclosion, l.nom_lot,
               CAST(ISNULL(oc.nb_ecloses, 0) AS VARCHAR) + ' poussins éclos', ISNULL(oc.nb_ecloses, 0)
        FROM oeuf_couvaison oc JOIN lot l ON oc.id_lot_mere = l.id_lot
        WHERE oc.date_eclosion BETWEEN @from AND @to AND oc.nb_ecloses IS NOT NULL

        UNION ALL
        SELECT 'vente_poulet', vp.date_vente, l.nom_lot,
               CAST(vp.nb_poulets AS VARCHAR) + ' poulets vendus (' + FORMAT(vp.prix_total, 'N0') + ' Ar)', vp.nb_poulets
        FROM vente_poulet vp JOIN lot l ON vp.id_lot = l.id_lot
        WHERE vp.date_vente BETWEEN @from AND @to

        UNION ALL
        SELECT 'vente_lot', vl.date_vente, l.nom_lot,
               'Cession lot (' + FORMAT(vl.prix_vente, 'N0') + ' Ar)', 1
        FROM vente_lot vl JOIN lot l ON vl.id_lot = l.id_lot
        WHERE vl.date_vente BETWEEN @from AND @to

        ORDER BY date DESC
    `, { from, to });
    res.json({ data: result.recordset, error: null });
}));

// ============================================================
// DASHBOARD & RENTABILITÉ
// ============================================================

router.get('/dashboard', asyncHandler(async (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const result = await query('SELECT * FROM dbo.fn_dashboard(@date)', { date });
    res.json({ data: result.recordset, error: null });
}));

router.get('/rentabilite', asyncHandler(async (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const result = await query('SELECT * FROM dbo.fn_rentabilite(@date)', { date });
    res.json({ data: result.recordset, error: null });
}));

// ============================================================
// RACES
// ============================================================

router.get('/races', asyncHandler(async (req, res) => {
    const result = await query(`
        SELECT r.*, (SELECT COUNT(*) FROM lot WHERE id_race = r.id_race) AS nb_lots
        FROM race r ORDER BY r.nom_race
    `);
    res.json({ data: result.recordset, error: null });
}));

router.post('/races', asyncHandler(async (req, res) => {
    const { nom_race, prix_oeuf, prix_kg, description } = req.body;
    if (!nom_race || prix_oeuf == null || prix_kg == null) {
        return res.status(400).json({ data: null, error: 'nom_race, prix_oeuf et prix_kg sont requis' });
    }
    const result = await query(`
        INSERT INTO race (nom_race, prix_oeuf, prix_kg, description)
        OUTPUT INSERTED.*
        VALUES (@nom_race, @prix_oeuf, @prix_kg, @description)
    `, { nom_race, prix_oeuf, prix_kg, description: description || null });
    res.json({ data: result.recordset[0], error: null });
}));

router.put('/races/:id', asyncHandler(async (req, res) => {
    const { nom_race, prix_oeuf, prix_kg, description } = req.body;
    await query(`
        UPDATE race SET nom_race=@nom_race, prix_oeuf=@prix_oeuf, prix_kg=@prix_kg, description=@description
        WHERE id_race=@id
    `, { id: parseInt(req.params.id), nom_race, prix_oeuf, prix_kg, description: description || null });
    res.json({ data: { success: true }, error: null });
}));

router.delete('/races/:id', asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const check = await query('SELECT COUNT(*) AS cnt FROM lot WHERE id_race=@id', { id });
    if (check.recordset[0].cnt > 0) {
        return res.status(400).json({ data: null, error: 'Impossible de supprimer : des lots utilisent cette race' });
    }
    await query('DELETE FROM race WHERE id_race=@id', { id });
    res.json({ data: { success: true }, error: null });
}));

// ============================================================
// NOURRITURE
// ============================================================

router.get('/nourriture', asyncHandler(async (req, res) => {
    const result = await query(`
        SELECT n.*, (SELECT COUNT(DISTINCT id_fiche) FROM fiche_row WHERE id_nourriture = n.id_nourriture) AS nb_fiches
        FROM nourriture n ORDER BY n.nom_nourriture
    `);
    res.json({ data: result.recordset, error: null });
}));

router.post('/nourriture', asyncHandler(async (req, res) => {
    const { nom_nourriture, prix_gramme, type_aliment } = req.body;
    if (!nom_nourriture || prix_gramme == null) {
        return res.status(400).json({ data: null, error: 'nom_nourriture et prix_gramme sont requis' });
    }
    const result = await query(`
        INSERT INTO nourriture (nom_nourriture, prix_gramme, type_aliment)
        OUTPUT INSERTED.*
        VALUES (@nom_nourriture, @prix_gramme, @type_aliment)
    `, { nom_nourriture, prix_gramme, type_aliment: type_aliment || null });
    res.json({ data: result.recordset[0], error: null });
}));

router.put('/nourriture/:id', asyncHandler(async (req, res) => {
    const { nom_nourriture, prix_gramme, type_aliment } = req.body;
    await query(`
        UPDATE nourriture SET nom_nourriture=@nom_nourriture, prix_gramme=@prix_gramme, type_aliment=@type_aliment
        WHERE id_nourriture=@id
    `, { id: parseInt(req.params.id), nom_nourriture, prix_gramme, type_aliment: type_aliment || null });
    res.json({ data: { success: true }, error: null });
}));

router.delete('/nourriture/:id', asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const check = await query('SELECT COUNT(*) AS cnt FROM fiche_row WHERE id_nourriture=@id', { id });
    if (check.recordset[0].cnt > 0) {
        return res.status(400).json({ data: null, error: 'Impossible de supprimer : cet aliment est utilisé dans des fiches' });
    }
    await query('DELETE FROM nourriture WHERE id_nourriture=@id', { id });
    res.json({ data: { success: true }, error: null });
}));

// ============================================================
// FICHES DE CROISSANCE
// ============================================================

router.get('/fiches', asyncHandler(async (req, res) => {
    const result = await query(`
        SELECT fm.*, r.nom_race,
            (SELECT COUNT(*) FROM fiche_row WHERE id_fiche = fm.id_fiche) AS nb_semaines,
            (SELECT COUNT(*) FROM lot WHERE id_fiche = fm.id_fiche) AS nb_lots
        FROM fiche_model fm
        JOIN race r ON fm.id_race = r.id_race
        ORDER BY fm.label
    `);
    res.json({ data: result.recordset, error: null });
}));

router.get('/fiches/:id', asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const model = await query(`
        SELECT fm.*, r.nom_race FROM fiche_model fm
        JOIN race r ON fm.id_race = r.id_race WHERE fm.id_fiche=@id
    `, { id });
    if (!model.recordset.length) return res.status(404).json({ data: null, error: 'Fiche non trouvée' });
    const rows = await query(`
        SELECT fr.*, n.nom_nourriture, n.prix_gramme
        FROM fiche_row fr JOIN nourriture n ON fr.id_nourriture = n.id_nourriture
        WHERE fr.id_fiche=@id ORDER BY fr.semaine
    `, { id });
    res.json({ data: { ...model.recordset[0], rows: rows.recordset }, error: null });
}));

router.post('/fiches', asyncHandler(async (req, res) => {
    const { id_race, type, label } = req.body;
    const result = await query(`
        INSERT INTO fiche_model (id_race, type, label) OUTPUT INSERTED.*
        VALUES (@id_race, @type, @label)
    `, { id_race, type: type || 'concessionnaire', label: label || null });
    res.json({ data: result.recordset[0], error: null });
}));

router.put('/fiches/:id', asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const { semaines, label, id_race, type } = req.body;
    
    // Update the model if label/race/type provided
    if (label !== undefined || id_race !== undefined || type !== undefined) {
        const updates = [];
        const params = { id };
        if (label !== undefined) { updates.push('label=@label'); params.label = label; }
        if (id_race !== undefined) { updates.push('id_race=@id_race'); params.id_race = id_race; }
        if (type !== undefined) { updates.push('type=@type'); params.type = type; }
        if (updates.length) {
            await query(`UPDATE fiche_model SET ${updates.join(',')} WHERE id_fiche=@id`, params);
        }
    }
    
    // Replace-all strategy for rows
    if (semaines && Array.isArray(semaines)) {
        await query('DELETE FROM fiche_row WHERE id_fiche=@id', { id });
        for (const s of semaines) {
            await query(`
                INSERT INTO fiche_row (id_fiche, semaine, age, variation, id_nourriture, poids)
                VALUES (@id, @semaine, @age, @variation, @id_nourriture, @poids)
            `, { id, semaine: s.semaine, age: s.age, variation: s.variation, id_nourriture: s.id_nourriture, poids: s.poids });
        }
    }
    
    // Return updated fiche
    const model = await query('SELECT fm.*, r.nom_race FROM fiche_model fm JOIN race r ON fm.id_race = r.id_race WHERE fm.id_fiche=@id', { id });
    const rows = await query('SELECT fr.*, n.nom_nourriture, n.prix_gramme FROM fiche_row fr JOIN nourriture n ON fr.id_nourriture = n.id_nourriture WHERE fr.id_fiche=@id ORDER BY fr.semaine', { id });
    res.json({ data: { ...model.recordset[0], rows: rows.recordset }, error: null });
}));

router.delete('/fiches/:id', asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const check = await query('SELECT COUNT(*) AS cnt FROM lot WHERE id_fiche=@id', { id });
    if (check.recordset[0].cnt > 0) {
        return res.status(400).json({ data: null, error: 'Impossible de supprimer : des lots utilisent cette fiche' });
    }
    await query('DELETE FROM fiche_row WHERE id_fiche=@id', { id });
    await query('DELETE FROM fiche_model WHERE id_fiche=@id', { id });
    res.json({ data: { success: true }, error: null });
}));

// ============================================================
// LOTS
// ============================================================

router.get('/lots', asyncHandler(async (req, res) => {
    const result = await query(`
        SELECT l.*, r.nom_race, fm.label AS fiche_label,
            lm.nom_lot AS nom_lot_mere
        FROM lot l
        JOIN race r ON l.id_race = r.id_race
        LEFT JOIN fiche_model fm ON l.id_fiche = fm.id_fiche
        LEFT JOIN lot lm ON l.id_lot_mere = lm.id_lot
        ORDER BY l.date_arrivee DESC
    `);
    res.json({ data: result.recordset, error: null });
}));

router.post('/lots', asyncHandler(async (req, res) => {
    const { nom_lot, id_race, age_arrivee, nombre, date_arrivee, prix_achat, origine, id_lot_mere, id_fiche, semaines } = req.body;
    
    if (!nom_lot || !id_race || age_arrivee == null || !nombre || !date_arrivee || !origine) {
        return res.status(400).json({ data: null, error: 'Champs requis : nom_lot, id_race, age_arrivee, nombre, date_arrivee, origine' });
    }

    let ficheId = id_fiche || null;

    // If semaines provided inline → create a new fiche
    if (semaines && semaines.length > 0 && !ficheId) {
        const ficheResult = await query(`
            INSERT INTO fiche_model (id_race, type, label) OUTPUT INSERTED.id_fiche
            VALUES (@id_race, 'concessionnaire', @label)
        `, { id_race, label: `Fiche ${nom_lot}` });
        ficheId = ficheResult.recordset[0].id_fiche;

        for (const s of semaines) {
            await query(`
                INSERT INTO fiche_row (id_fiche, semaine, age, variation, id_nourriture, poids)
                VALUES (@id_fiche, @semaine, @age, @variation, @id_nourriture, @poids)
            `, { id_fiche: ficheId, semaine: s.semaine, age: s.age, variation: s.variation, id_nourriture: s.id_nourriture, poids: s.poids });
        }
    }

    const result = await query(`
        INSERT INTO lot (nom_lot, id_race, age_arrivee, nombre, date_arrivee, prix_achat, origine, id_lot_mere, id_fiche)
        VALUES (@nom_lot, @id_race, @age_arrivee, @nombre, @date_arrivee, @prix_achat, @origine, @id_lot_mere, @id_fiche);

        SELECT * FROM lot WHERE id_lot = SCOPE_IDENTITY();
    `, {
        nom_lot, id_race, age_arrivee, nombre, date_arrivee,
        prix_achat: origine === 'couvaison' ? 0 : (prix_achat || 0),
        origine,
        id_lot_mere: id_lot_mere || null,
        id_fiche: ficheId
    });
    res.json({ data: result.recordset[0], error: null });
}));

router.put('/lots/:id', asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const { nom_lot, id_race, age_arrivee, nombre, date_arrivee, prix_achat, id_fiche } = req.body;
    await query(`
        UPDATE lot SET nom_lot=@nom_lot, id_race=@id_race, age_arrivee=@age_arrivee,
            nombre=@nombre, date_arrivee=@date_arrivee, prix_achat=@prix_achat, id_fiche=@id_fiche
        WHERE id_lot=@id
    `, { id, nom_lot, id_race, age_arrivee, nombre, date_arrivee, prix_achat, id_fiche: id_fiche || null });
    res.json({ data: { success: true }, error: null });
}));

router.get('/lots/:id/stock_oeufs', asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const result = await query('SELECT dbo.fn_stock_oeufs(@id, @date) AS stock', { id, date });
    res.json({ data: result.recordset[0].stock, error: null });
}));

// Poids estimé d'un poulet du lot à une date donnée (depuis fiche_row)
router.get('/lots/:id/poids', asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const result = await query(`
        DECLARE @sem INT = dbo.fn_semaine_actuelle(@id, @date);
        
        SELECT 
            @sem AS semaine,
            dbo.fn_nombre_actuel(@id, @date) AS nombre_actuel,
            l.id_race,
            r.prix_kg,
            (SELECT TOP 1 fr.poids FROM fiche_row fr 
             WHERE fr.id_fiche = l.id_fiche AND fr.semaine <= @sem 
             ORDER BY fr.semaine DESC) AS poids_unitaire_g,
            (SELECT ISNULL(SUM(fr2.variation), 0) FROM fiche_row fr2 
             WHERE fr2.id_fiche = l.id_fiche AND fr2.semaine <= @sem) AS total_variation_g
        FROM lot l
        JOIN race r ON l.id_race = r.id_race
        WHERE l.id_lot = @id
    `, { id, date });
    
    if (!result.recordset.length) {
        return res.json({ data: null, error: 'Lot non trouvé' });
    }
    
    const row = result.recordset[0];
    const poidsUnitaireKg = row.poids_unitaire_g ? row.poids_unitaire_g / 1000 : null;
    const poidsEstimVariationKg = (row.total_variation_g ? row.total_variation_g / 1000 : null);

    res.json({ data: {
        semaine: row.semaine,
        nombre_actuel: row.nombre_actuel,
        poids_unitaire_kg: poidsUnitaireKg,
        poids_estim_variation_kg: poidsEstimVariationKg,
        prix_kg: row.prix_kg
    }, error: null });
}));

// ============================================================
// PRODUCTION OEUFS
// ============================================================

router.get('/oeufs', asyncHandler(async (req, res) => {
    const { date, lot } = req.query;
    let sql = `
        SELECT po.*, l.nom_lot, r.nom_race
        FROM production_oeuf po
        JOIN lot l ON po.id_lot = l.id_lot
        JOIN race r ON l.id_race = r.id_race
        WHERE 1=1
    `;
    const params = {};
    if (date) { sql += ' AND po.date_production = @date'; params.date = date; }
    if (lot) { sql += ' AND po.id_lot = @lot'; params.lot = parseInt(lot); }
    sql += ' ORDER BY po.date_production DESC, l.nom_lot';
    const result = await query(sql, params);
    res.json({ data: result.recordset, error: null });
}));

router.post('/oeufs', asyncHandler(async (req, res) => {
    const { id_lot, date_production, nb_oeufs } = req.body;
    if (!id_lot || !date_production || !nb_oeufs) {
        return res.status(400).json({ data: null, error: 'id_lot, date_production et nb_oeufs requis' });
    }
    const result = await query(`
        INSERT INTO production_oeuf (id_lot, date_production, nb_oeufs)
        OUTPUT INSERTED.*
        VALUES (@id_lot, @date_production, @nb_oeufs)
    `, { id_lot, date_production, nb_oeufs });
    res.json({ data: result.recordset[0], error: null });
}));

router.delete('/oeufs/:id', asyncHandler(async (req, res) => {
    await query('DELETE FROM production_oeuf WHERE id_production=@id', { id: parseInt(req.params.id) });
    res.json({ data: { success: true }, error: null });
}));

// ============================================================
// VENTES OEUFS
// ============================================================

router.get('/ventes/oeufs', asyncHandler(async (req, res) => {
    const result = await query(`
        SELECT vo.*, l.nom_lot, r.nom_race
        FROM vente_oeuf vo JOIN lot l ON vo.id_lot = l.id_lot JOIN race r ON l.id_race = r.id_race
        ORDER BY vo.date_vente DESC
    `);
    res.json({ data: result.recordset, error: null });
}));

router.post('/ventes/oeufs', asyncHandler(async (req, res) => {
    const { id_lot, date_vente, nb_oeufs, prix_unitaire } = req.body;
    if (!id_lot || !date_vente || !nb_oeufs) {
        return res.status(400).json({ data: null, error: 'id_lot, date_vente et nb_oeufs requis' });
    }
    // Because of trigger, use @t workaround
    const result = await query(`
        DECLARE @t TABLE (id_vente INT);
        INSERT INTO vente_oeuf (id_lot, date_vente, nb_oeufs, prix_unitaire)
        OUTPUT INSERTED.id_vente INTO @t
        VALUES (@id_lot, @date_vente, @nb_oeufs, @prix_unitaire);
        SELECT vo.* FROM vente_oeuf vo JOIN @t t ON vo.id_vente = t.id_vente;
    `, { id_lot, date_vente, nb_oeufs, prix_unitaire: prix_unitaire || null });
    res.json({ data: result.recordset[0], error: null });
}));

// ============================================================
// VENTES POULETS
// ============================================================

router.get('/ventes/poulets', asyncHandler(async (req, res) => {
    const result = await query(`
        SELECT vp.*, l.nom_lot, r.nom_race
        FROM vente_poulet vp JOIN lot l ON vp.id_lot = l.id_lot JOIN race r ON l.id_race = r.id_race
        ORDER BY vp.date_vente DESC
    `);
    res.json({ data: result.recordset, error: null });
}));

router.post('/ventes/poulets', asyncHandler(async (req, res) => {
    const { id_lot, date_vente, nb_poulets, poids_total_kg, prix_kg } = req.body;
    if (!id_lot || !date_vente || !nb_poulets || !poids_total_kg) {
        return res.status(400).json({ data: null, error: 'id_lot, date_vente, nb_poulets et poids_total_kg requis' });
    }
    const result = await query(`
        DECLARE @t TABLE (id_vente INT);
        INSERT INTO vente_poulet (id_lot, date_vente, nb_poulets, poids_total_kg, prix_kg)
        OUTPUT INSERTED.id_vente INTO @t
        VALUES (@id_lot, @date_vente, @nb_poulets, @poids_total_kg, @prix_kg);
        SELECT vp.* FROM vente_poulet vp JOIN @t t ON vp.id_vente = t.id_vente;
    `, { id_lot, date_vente, nb_poulets, poids_total_kg, prix_kg: prix_kg || null });
    res.json({ data: result.recordset[0], error: null });
}));

// ============================================================
// VENTES LOTS (cessions)
// ============================================================

router.get('/ventes/lots', asyncHandler(async (req, res) => {
    const result = await query(`
        SELECT vl.*, l.nom_lot, r.nom_race
        FROM vente_lot vl JOIN lot l ON vl.id_lot = l.id_lot JOIN race r ON l.id_race = r.id_race
        ORDER BY vl.date_vente DESC
    `);
    res.json({ data: result.recordset, error: null });
}));

router.post('/ventes/lots', asyncHandler(async (req, res) => {
    const { id_lot, date_vente, prix_vente } = req.body;
    if (!id_lot || !date_vente || prix_vente == null) {
        return res.status(400).json({ data: null, error: 'id_lot, date_vente et prix_vente requis' });
    }
    const result = await query(`
        INSERT INTO vente_lot (id_lot, date_vente, prix_vente)
        OUTPUT INSERTED.*
        VALUES (@id_lot, @date_vente, @prix_vente)
    `, { id_lot, date_vente, prix_vente });
    res.json({ data: result.recordset[0], error: null });
}));

// ============================================================
// PERTES
// ============================================================

router.get('/pertes', asyncHandler(async (req, res) => {
    const { lot, cause } = req.query;
    let sql = `
        SELECT p.*, l.nom_lot, r.nom_race
        FROM perte p JOIN lot l ON p.id_lot = l.id_lot JOIN race r ON l.id_race = r.id_race
        WHERE 1=1
    `;
    const params = {};
    if (lot) { sql += ' AND p.id_lot = @lot'; params.lot = parseInt(lot); }
    if (cause) { sql += ' AND p.cause LIKE @cause'; params.cause = '%' + cause + '%'; }
    sql += ' ORDER BY p.date_perte DESC';
    const result = await query(sql, params);
    res.json({ data: result.recordset, error: null });
}));

router.post('/pertes', asyncHandler(async (req, res) => {
    const { id_lot, date_perte, nb_perdus, cause, entite } = req.body;
    if (!id_lot || !date_perte || !nb_perdus) {
        return res.status(400).json({ data: null, error: 'id_lot, date_perte et nb_perdus requis' });
    }
    const result = await query(`
        INSERT INTO perte (id_lot, date_perte, nb_perdus, cause, entite)
        OUTPUT INSERTED.*
        VALUES (@id_lot, @date_perte, @nb_perdus, @cause, @entite)
    `, { id_lot, date_perte, nb_perdus, cause: cause || null, entite: entite || 'Poulet' });
    res.json({ data: result.recordset[0], error: null });
}));

// ============================================================
// COUVAISONS
// ============================================================

router.get('/couvaisons', asyncHandler(async (req, res) => {
    const result = await query(`
        SELECT oc.*, lm.nom_lot AS nom_lot_mere, ln.nom_lot AS nom_lot_ne, r.nom_race
        FROM oeuf_couvaison oc
        JOIN lot lm ON oc.id_lot_mere = lm.id_lot
        JOIN race r ON lm.id_race = r.id_race
        LEFT JOIN lot ln ON oc.id_lot_ne = ln.id_lot
        ORDER BY oc.date_mise_couvaison DESC
    `);
    res.json({ data: result.recordset, error: null });
}));

router.post('/couvaisons', asyncHandler(async (req, res) => {
    const { id_lot_mere, date_mise_couvaison, nb_oeufs_couves } = req.body;
    if (!id_lot_mere || !date_mise_couvaison || !nb_oeufs_couves) {
        return res.status(400).json({ data: null, error: 'id_lot_mere, date_mise_couvaison et nb_oeufs_couves requis' });
    }

    // Validate availability
    const availResult = await query(`
        SELECT
            ISNULL((SELECT SUM(nb_oeufs) FROM production_oeuf WHERE id_lot=@id_lot AND date_production=@date), 0)
          - ISNULL((SELECT SUM(nb_oeufs) FROM vente_oeuf WHERE id_lot=@id_lot AND date_vente=@date), 0)
          - ISNULL((SELECT SUM(nb_oeufs_couves) FROM oeuf_couvaison WHERE id_lot_mere=@id_lot AND date_mise_couvaison=@date), 0)
          AS disponible
    `, { id_lot: id_lot_mere, date: date_mise_couvaison });

    const disponible = availResult.recordset[0].disponible;
    if (nb_oeufs_couves > disponible) {
        return res.status(400).json({ data: null, error: `Seulement ${disponible} œufs disponibles ce jour (demandé: ${nb_oeufs_couves})` });
    }

    const result = await query(`
        INSERT INTO oeuf_couvaison (id_lot_mere, date_mise_couvaison, nb_oeufs_couves)
        OUTPUT INSERTED.*
        VALUES (@id_lot_mere, @date_mise_couvaison, @nb_oeufs_couves)
    `, { id_lot_mere, date_mise_couvaison, nb_oeufs_couves });
    res.json({ data: result.recordset[0], error: null });
}));

// ÉCLOSION — Transaction atomique
router.post('/couvaisons/:id/eclore', asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const { nb_ecloses, nom_lot } = req.body;

    if (!nb_ecloses || !nom_lot) {
        return res.status(400).json({ data: null, error: 'nb_ecloses et nom_lot requis' });
    }

    const pool = await getPool();
    const transaction = pool.transaction();

    try {
        await transaction.begin();

        // 1. Read couvaison
        const couv = await transaction.request()
            .input('id', id)
            .query(`
                SELECT oc.*, lm.id_race, lm.id_fiche
                FROM oeuf_couvaison oc
                JOIN lot lm ON oc.id_lot_mere = lm.id_lot
                WHERE oc.id_couvaison = @id AND oc.nb_ecloses IS NULL
            `);

        if (!couv.recordset.length) {
            await transaction.rollback();
            return res.status(400).json({ data: null, error: 'Couvaison non trouvée ou déjà éclose' });
        }

        const c = couv.recordset[0];

        // 2. Create new lot
        const newLot = await transaction.request()
            .input('nom_lot', nom_lot)
            .input('id_race', c.id_race)
            .input('nombre', nb_ecloses)
            .input('date_arrivee', c.date_eclosion)
            .input('id_lot_mere', c.id_lot_mere)
            .input('id_fiche', c.id_fiche)
            .query(`
                INSERT INTO lot (nom_lot, id_race, age_arrivee, nombre, date_arrivee, prix_achat, origine, id_lot_mere, id_fiche)
                VALUES (@nom_lot, @id_race, 1, @nombre, @date_arrivee, 0, 'couvaison', @id_lot_mere, @id_fiche);

                SELECT * FROM lot WHERE id_lot = SCOPE_IDENTITY();
            `);

        const lot = newLot.recordset[0];

        // 3. Update couvaison
        await transaction.request()
            .input('id', id)
            .input('nb_ecloses', nb_ecloses)
            .input('id_lot_ne', lot.id_lot)
            .query(`
                UPDATE oeuf_couvaison SET nb_ecloses = @nb_ecloses, id_lot_ne = @id_lot_ne
                WHERE id_couvaison = @id
            `);

        // 4. Auto-create perte for non-hatched eggs
        const nbNonEclos = c.nb_oeufs_couves - nb_ecloses;
        if (nbNonEclos > 0) {
            await transaction.request()
                .input('id_lot', c.id_lot_mere)
                .input('date_perte', c.date_eclosion)
                .input('nb_perdus', nbNonEclos)
                .query(`
                    INSERT INTO perte (id_lot, date_perte, nb_perdus, cause, entite)
                    VALUES (@id_lot, @date_perte, @nb_perdus, 'non éclosion', 'Oeuf')
                `);
        }

        // Read updated couvaison
        const updatedCouv = await transaction.request()
            .input('id', id)
            .query('SELECT * FROM oeuf_couvaison WHERE id_couvaison = @id');

        await transaction.commit();

        res.json({ data: { couvaison: updatedCouv.recordset[0], lot, pertes_oeufs: nbNonEclos }, error: null });
    } catch (err) {
        await transaction.rollback();
        res.status(500).json({ data: null, error: 'Erreur lors de l\'éclosion: ' + err.message });
    }
}));

// Error handler
router.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({ data: null, error: err.message || 'Erreur serveur' });
});

module.exports = router;
