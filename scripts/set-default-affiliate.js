require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});
p.query('UPDATE affiliate_settings SET commission_value=3.00, referral_discount_value=3.00 WHERE id=1 RETURNING *')
    .then(r => { console.log('Updated:', r.rows[0]); p.end(); })
    .catch(e => { console.error(e); p.end(); });
