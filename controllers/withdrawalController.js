// controllers/withdrawalController.js
const db = require('../config/database');
const logger = require('../services/logger');
require('dotenv').config();

class WithdrawalController {
    // Create withdrawal request
    static async createWithdrawal(req, res) {
        try {
            const { amount, bank_name, account_number, account_name, notes } = req.body;
            const userId = req.userId;

            // Validate input
            if (!amount || amount < 50000) {
                return res.status(400).json({
                    success: false,
                    message: 'Minimum penarikan adalah Rp 50.000'
                });
            }

            if (!bank_name || !account_number || !account_name) {
                return res.status(400).json({
                    success: false,
                    message: 'Data rekening bank wajib diisi'
                });
            }

            // Get user balance
            const [userRows] = await db.query(
                'SELECT balance FROM users WHERE id = $1',
                [userId]
            );

            if (!userRows || userRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }

            const userBalance = parseFloat(userRows[0].balance);

            // Check if balance sufficient
            if (userBalance < amount) {
                return res.status(400).json({
                    success: false,
                    message: `Saldo tidak cukup. Saldo Anda: Rp ${userBalance.toLocaleString('id-ID')}`
                });
            }

            // Calculate admin fee and net amount
            const adminFeePercent = parseFloat(process.env.WITHDRAWAL_ADMIN_FEE) || 10;
            const adminFee = Math.ceil(amount * adminFeePercent / 100);
            const netAmount = amount - adminFee;

            // Deduct balance immediately (hold)
            await db.query(
                'UPDATE users SET balance = balance - $1 WHERE id = $2',
                [amount, userId]
            );

            // Create withdrawal request
            const [result] = await db.query(
                `INSERT INTO withdrawals (user_id, amount, admin_fee, net_amount, bank_name, account_number, account_name, notes, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING id`,
                [userId, amount, adminFee, netAmount, bank_name, account_number, account_name, notes || null, 'pending']
            );

            // Record transaction — type 'withdrawal' (saldo berkurang)
            await db.query(
                `INSERT INTO transactions (user_id, type, amount, description)
                 VALUES ($1, $2, $3, $4)`,
                [userId, 'withdrawal', -amount, `Penarikan dana (ID: ${result[0].id})`]
            );

            res.json({
                success: true,
                message: 'Permintaan penarikan berhasil dibuat. Menunggu persetujuan admin.',
                data: {
                    id: result[0].id,
                    amount: amount,
                    admin_fee: adminFee,
                    net_amount: netAmount
                }
            });

        } catch (error) {
            logger.error('Create withdrawal error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal membuat permintaan penarikan' });
        }
    }

    // Get user's withdrawal history
    static async getWithdrawalHistory(req, res) {
        try {
            const userId = req.userId;

            const [withdrawals] = await db.query(
                `SELECT w.*, u.username as approved_by_username
                 FROM withdrawals w
                 LEFT JOIN users u ON w.approved_by = u.id
                 WHERE w.user_id = $1
                 ORDER BY w.created_at DESC
                 LIMIT 50`,
                [userId]
            );

            res.json({
                success: true,
                data: withdrawals
            });

        } catch (error) {
            console.error('Get withdrawal history error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil riwayat penarikan'
            });
        }
    }

    // Admin: Get all withdrawal requests (with pagination)
    static async getAllWithdrawals(req, res) {
        try {
            const { status } = req.query;
            const page  = Math.max(1, parseInt(req.query.page)  || 1);
            const limit = Math.min(100, parseInt(req.query.limit) || 50);
            const offset = (page - 1) * limit;

            let baseQuery = `
                SELECT w.*, u.username, u.email, u.whatsapp,
                       approver.username as approved_by_username
                FROM withdrawals w
                LEFT JOIN users u        ON w.user_id     = u.id
                LEFT JOIN users approver ON w.approved_by = approver.id
            `;
            const params = [];
            if (status) {
                baseQuery += ` WHERE w.status = $1`;
                params.push(status);
            }

            // Count total for pagination meta
            const countQuery = `SELECT COUNT(*) FROM withdrawals` + (status ? ` WHERE status = $1` : '');
            const [countRows] = await db.query(countQuery, status ? [status] : []);
            const total = parseInt(countRows[0].count);

            baseQuery += ` ORDER BY
                CASE w.status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 ELSE 3 END,
                w.created_at DESC
                LIMIT ${limit} OFFSET ${offset}`;

            const [withdrawals] = await db.query(baseQuery, params);

            res.json({
                success: true,
                data: withdrawals,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });

        } catch (error) {
            logger.error('Get all withdrawals error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal mengambil data penarikan' });
        }
    }

    // Admin: Approve withdrawal
    static async approveWithdrawal(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.userId;

            // Get withdrawal
            const [rows] = await db.query(
                'SELECT * FROM withdrawals WHERE id = $1',
                [id]
            );

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Permintaan penarikan tidak ditemukan'
                });
            }

            const withdrawal = rows[0];

            if (withdrawal.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Permintaan penarikan sudah diproses'
                });
            }

            // Update withdrawal status
            await db.query(
                `UPDATE withdrawals 
                 SET status = $1, approved_by = $2, approved_at = NOW()
                 WHERE id = $3`,
                ['approved', adminId, id]
            );

            res.json({
                success: true,
                message: 'Permintaan penarikan disetujui. Silakan transfer ke rekening user.'
            });

        } catch (error) {
            logger.error('Approve withdrawal error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal menyetujui penarikan' });
        }
    }

    // Admin: Reject withdrawal
    static async rejectWithdrawal(req, res) {
        try {
            const { id } = req.params;
            const rejected_reason = req.body.rejected_reason || req.body.rejection_reason;
            const adminId = req.userId;

            if (!rejected_reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Alasan penolakan wajib diisi'
                });
            }

            // Get withdrawal
            const [rows] = await db.query(
                'SELECT * FROM withdrawals WHERE id = $1',
                [id]
            );

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Permintaan penarikan tidak ditemukan'
                });
            }

            const withdrawal = rows[0];

            if (withdrawal.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Permintaan penarikan sudah diproses'
                });
            }

            // Return balance to user
            await db.query(
                'UPDATE users SET balance = balance + $1 WHERE id = $2',
                [withdrawal.amount, withdrawal.user_id]
            );

            // Update withdrawal status
            await db.query(
                `UPDATE withdrawals 
                 SET status = $1, approved_by = $2, approved_at = NOW(), rejected_reason = $3
                 WHERE id = $4`,
                ['rejected', adminId, rejected_reason, id]
            );

            // Record refund transaction as 'topup' (balance returned)
            await db.query(
                `INSERT INTO transactions (user_id, type, amount, description)
                 VALUES ($1, $2, $3, $4)`,
                [withdrawal.user_id, 'topup', withdrawal.amount, `Pengembalian dana penarikan ditolak (ID: ${id})`]
            );

            res.json({ success: true, message: 'Permintaan penarikan ditolak. Saldo user dikembalikan.' });

        } catch (error) {
            logger.error('Reject withdrawal error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal menolak penarikan' });
        }
    }

    // Admin: Mark withdrawal as completed (transfer done)
    static async completeWithdrawal(req, res) {
        try {
            const { id } = req.params;

            // Get withdrawal
            const [rows] = await db.query(
                'SELECT * FROM withdrawals WHERE id = $1',
                [id]
            );

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Permintaan penarikan tidak ditemukan'
                });
            }

            const withdrawal = rows[0];

            if (withdrawal.status !== 'approved') {
                return res.status(400).json({
                    success: false,
                    message: 'Hanya permintaan yang sudah disetujui yang bisa diselesaikan'
                });
            }

            // Update withdrawal status
            await db.query(
                `UPDATE withdrawals 
                 SET status = $1, completed_at = NOW()
                 WHERE id = $2`,
                ['completed', id]
            );

            res.json({
                success: true,
                message: 'Penarikan dana ditandai sebagai selesai'
            });

        } catch (error) {
            logger.error('Complete withdrawal error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal menyelesaikan penarikan' });
        }
    }

    // Get withdrawal statistics (admin)
    static async getWithdrawalStats(req, res) {
        try {
            const [stats] = await db.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
                    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
                    COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_amount,
                    COALESCE(SUM(net_amount) FILTER (WHERE status = 'completed'), 0) as completed_amount,
                    COALESCE(SUM(admin_fee) FILTER (WHERE status = 'completed'), 0) as total_admin_fee
                FROM withdrawals
            `);

            res.json({
                success: true,
                data: stats[0]
            });

        } catch (error) {
            logger.error('Get withdrawal stats error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal mengambil statistik penarikan' });
        }
    }
}

module.exports = WithdrawalController;
