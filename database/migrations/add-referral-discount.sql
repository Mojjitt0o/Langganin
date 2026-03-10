-- ============================================
-- Migration: Add referral discount to affiliate_settings
-- ============================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliate_settings' AND column_name='referral_discount_type') THEN
        ALTER TABLE affiliate_settings ADD COLUMN referral_discount_type VARCHAR(20) DEFAULT 'percentage';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='affiliate_settings' AND column_name='referral_discount_value') THEN
        ALTER TABLE affiliate_settings ADD COLUMN referral_discount_value DECIMAL(15,2) DEFAULT 0.00;
    END IF;
END $$;
