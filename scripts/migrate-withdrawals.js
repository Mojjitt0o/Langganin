// scripts/migrate-withdrawals.js
const db = require('../config/database');

async function migrate() {
    console.log('🚀 Running migration: Withdrawals & Topup system...\n');
    
    try {
        // Create withdrawal_status enum
        console.log('1. Creating withdrawal_status enum...');
        await db.query(`
            DO $$ BEGIN
                CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
            EXCEPTION
                WHEN duplicate_object THEN NULL;
            END $$;
        `);
        console.log('   ✅ Done\n');
        
        // Create withdrawals table
        console.log('2. Creating withdrawals table...');
        await db.query(`
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
        `);
        console.log('   ✅ Done\n');
        
        // Add trigger
        console.log('3. Adding trigger for withdrawals...');
        await db.query(`
            DROP TRIGGER IF EXISTS update_withdrawals_updated_at ON withdrawals;
            CREATE TRIGGER update_withdrawals_updated_at
                BEFORE UPDATE ON withdrawals
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
        console.log('   ✅ Done\n');
        
        // Add bank fields to users
        console.log('4. Adding bank fields to users table...');
        await db.query(`
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
        `);
        console.log('   ✅ Done\n');
        
        // Create topup_transactions table
        console.log('5. Creating topup_transactions table...');
        await db.query(`
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
        `);
        console.log('   ✅ Done\n');
        
        // Add trigger for topup
        console.log('6. Adding trigger for topup_transactions...');
        await db.query(`
            DROP TRIGGER IF EXISTS update_topup_transactions_updated_at ON topup_transactions;
            CREATE TRIGGER update_topup_transactions_updated_at
                BEFORE UPDATE ON topup_transactions
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
        console.log('   ✅ Done\n');
        
        console.log('✨ Migration completed successfully!\n');
        console.log('📋 Changes made:');
        console.log('   - withdrawals table - untuk permintaan tarik dana');
        console.log('   - topup_transactions table - untuk transaksi topup Midtrans');
        console.log('   - users: bank_name, account_number, account_name\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

migrate();
