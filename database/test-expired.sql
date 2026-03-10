-- Update existing pending transactions to expired (for testing)
-- Run this only for testing purposes

-- Check current pending transactions
SELECT * FROM topup_transactions WHERE status = 'pending';

-- To manually mark a transaction as expired (for testing):
-- UPDATE topup_transactions 
-- SET status = 'expired', 
--     updated_at = NOW() 
-- WHERE order_id = 'YOUR_ORDER_ID_HERE';
