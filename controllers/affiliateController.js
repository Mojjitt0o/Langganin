// controllers/affiliateController.js
const Affiliate = require('../models/Affiliate');

const affiliateController = {
    // ─── User: Get affiliate dashboard info ───
    async getDashboard(req, res) {
        try {
            const info = await Affiliate.getInfo(req.userId);
            if (!info) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

            const settings = await Affiliate.getSettings();
            const stats = info.affiliate_code ? await Affiliate.getStats(req.userId) : null;

            res.json({
                success: true,
                data: {
                    affiliate_code: info.affiliate_code,
                    affiliate_balance: parseFloat(info.affiliate_balance || 0),
                    settings: {
                        commission_type: settings.commission_type,
                        commission_value: parseFloat(settings.commission_value),
                        min_withdrawal: parseFloat(settings.min_withdrawal),
                        is_active: settings.is_active
                    },
                    stats
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ─── User: Activate affiliate (get referral code) ───
    async activate(req, res) {
        try {
            const settings = await Affiliate.getSettings();
            if (!settings.is_active) {
                return res.status(400).json({ success: false, message: 'Program affiliate sedang tidak aktif' });
            }

            const code = await Affiliate.activate(req.userId);
            res.json({
                success: true,
                message: 'Affiliate berhasil diaktifkan!',
                data: { affiliate_code: code }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ─── User: Get referrals list ───
    async getReferrals(req, res) {
        try {
            const referrals = await Affiliate.getReferrals(req.userId);
            res.json({ success: true, data: referrals });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ─── User: Get commission history ───
    async getCommissions(req, res) {
        try {
            const commissions = await Affiliate.getCommissions(req.userId);
            res.json({ success: true, data: commissions });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ─── User: Request withdrawal ───
    async requestWithdrawal(req, res) {
        try {
            const { amount, bank_name, account_number, account_name } = req.body;

            if (!amount || !bank_name || !account_number || !account_name) {
                return res.status(400).json({ success: false, message: 'Semua field harus diisi' });
            }

            if (parseFloat(amount) <= 0) {
                return res.status(400).json({ success: false, message: 'Jumlah harus lebih dari 0' });
            }

            const withdrawal = await Affiliate.requestWithdrawal(req.userId, {
                amount: parseFloat(amount),
                bank_name: String(bank_name).trim(),
                account_number: String(account_number).trim(),
                account_name: String(account_name).trim()
            });

            res.json({
                success: true,
                message: 'Permintaan penarikan berhasil dikirim',
                data: withdrawal
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ─── User: Get withdrawal history ───
    async getWithdrawals(req, res) {
        try {
            const withdrawals = await Affiliate.getWithdrawals(req.userId);
            res.json({ success: true, data: withdrawals });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ─── Get affiliate settings (public) ───
    async getSettings(req, res) {
        try {
            const settings = await Affiliate.getSettings();
            res.json({
                success: true,
                data: {
                    commission_type: settings.commission_type,
                    commission_value: parseFloat(settings.commission_value),
                    min_withdrawal: parseFloat(settings.min_withdrawal),
                    cookie_days: settings.cookie_days,
                    is_active: settings.is_active,
                    referral_discount_type: settings.referral_discount_type || 'percentage',
                    referral_discount_value: parseFloat(settings.referral_discount_value) || 0
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ═══ ADMIN ENDPOINTS ═══

    // ─── Admin: Get overview ───
    async adminOverview(req, res) {
        try {
            const overview = await Affiliate.getAdminOverview();
            const settings = await Affiliate.getSettings();
            res.json({
                success: true,
                data: { ...overview, settings }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ─── Admin: Update settings ───
    async adminUpdateSettings(req, res) {
        try {
            const { commission_type, commission_value, min_withdrawal, cookie_days, is_active, referral_discount_type, referral_discount_value } = req.body;

            if (!['percentage', 'fixed'].includes(commission_type)) {
                return res.status(400).json({ success: false, message: 'Tipe komisi harus percentage atau fixed' });
            }
            if (parseFloat(commission_value) < 0) {
                return res.status(400).json({ success: false, message: 'Nilai komisi tidak boleh negatif' });
            }
            if (!['percentage', 'fixed'].includes(referral_discount_type || 'percentage')) {
                return res.status(400).json({ success: false, message: 'Tipe diskon harus percentage atau fixed' });
            }

            const updated = await Affiliate.updateSettings({
                commission_type,
                commission_value: parseFloat(commission_value),
                min_withdrawal: parseFloat(min_withdrawal) || 10000,
                cookie_days: parseInt(cookie_days) || 30,
                is_active: is_active !== false,
                referral_discount_type: referral_discount_type || 'percentage',
                referral_discount_value: parseFloat(referral_discount_value) || 0
            });

            res.json({
                success: true,
                message: 'Pengaturan affiliate berhasil diperbarui',
                data: updated
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ─── Admin: Get all affiliate withdrawals ───
    async adminGetWithdrawals(req, res) {
        try {
            const withdrawals = await Affiliate.getAllWithdrawals();
            res.json({ success: true, data: withdrawals });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ─── Admin: Approve withdrawal ───
    async adminApproveWithdrawal(req, res) {
        try {
            const result = await Affiliate.approveWithdrawal(parseInt(req.params.id));
            if (!result) return res.status(404).json({ success: false, message: 'Withdrawal tidak ditemukan atau sudah diproses' });
            res.json({ success: true, message: 'Withdrawal diapprove', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ─── Admin: Complete withdrawal ───
    async adminCompleteWithdrawal(req, res) {
        try {
            const result = await Affiliate.completeWithdrawal(parseInt(req.params.id));
            if (!result) return res.status(404).json({ success: false, message: 'Withdrawal tidak ditemukan atau belum diapprove' });
            res.json({ success: true, message: 'Withdrawal selesai', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ─── Admin: Reject withdrawal ───
    async adminRejectWithdrawal(req, res) {
        try {
            const { rejection_reason } = req.body;
            if (!rejection_reason) return res.status(400).json({ success: false, message: 'Alasan penolakan harus diisi' });

            const result = await Affiliate.rejectWithdrawal(parseInt(req.params.id), rejection_reason);
            if (!result) return res.status(404).json({ success: false, message: 'Withdrawal tidak ditemukan atau sudah diproses' });
            res.json({ success: true, message: 'Withdrawal ditolak, saldo dikembalikan', data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ─── Public: Check if affiliate code exists ───
    async checkCode(req, res) {
        try {
            const code = String(req.params.code || '').trim().toUpperCase();
            if (!code) return res.json({ success: false, found: false });
            const referrer = await Affiliate.findByCode(code);
            if (referrer) {
                const settings = await Affiliate.getSettings();
                const discountVal = parseFloat(settings.referral_discount_value) || 0;
                res.json({
                    success: true,
                    found: true,
                    username: referrer.username,
                    discount_type: settings.referral_discount_type || 'percentage',
                    discount_value: discountVal
                });
            } else {
                res.json({ success: true, found: false });
            }
        } catch (error) {
            res.status(500).json({ success: false, found: false, message: error.message });
        }
    }
};

module.exports = affiliateController;
