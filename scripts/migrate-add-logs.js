// scripts/migrate-add-logs.js
// Jalankan: node scripts/migrate-add-logs.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Menjalankan migration: create system_logs table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id SERIAL PRIMARY KEY,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                type VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                meta JSONB NULL
            );
        `);

        console.log('✅ Tabel system_logs siap');
        console.log('✅ Migration selesai!');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
