/**
 * AKOHO — Script d'initialisation de la base de données
 *
 * Exécute dans l'ordre :
 *   1. schema.sql  → création de la base, tables, triggers, fonctions, vues
 *   2. data.sql    → données de référence (races, nourriture, paramètres, fiche défaut)
 *                   + données de test (lots, production, ventes, pertes)
 *
 * Voir db/INSTALLATION.md pour le guide complet.
 */
require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
    server: process.env.DB_SERVER || 'localhost',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true,
    }
};

async function run() {
    let pool;
    try {
        // Connect without specifying database first
        pool = await sql.connect(config);
        console.log('📡 Connected to SQL Server');

        // Read and execute schema
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        const schemaBatches = schema.split(/^\s*GO\s*$/mi).filter(b => b.trim());
        console.log(`📦 Executing schema (${schemaBatches.length} batches)...`);
        for (const batch of schemaBatches) {
            if (batch.trim()) {
                try {
                    await pool.request().query(batch);
                } catch (err) {
                    console.error('⚠️  Schema batch error:', err.message);
                    console.error('   Batch:', batch.substring(0, 100) + '...');
                }
            }
        }
        console.log('✅ Schema applied');

        // Read and execute data
        const data = fs.readFileSync(path.join(__dirname, 'data.sql'), 'utf8');
        const dataBatches = data.split(/^\s*GO\s*$/mi).filter(b => b.trim());
        console.log(`📦 Inserting test data (${dataBatches.length} batches)...`);
        for (const batch of dataBatches) {
            if (batch.trim()) {
                try {
                    await pool.request().query(batch);
                } catch (err) {
                    console.error('⚠️  Data batch error:', err.message);
                    console.error('   Batch:', batch.substring(0, 100) + '...');
                }
            }
        }
        console.log('✅ Test data inserted');
        console.log('🐔 AKOHO database is ready!');

    } catch (err) {
        console.error('❌ Fatal error:', err.message);
        process.exit(1);
    } finally {
        if (pool) await pool.close();
    }
}

run();
