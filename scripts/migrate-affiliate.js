// scripts/migrate-affiliate.js
// Run: node scripts/migrate-affiliate.js
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function migrate() {
    console.log('🔄 Running affiliate migration...\n');
    
    try {
        const sql = fs.readFileSync(
            path.join(__dirname, '..', 'database', 'migrations', 'add-affiliate-system.sql'),
            'utf8'
        );

        await db.pool.query(sql);
        
        console.log('✅ Affiliate migration completed successfully!\n');
        console.log('Tables created/updated:');
        console.log('  - affiliate_settings (with default config)');
        console.log('  - affiliate_commissions');
        console.log('  - affiliate_withdrawals');
        console.log('  - users table: added affiliate_code, referred_by, affiliate_balance columns\n');
        
        // Verify
        const [settings] = await db.query('SELECT * FROM affiliate_settings WHERE id = 1');
        if (settings) {
            console.log('📋 Current affiliate settings:');
            console.log(`   Commission: ${settings.commission_type} — ${settings.commission_value}${settings.commission_type === 'percentage' ? '%' : ' Rp'}`);
            console.log(`   Min withdrawal: Rp ${Number(settings.min_withdrawal).toLocaleString('id-ID')}`);
            console.log(`   Cookie days: ${settings.cookie_days}`);
            console.log(`   Active: ${settings.is_active}`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
