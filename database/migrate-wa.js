// database/migrate-wa.js
// Jalankan: node database/migrate-wa.js
require('dotenv').config();
const db = require('../config/database');

async function migrate() {
    try {
        console.log('🔄 Menjalankan migration...');

        // 1. Tambah kolom whatsapp ke users
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20) DEFAULT NULL`);
        console.log('✅ Kolom whatsapp di tabel users: OK');

        // 2. Cek hasilnya
        const [users] = await db.query('SELECT id, username, email, whatsapp FROM users ORDER BY id LIMIT 10');
        console.log(`\n📋 Total users: ${users.length}`);
        users.forEach(u => {
            console.log(`  #${u.id} ${u.username} (${u.email}) — WA: ${u.whatsapp || '—'}`);
        });

        console.log('\n✅ Migration selesai!');
    } catch (e) {
        console.error('❌ Migration gagal:', e.message);
    } finally {
        process.exit(0);
    }
}

migrate();
