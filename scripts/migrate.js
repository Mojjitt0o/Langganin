// scripts/migrate.js - Add custom_price and is_admin columns
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
        
        // Add custom_price column
        await client.query('ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS custom_price DECIMAL(15,2)');
        console.log('✅ Added custom_price column to product_variants');
        
        // Add is_admin column
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE');
        console.log('✅ Added is_admin column to users');
        
        // Check columns
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='product_variants'");
        console.log('product_variants columns:', res.rows.map(r => r.column_name));
        
        const res2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='users'");
        console.log('users columns:', res2.rows.map(r => r.column_name));
        
        console.log('\n✅ Migration complete!');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
