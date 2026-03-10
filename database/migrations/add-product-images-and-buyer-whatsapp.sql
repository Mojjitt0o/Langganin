-- Migration: Add image_url to products and buyer_whatsapp to orders
-- Jalankan: psql -U postgres -d warung_rebahan_shop -f database/migrations/add-product-images-and-buyer-whatsapp.sql

-- Add image_url to products table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_url') THEN
        ALTER TABLE products ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Column image_url added to products table';
    ELSE
        RAISE NOTICE 'Column image_url already exists in products table';
    END IF;
END $$;

-- Add buyer_whatsapp to orders table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='buyer_whatsapp') THEN
        ALTER TABLE orders ADD COLUMN buyer_whatsapp VARCHAR(20);
        RAISE NOTICE 'Column buyer_whatsapp added to orders table';
    ELSE
        RAISE NOTICE 'Column buyer_whatsapp already exists in orders table';
    END IF;
END $$;
