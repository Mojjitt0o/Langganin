const { Pool } = require('pg');

// Konfigurasi koneksi database dari .env
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

/**
 * Ambil iklan aktif dari ads_settings
 */
async function getActiveAd() {
  const res = await pool.query(
    'SELECT * FROM ads_settings WHERE is_active = TRUE ORDER BY id DESC LIMIT 1'
  );
  return res.rows[0];
}

module.exports = {
  getActiveAd,
};
