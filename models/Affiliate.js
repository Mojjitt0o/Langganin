// models/Affiliate.js
const db = require('../config/database');
const crypto = require('crypto');

class Affiliate {
    static async runQuery(executor, text, params) {
        const result = await executor.query(text, params);
        if (Array.isArray(result)) return result;
        return [result.rows || [], result.fields || []];
    }

    // ─── Generate unique affiliate code ───
    static generateCode(username) {
        const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const prefix = username.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '');
        return `${prefix}-${suffix}`;
    }

    // ─── Activate affiliate for a user (generate code) ───
    static async activate(userId) {
        const [userRows] = await db.query('SELECT username, affiliate_code FROM users WHERE id = $1', [userId]);
        if (!userRows[0]) throw new Error('User tidak ditemukan');
        if (userRows[0].affiliate_code) return userRows[0].affiliate_code;

        const code = this.generateCode(userRows[0].username);
        await db.query('UPDATE users SET affiliate_code = $1 WHERE id = $2', [code, userId]);
        return code;
    }

    // ─── Get affiliate info for a user ───
    static async getInfo(userId) {
        const [rows] = await db.query(
            `SELECT id, username, email, affiliate_code, affiliate_balance, referred_by, created_at
             FROM users WHERE id = $1`,
            [userId]
        );
        return rows[0] || null;
    }

    // ─── Get affiliate settings ───
    static async getSettings(executor = db) {
        const [rows] = await this.runQuery(executor, 'SELECT * FROM affiliate_settings WHERE id = 1');
        return rows[0] || { commission_type: 'percentage', commission_value: 5, min_withdrawal: 10000, cookie_days: 30, is_active: true, referral_discount_type: 'percentage', referral_discount_value: 0 };
    }

    // ─── Update affiliate settings (admin) ───
    static async updateSettings(data) {
        const { commission_type, commission_value, min_withdrawal, cookie_days, is_active, referral_discount_type, referral_discount_value } = data;
        const [rows] = await db.query(
            `UPDATE affiliate_settings 
             SET commission_type = $1, commission_value = $2, min_withdrawal = $3, 
                 cookie_days = $4, is_active = $5,
                 referral_discount_type = $6, referral_discount_value = $7,
                 updated_at = NOW()
             WHERE id = 1 RETURNING *`,
            [commission_type, commission_value, min_withdrawal, cookie_days, is_active,
             referral_discount_type || 'percentage', parseFloat(referral_discount_value) || 0]
        );
        return rows[0];
    }

    // ─── Find user by affiliate code ───
    static async findByCode(code) {
        const normalizedCode = String(code || '').trim().toUpperCase();
        if (!normalizedCode) return null;

        const [rows] = await db.query(
            'SELECT id, username, affiliate_code FROM users WHERE affiliate_code = $1',
            [normalizedCode]
        );
        return rows[0] || null;
    }

    // ─── Calculate referral discount for an order ───
    static async calcDiscount(sellTotal) {
        const settings = await this.getSettings();
        if (!settings.is_active) return 0;
        const val = parseFloat(settings.referral_discount_value) || 0;
        if (val <= 0) return 0;
        if (settings.referral_discount_type === 'percentage') {
            return Math.round((sellTotal * val / 100) * 100) / 100;
        }
        return Math.min(val, sellTotal); // fixed, tapi tidak melebihi total
    }

    // ─── Set referred_by on a user ───
    static async setReferrer(userId, referrerId) {
        await db.query(
            'UPDATE users SET referred_by = $1 WHERE id = $2 AND referred_by IS NULL',
            [referrerId, userId]
        );
    }

    // ─── Record commission from an order ───
    static async recordCommission(affiliateUserId, referredUserId, orderId, orderAmount, executor = db) {
        if (!affiliateUserId || affiliateUserId === referredUserId) return null;

        const settings = await this.getSettings(executor);
        if (!settings.is_active) return null;

        let commissionAmount;
        if (settings.commission_type === 'percentage') {
            commissionAmount = (orderAmount * parseFloat(settings.commission_value)) / 100;
        } else {
            commissionAmount = parseFloat(settings.commission_value);
        }

        commissionAmount = Math.round(commissionAmount * 100) / 100; // round to 2dp

        if (commissionAmount <= 0) return null;

        const [rows] = await this.runQuery(
            executor,
            `INSERT INTO affiliate_commissions (affiliate_user_id, referred_user_id, order_id, order_amount, commission_amount, status)
             VALUES ($1, $2, $3, $4, $5, 'approved') RETURNING *`,
            [affiliateUserId, referredUserId, orderId, orderAmount, commissionAmount]
        );

        // Add to affiliate balance
        await this.runQuery(
            executor,
            'UPDATE users SET affiliate_balance = affiliate_balance + $1 WHERE id = $2',
            [commissionAmount, affiliateUserId]
        );

        return rows[0];
    }

    // ─── Get referrals for an affiliate ───
    static async getReferrals(affiliateUserId) {
        const [rows] = await db.query(
            `SELECT u.id, u.username, u.email, u.created_at,
                    COUNT(ac.id) as total_orders,
                    COALESCE(SUM(ac.commission_amount), 0) as total_commission
             FROM users u
             LEFT JOIN affiliate_commissions ac ON ac.referred_user_id = u.id AND ac.affiliate_user_id = $1
             WHERE u.referred_by = $1
             GROUP BY u.id, u.username, u.email, u.created_at
             ORDER BY u.created_at DESC`,
            [affiliateUserId]
        );
        return rows;
    }

    // ─── Get commission history for an affiliate ───
    static async getCommissions(affiliateUserId, limit = 50) {
        const [rows] = await db.query(
            `SELECT ac.*, u.username as referred_username 
             FROM affiliate_commissions ac
             LEFT JOIN users u ON u.id = ac.referred_user_id
             WHERE ac.affiliate_user_id = $1
             ORDER BY ac.created_at DESC
             LIMIT $2`,
            [affiliateUserId, limit]
        );
        return rows;
    }

    // ─── Get affiliate stats for a user ───
    static async getStats(affiliateUserId) {
        const [referralCount] = await db.query(
            'SELECT COUNT(*) as count FROM users WHERE referred_by = $1',
            [affiliateUserId]
        );
        const [commissionStats] = await db.query(
            `SELECT 
                COUNT(*) as total_commissions,
                COALESCE(SUM(commission_amount), 0) as total_earned,
                COALESCE(SUM(CASE WHEN status = 'approved' THEN commission_amount ELSE 0 END), 0) as total_approved,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as total_paid
             FROM affiliate_commissions WHERE affiliate_user_id = $1`,
            [affiliateUserId]
        );
        const [balanceRow] = await db.query(
            'SELECT affiliate_balance FROM users WHERE id = $1',
            [affiliateUserId]
        );
        const [withdrawnRow] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total 
             FROM affiliate_withdrawals 
             WHERE user_id = $1 AND status IN ('approved', 'completed')`,
            [affiliateUserId]
        );

        return {
            total_referrals: parseInt(referralCount[0]?.count || 0),
            total_commissions: parseInt(commissionStats[0]?.total_commissions || 0),
            total_earned: parseFloat(commissionStats[0]?.total_earned || 0),
            total_approved: parseFloat(commissionStats[0]?.total_approved || 0),
            total_paid: parseFloat(commissionStats[0]?.total_paid || 0),
            current_balance: parseFloat(balanceRow[0]?.affiliate_balance || 0),
            total_withdrawn: parseFloat(withdrawnRow[0]?.total || 0)
        };
    }

    // ─── Request withdrawal ───
    static async requestWithdrawal(userId, data) {
        const { amount, bank_name, account_number, account_name } = data;
        const settings = await this.getSettings();
        
        // Check minimum
        if (amount < settings.min_withdrawal) {
            throw new Error(`Minimal penarikan Rp ${Number(settings.min_withdrawal).toLocaleString('id-ID')}`);
        }

        // Check balance
        const [userRow] = await db.query('SELECT affiliate_balance FROM users WHERE id = $1', [userId]);
        if (!userRow[0] || parseFloat(userRow[0].affiliate_balance) < amount) {
            throw new Error('Saldo affiliate tidak cukup');
        }

        // Deduct balance
        await db.query(
            'UPDATE users SET affiliate_balance = affiliate_balance - $1 WHERE id = $2',
            [amount, userId]
        );

        // Create withdrawal request
        const [rows] = await db.query(
            `INSERT INTO affiliate_withdrawals (user_id, amount, bank_name, account_number, account_name, status)
             VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
            [userId, amount, bank_name, account_number, account_name]
        );

        return rows[0];
    }

    // ─── Get user's withdrawal history ───
    static async getWithdrawals(userId) {
        const [rows] = await db.query(
            'SELECT * FROM affiliate_withdrawals WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    }

    // ─── Admin: Get all affiliate withdrawals ───
    static async getAllWithdrawals() {
        const [rows] = await db.query(
            `SELECT aw.*, u.username, u.email 
             FROM affiliate_withdrawals aw
             LEFT JOIN users u ON u.id = aw.user_id
             ORDER BY aw.created_at DESC`
        );
        return rows;
    }

    // ─── Admin: Approve withdrawal ───
    static async approveWithdrawal(id) {
        const [rows] = await db.query(
            `UPDATE affiliate_withdrawals SET status = 'approved' WHERE id = $1 AND status = 'pending' RETURNING *`,
            [id]
        );
        return rows[0] || null;
    }

    // ─── Admin: Complete withdrawal ───
    static async completeWithdrawal(id) {
        const [rows] = await db.query(
            `UPDATE affiliate_withdrawals SET status = 'completed', completed_at = NOW() WHERE id = $1 AND status = 'approved' RETURNING *`,
            [id]
        );
        return rows[0] || null;
    }

    // ─── Admin: Reject withdrawal ───
    static async rejectWithdrawal(id, reason) {
        // Get withdrawal details first
        const [wdRows] = await db.query('SELECT * FROM affiliate_withdrawals WHERE id = $1 AND status = $2', [id, 'pending']);
        if (!wdRows[0]) return null;

        // Refund balance
        await db.query(
            'UPDATE users SET affiliate_balance = affiliate_balance + $1 WHERE id = $2',
            [wdRows[0].amount, wdRows[0].user_id]
        );

        const [rows] = await db.query(
            `UPDATE affiliate_withdrawals SET status = 'rejected', rejected_reason = $1 WHERE id = $2 RETURNING *`,
            [reason, id]
        );
        return rows[0] || null;
    }

    // ─── Admin: Get all affiliates stats (overview) ───
    static async getAdminOverview() {
        const [totalAffiliates] = await db.query(
            'SELECT COUNT(*) as count FROM users WHERE affiliate_code IS NOT NULL'
        );
        const [totalReferrals] = await db.query(
            'SELECT COUNT(*) as count FROM users WHERE referred_by IS NOT NULL'
        );
        const [totalCommissions] = await db.query(
            'SELECT COALESCE(SUM(commission_amount), 0) as total FROM affiliate_commissions'
        );
        const [pendingWithdrawals] = await db.query(
            `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
             FROM affiliate_withdrawals WHERE status = 'pending'`
        );
        const [topAffiliates] = await db.query(
            `SELECT u.id, u.username, u.email, u.affiliate_code, u.affiliate_balance,
                    COUNT(DISTINCT r.id) as referral_count,
                    COALESCE(SUM(ac.commission_amount), 0) as total_earned
             FROM users u
             LEFT JOIN users r ON r.referred_by = u.id
             LEFT JOIN affiliate_commissions ac ON ac.affiliate_user_id = u.id
             WHERE u.affiliate_code IS NOT NULL
             GROUP BY u.id, u.username, u.email, u.affiliate_code, u.affiliate_balance
             ORDER BY total_earned DESC
             LIMIT 20`
        );

        return {
            total_affiliates: parseInt(totalAffiliates[0]?.count || 0),
            total_referrals: parseInt(totalReferrals[0]?.count || 0),
            total_commissions_paid: parseFloat(totalCommissions[0]?.total || 0),
            pending_withdrawals_count: parseInt(pendingWithdrawals[0]?.count || 0),
            pending_withdrawals_amount: parseFloat(pendingWithdrawals[0]?.total || 0),
            top_affiliates: topAffiliates
        };
    }
}

module.exports = Affiliate;
