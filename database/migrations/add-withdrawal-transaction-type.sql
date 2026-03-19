-- database/migrations/add-withdrawal-transaction-type.sql
-- Pastikan enum transaction_type memiliki nilai 'withdrawal'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'withdrawal'
          AND enumtypid = 'transaction_type'::regtype
    ) THEN
        ALTER TYPE transaction_type ADD VALUE 'withdrawal';
    END IF;
END $$;
