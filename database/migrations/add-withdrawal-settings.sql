-- database/migrations/add-withdrawal-settings.sql
-- Migration: add table storing withdrawal configuration
CREATE TABLE IF NOT EXISTS withdrawal_settings (
    id              SMALLINT PRIMARY KEY DEFAULT 1,
    admin_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM withdrawal_settings WHERE id = 1) THEN
        INSERT INTO withdrawal_settings (id) VALUES (1);
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_withdrawal_settings_updated ON withdrawal_settings;
CREATE TRIGGER update_withdrawal_settings_updated
    BEFORE UPDATE ON withdrawal_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
