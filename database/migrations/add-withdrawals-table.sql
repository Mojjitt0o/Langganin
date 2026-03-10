-- Migration: Add withdrawals table and update fields
-- Jalankan: psql -U postgres -d warung_rebahan_shop -f database/migrations/add-withdrawals-table.sql

-- Withdrawal status enum
DO $$ BEGIN
    CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    admin_fee DECIMAL(15,2) NOT NULL,
    net_amount DECIMAL(15,2) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    status withdrawal_status DEFAULT 'pending',
    notes TEXT,
    approved_by INT,
    approved_at TIMESTAMP,
    rejected_reason TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_withdrawals_updated_at ON withdrawals;
CREATE TRIGGER update_withdrawals_updated_at
    BEFORE UPDATE ON withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add bank account fields to users table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bank_name') THEN
        ALTER TABLE users ADD COLUMN bank_name VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='account_number') THEN
        ALTER TABLE users ADD COLUMN account_number VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='account_name') THEN
        ALTER TABLE users ADD COLUMN account_name VARCHAR(100);
    END IF;
END $$;

-- Topup transactions table (for Midtrans)
CREATE TABLE IF NOT EXISTS topup_transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_type VARCHAR(50),
    transaction_id VARCHAR(100),
    transaction_time TIMESTAMP,
    settlement_time TIMESTAMP,
    midtrans_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_topup_order_id ON topup_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_topup_user_id ON topup_transactions(user_id);

DROP TRIGGER IF EXISTS update_topup_transactions_updated_at ON topup_transactions;
CREATE TRIGGER update_topup_transactions_updated_at
    BEFORE UPDATE ON topup_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
