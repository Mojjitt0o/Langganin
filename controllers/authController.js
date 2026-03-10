// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authController = {
    async register(req, res) {
        try {
            const { username, email, password, whatsapp, ref } = req.body;

            // Check if user exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered'
                });
            }

            // Normalise WA number
            let wa = whatsapp ? String(whatsapp).replace(/\D/g, '') : null;
            if (wa) {
                if (wa.startsWith('0')) wa = '62' + wa.slice(1);
                if (!wa.startsWith('62')) wa = '62' + wa;
            }

            // Create user
            const userId = await User.create({ username, email, password, whatsapp: wa });

            // Handle affiliate referral
            if (ref) {
                try {
                    const Affiliate = require('../models/Affiliate');
                    const referrer = await Affiliate.findByCode(String(ref).trim());
                    if (referrer && referrer.id !== userId) {
                        await Affiliate.setReferrer(userId, referrer.id);
                    }
                } catch (affErr) {
                    console.error('Affiliate referral error:', affErr.message);
                }
            }

            // Generate token
            const token = jwt.sign(
                { id: userId, email },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.status(201).json({
                success: true,
                message: 'Registration successful',
                data: { token, userId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Find user
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Generate token
            const token = jwt.sign(
                { id: user.id, email: user.email, is_admin: user.is_admin },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Set session
            req.session.userId = user.id;
            req.session.userEmail = user.email;

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        balance: user.balance,
                        is_admin: user.is_admin
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async logout(req, res) {
        req.session.destroy();
        res.json({
            success: true,
            message: 'Logout successful'
        });
    },

    async getProfile(req, res) {
        try {
            const user = await User.findById(req.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async topup(req, res) {
        try {
            const { amount } = req.body;
            const userId = req.userId;

            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount'
                });
            }

            await User.updateBalance(userId, amount);

            // Record transaction
            const db = require('../config/database');
            await db.query(
                `INSERT INTO transactions (user_id, type, amount, description) 
                 VALUES ($1, 'topup', $2, $3)`,
                [userId, amount, 'Top up saldo']
            );

            res.json({
                success: true,
                message: 'Top up successful',
                data: { amount }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getProfitSummary(req, res) {
        try {
            const Profit = require('../models/Profit');
            const total = await Profit.getTotalProfit(req.userId);
            const history = await Profit.getProfitHistory(req.userId);

            res.json({
                success: true,
                data: { total, history }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Admin only — list all users
    async listUsers(req, res) {
        try {
            const users = await User.findAll();
            res.json({ success: true, data: users });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Admin only — set/unset admin role
    async setAdmin(req, res) {
        try {
            const targetId = parseInt(req.params.id);
            const { is_admin } = req.body;

            if (targetId === req.userId) {
                return res.status(400).json({ success: false, message: 'Tidak bisa mengubah role akun sendiri' });
            }

            const updated = await User.setAdmin(targetId, !!is_admin);
            if (!updated) {
                return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
            }

            res.json({
                success: true,
                message: `User ${updated.username} sekarang ${updated.is_admin ? 'Admin' : 'User biasa'}`,
                data: updated
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Update profil sendiri (nomor WA, dll)
    async updateProfile(req, res) {
        try {
            const { whatsapp } = req.body;
            // Normalise: strip non-digit, pastikan prefix 62
            let wa = whatsapp ? String(whatsapp).replace(/\D/g, '') : null;
            if (wa) {
                if (wa.startsWith('0')) wa = '62' + wa.slice(1);
                if (!wa.startsWith('62')) wa = '62' + wa;
            }
            const updated = await User.updateWhatsapp(req.userId, wa);
            res.json({ success: true, message: 'Profil berhasil diperbarui', data: updated });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Admin only: ambil nomor WA user tertentu (untuk kirim WA)
    async getUserWhatsapp(req, res) {
        try {
            const targetId = parseInt(req.params.id);
            const user = await User.findById(targetId);
            if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
            res.json({ success: true, data: { id: user.id, username: user.username, email: user.email, whatsapp: user.whatsapp } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ─── Forgot Password: buat token & kirim link via Telegram bot ───
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ success: false, message: 'Email harus diisi' });

            const user = await User.findByEmail(email.toLowerCase().trim());
            // Selalu return success untuk keamanan (jangan beri tahu apakah email terdaftar)
            if (!user) {
                return res.json({ success: true, message: 'Jika email terdaftar, link reset akan dikirim ke bot Telegram.' });
            }

            const db = require('../config/database');
            const crypto = require('crypto');

            // Hapus token lama yang belum dipakai
            await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used = FALSE', [user.id]);

            // Buat token baru (1 jam)
            const token = crypto.randomBytes(48).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
            await db.query(
                'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
                [user.id, token, expiresAt]
            );

            const appUrl = process.env.APP_URL || 'https://www.langganin.my.id';
            const resetLink = `${appUrl}/reset-password?token=${token}`;

            // Kirim via Telegram bot ke admin (admin forward ke user, atau jika user sudah chat bot)
            const telegramBot = require('../services/telegramBot');
            const msgText =
                `🔐 <b>Permintaan Reset Password</b>\n\n` +
                `👤 <b>User:</b> ${user.username}\n` +
                `📧 <b>Email:</b> ${user.email}\n\n` +
                `Klik link berikut untuk reset password (berlaku 1 jam):\n` +
                `<a href="${resetLink}">${resetLink}</a>\n\n` +
                `⚠️ Jika kamu tidak meminta ini, abaikan pesan ini.`;

            // Kirim notifikasi ke admin; jika user pernah chat bot, bot flow (/lupapassword) lebih dianjurkan
            await telegramBot.sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, msgText, { disable_web_page_preview: true });

            res.json({ success: true, message: 'Jika email terdaftar, link reset akan dikirim ke bot Telegram.' });
        } catch (error) {
            console.error('forgotPassword error:', error.message);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan, coba lagi.' });
        }
    },

    // ─── Reset Password: validasi token & update password ───
    async resetPassword(req, res) {
        try {
            const { token, password } = req.body;
            if (!token || !password) return res.status(400).json({ success: false, message: 'Token dan password harus diisi' });
            if (password.length < 6) return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });

            const db = require('../config/database');
            const [rows] = await db.query(
                `SELECT prt.*, u.username
                 FROM password_reset_tokens prt
                 JOIN users u ON u.id = prt.user_id
                 WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > NOW()`,
                [token]
            );

            if (!rows || rows.length === 0) {
                return res.status(400).json({ success: false, message: 'Link reset tidak valid atau sudah kedaluwarsa.' });
            }

            const resetData = rows[0];
            const hashed = await bcrypt.hash(password, 10);

            await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, resetData.user_id]);
            await db.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetData.id]);

            // Kirim konfirmasi ke user (via bot jika pakai /lupapassword) dan ke admin
            const telegramBot = require('../services/telegramBot');
            await telegramBot.notifyPasswordResetSuccess(resetData.user_id, resetData.username);

            res.json({ success: true, message: 'Password berhasil direset! Silakan login.' });
        } catch (error) {
            console.error('resetPassword error:', error.message);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan, coba lagi.' });
        }
    },

    // ─── Validate reset token (untuk cek sebelum tampil form) ───
    async validateResetToken(req, res) {
        try {
            const { token } = req.params;
            const db = require('../config/database');
            const [rows] = await db.query(
                'SELECT id FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
                [token]
            );
            if (!rows || rows.length === 0) {
                return res.json({ success: false, valid: false });
            }
            res.json({ success: true, valid: true });
        } catch (error) {
            res.status(500).json({ success: false, valid: false });
        }
    }
};

module.exports = authController;