// config/database.js
const { Pool } = require('pg');
require('dotenv').config();

// Konfigurasi koneksi PostgreSQL (Supabase / lokal)
const poolConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

const pool = new Pool(poolConfig);

// Wrapper agar interface mirip mysql2 promise (mengembalikan [rows, fields])
const query = async (text, params) => {
    // Konversi placeholder ? menjadi $1, $2, ... untuk PostgreSQL
    let paramIndex = 0;
    const pgText = text.replace(/\?/g, () => `$${++paramIndex}`);
    const result = await pool.query(pgText, params);
    return [result.rows, result.fields];
};

// Expose pool so models can use client-level transactions (BEGIN/COMMIT/ROLLBACK)
module.exports = { query, pool };