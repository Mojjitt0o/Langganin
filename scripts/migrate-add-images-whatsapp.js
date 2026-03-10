// scripts/migrate-add-images-whatsapp.js
// Jalankan: node scripts/migrate-add-images-whatsapp.js

const db = require('../config/database');

async function migrate() {
    console.log('🚀 Running migration: Add image_url and buyer_whatsapp...\n');
    
    try {
        // Add image_url to products table
        console.log('1. Adding image_url column to products table...');
        await db.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_url') THEN
                    ALTER TABLE products ADD COLUMN image_url TEXT;
                    RAISE NOTICE 'Column image_url added to products table';
                ELSE
                    RAISE NOTICE 'Column image_url already exists in products table';
                END IF;
            END $$;
        `);
        console.log('   ✅ Done\n');
        
        // Add buyer_whatsapp to orders table
        console.log('2. Adding buyer_whatsapp column to orders table...');
        await db.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='buyer_whatsapp') THEN
                    ALTER TABLE orders ADD COLUMN buyer_whatsapp VARCHAR(20);
                    RAISE NOTICE 'Column buyer_whatsapp added to orders table';
                ELSE
                    RAISE NOTICE 'Column buyer_whatsapp already exists in orders table';
                END IF;
            END $$;
        `);
        console.log('   ✅ Done\n');
        
        console.log('✨ Migration completed successfully!\n');
        console.log('📋 Changes made:');
        console.log('   - products.image_url (TEXT) - untuk menyimpan URL gambar produk');
        console.log('   - orders.buyer_whatsapp (VARCHAR(20)) - untuk nomor WhatsApp buyer saat checkout\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

migrate();
