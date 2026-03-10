-- ============================================
-- Migration: Affiliate System
-- ============================================

-- Affiliate settings table (admin configurable)
CREATE TABLE IF NOT EXISTS affiliate_settings (
    id SERIAL PRIMARY KEY,
    commission_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage' or 'fixed'
    commission_value DECIMAL(15,2) DEFAULT 5.00,       -- 5% default or fixed Rp amount
    min_withdrawal DECIMAL(15,2) DEFAULT 10000,        -- min withdrawal Rp 10.000
    cookie_days INT DEFAULT 30,                        -- referral cookie validity
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings if not exists
INSERT INTO affiliate_settings (id, commission_type, commission_value, min_withdrawal, cookie_days, is_active)
VALUES (1, 'percentage', 5.00, 10000, 30, true)
ON CONFLICT (id) DO NOTHING;

-- Add affiliate columns to users table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='affiliate_code') THEN
        ALTER TABLE users ADD COLUMN affiliate_code VARCHAR(20) UNIQUE DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referred_by') THEN
        ALTER TABLE users ADD COLUMN referred_by INT DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='affiliate_balance') THEN
        ALTER TABLE users ADD COLUMN affiliate_balance DECIMAL(15,2) DEFAULT 0;
    END IF;
END $$;

-- Affiliate commissions table (tracks each commission earned)
CREATE TABLE IF NOT EXISTS affiliate_commissions (
    id SERIAL PRIMARY KEY,
    affiliate_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id VARCHAR(100) REFERENCES orders(order_id) ON DELETE SET NULL,
    order_amount DECIMAL(15,2) NOT NULL,
    commission_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_affiliate_commissions_updated_at ON affiliate_commissions;
CREATE TRIGGER update_affiliate_commissions_updated_at
    BEFORE UPDATE ON affiliate_commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Affiliate withdrawals table
CREATE TABLE IF NOT EXISTS affiliate_withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, completed, rejected
    rejected_reason TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_affiliate_withdrawals_updated_at ON affiliate_withdrawals;
CREATE TRIGGER update_affiliate_withdrawals_updated_at
    BEFORE UPDATE ON affiliate_withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_code ON users(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_aff_comm_affiliate ON affiliate_commissions(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_aff_comm_referred ON affiliate_commissions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_aff_wd_user ON affiliate_withdrawals(user_id);
