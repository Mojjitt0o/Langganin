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
        console.log('Connected to database');

        await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15,2) DEFAULT 0');
        console.log('Added discount_amount column to orders');

        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='orders'");
        console.log('orders columns:', res.rows.map(r => r.column_name));

        console.log('Migration complete');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
