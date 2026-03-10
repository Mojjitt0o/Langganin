// scripts/migrate-snap-token.js
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
    console.log('🚀 Running migration: Add snap_token column...');

    try {
        const sqlPath = path.join(__dirname, '../database/migrations/add-snap-token.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await db.query(sql);
        
        console.log('✨ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
