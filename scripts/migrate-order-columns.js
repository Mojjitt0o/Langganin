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
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'orders' AND column_name = 'discount_amount'
                ) THEN
                    ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(15,2) DEFAULT 0;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'orders' AND column_name = 'voucher_code'
                ) THEN
                    ALTER TABLE orders ADD COLUMN voucher_code VARCHAR(50);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'orders' AND column_name = 'buyer_whatsapp'
                ) THEN
                    ALTER TABLE orders ADD COLUMN buyer_whatsapp VARCHAR(20);
                END IF;
            END $$;
        `);

        const res = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'orders'
              AND column_name IN ('discount_amount', 'voucher_code', 'buyer_whatsapp')
            ORDER BY column_name
        `);

        console.log('orders optional columns:', res.rows.map(row => row.column_name));
        console.log('Migration complete');
    } catch (err) {
        console.error('Migration error:', err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
