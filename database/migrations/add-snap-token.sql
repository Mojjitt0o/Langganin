-- Add snap_token column to topup_transactions table
ALTER TABLE topup_transactions 
ADD COLUMN IF NOT EXISTS snap_token TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_topup_transactions_snap_token ON topup_transactions(snap_token);
