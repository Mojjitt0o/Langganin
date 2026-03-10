-- Add redirect_url column to topup_transactions table
ALTER TABLE topup_transactions 
ADD COLUMN IF NOT EXISTS redirect_url TEXT;
