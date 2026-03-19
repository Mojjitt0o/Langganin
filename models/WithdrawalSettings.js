const db = require('../config/database');

class WithdrawalSettings {
    static async ensureRow() {
        await db.query(
            `INSERT INTO withdrawal_settings (id)
             VALUES (1)
             ON CONFLICT (id) DO NOTHING`,
            []
        );
    }

    static async get() {
        await this.ensureRow();
        const [rows] = await db.query(
            'SELECT admin_fee_percent FROM withdrawal_settings WHERE id = 1'
        );
        return rows[0] || { admin_fee_percent: 10 };
    }

    static async update(values = {}) {
        await this.ensureRow();
        const { admin_fee_percent } = values;
        const params = [];
        let query = 'UPDATE withdrawal_settings SET ';
        const updates = [];

        if (typeof admin_fee_percent !== 'undefined') {
            updates.push('admin_fee_percent = $' + (params.length + 1));
            params.push(admin_fee_percent);
        }

        if (updates.length === 0) return this.get();

        query += updates.join(', ') + ', updated_at = NOW() WHERE id = 1';
        await db.query(query, params);
        return this.get();
    }
}

module.exports = WithdrawalSettings;
