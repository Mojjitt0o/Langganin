// scripts/migrate-referral-discount.js - Add referral discount columns to affiliate_settings
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

        await client.query(`
            ALTER TABLE affiliate_settings 
            ADD COLUMN IF NOT EXISTS referral_discount_type VARCHAR(20) DEFAULT 'percentage'
        `);
        console.log('✅ Added referral_discount_type column to affiliate_settings');

        await client.query(`
            ALTER TABLE affiliate_settings 
            ADD COLUMN IF NOT EXISTS referral_discount_value DECIMAL(15,2) DEFAULT 0.00
        `);
        console.log('✅ Added referral_discount_value column to affiliate_settings');

        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='affiliate_settings'");
        console.log('affiliate_settings columns:', res.rows.map(r => r.column_name));

        console.log('\n✅ Migration complete!');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
