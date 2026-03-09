const sql = require('mssql');

const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'akoho',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

async function getPool() {
    if (!pool) {
        pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server');
    }
    return pool;
}

async function query(sqlText, params = {}) {
    const p = await getPool();
    const request = p.request();
    for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
    }
    return request.query(sqlText);
}

module.exports = { getPool, query, sql };
