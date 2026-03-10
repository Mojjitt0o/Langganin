-- Migration: Add account_details JSONB to orders table
-- Jalankan: node scripts/migrate-account-details.js

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='account_details') THEN
        ALTER TABLE orders ADD COLUMN account_details JSONB;
        RAISE NOTICE 'Column account_details added to orders table';
    ELSE
        RAISE NOTICE 'Column account_details already exists in orders table';
    END IF;
END $$;
