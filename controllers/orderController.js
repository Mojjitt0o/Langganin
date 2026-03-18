// controllers/orderController.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const axios = require('axios');
const logger = require('../services/logger');
const telegramBot = require('../services/telegramBot');

const orderController = {
    async createOrder(req, res) {
        try {
            const { variant_id, quantity, voucher_code, email_invite } = req.body;
            const userId = req.userId;

            // Input validation - variant_id must be provided
            if (!variant_id) {
                return res.status(400).json({ success: false, message: 'variant_id harus diisi' });
            }

            // Quantity validation
            const qty = parseInt(quantity, 10) || 1;
            if (qty < 1 || qty > 100) {
                return res.status(400).json({ success: false, message: 'Quantity harus antara 1-100' });
            }

            // Voucher code validation (optional, but if provided must be valid)
            if (voucher_code && (typeof voucher_code !== 'string' || voucher_code.trim().length === 0 || voucher_code.length > 50)) {
                return res.status(400).json({ success: false, message: 'Voucher code tidak valid' });
            }

            // Email invite validation (optional, but if provided must be valid email)
            if (email_invite && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_invite) || email_invite.length > 100)) {
                return res.status(400).json({ success: false, message: 'Email invite tidak valid' });
            }

            const order = await Order.create({ variant_id, quantity: qty, voucher_code, email_invite }, userId);

            // Notify admin via Telegram about new order
            telegramBot.logEvent(
              'New Order Created',
              `User ID: ${userId}\nEmail: ${req.userEmail || '-'}\nOrder ID: ${order.order_id}\nVariant: ${variant_id}\nQuantity: ${qty}` +
              (email_invite ? `\nEmail Invite: ${email_invite}` : '')
            );

            res.json({ success: true, message: 'Order berhasil dibuat! Tunggu konfirmasi.', data: order });
        } catch (error) {
            logger.error('Order error: ' + error.message);
            telegramBot.logEvent(
              'Order Error',
              `User ID: ${req.userId}\nError: ${error.message}`
            );

            // Expose user-facing errors (balance / variant not found), but not raw DB errors
            const safeMessages = ['Saldo tidak cukup', 'Variant tidak ditemukan', 'User tidak ditemukan', 'Pesanan gagal diproses'];
            const isSafe = safeMessages.some(m => error.message.startsWith(m));
            res.status(isSafe ? 400 : 500).json({
                success: false,
                message: isSafe ? error.message : 'Gagal membuat order. Silakan coba lagi.'
            });
        }
    },

    async getUserOrders(req, res) {
        try {
            const orders = await Order.getUserOrders(req.userId);
            res.json({ success: true, message: 'Orders fetched successfully', data: orders });
        } catch (error) {
            logger.error('getUserOrders error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal mengambil riwayat order.' });
        }
    },

    // Cek saldo akun Warung Rebahan kita (modal)
    async getWRBalance(req, res) {
        try {
            const response = await axios.post(`${process.env.WR_API_URL}/balance`, {
                api_key: process.env.WR_API_KEY
            }, { timeout: 10000 });
            res.json(response.data);
        } catch (error) {
            logger.error('getWRBalance error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal cek saldo WR.' });
        }
    },

    // Dashboard profit total web (admin only) with pagination
    async getProfitSummary(req, res) {
        try {
            const page  = Math.max(1, parseInt(req.query.page)  || 1);
            const limit = Math.min(200, parseInt(req.query.limit) || 50);

            const totalProfit = await Order.getTotalProfit();
            const { orders, total } = await Order.getAllOrdersPaginated(page, limit);

            const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.our_total      || 0), 0);
            const totalModal   = orders.reduce((sum, o) => sum + parseFloat(o.original_total || 0), 0);
            const successOrders = orders.filter(o => ['success','completed','done'].includes(o.status)).length;

            res.json({
                success: true,
                data: {
                    total_profit:   totalProfit,
                    total_revenue:  totalRevenue,
                    total_modal:    totalModal,
                    total_orders:   total,
                    success_orders: successOrders,
                    orders
                },
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (error) {
            logger.error('getProfitSummary error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal mengambil data profit.' });
        }
    },

    // Admin: complete order with account details
    async completeOrder(req, res) {
        try {
            const { order_id } = req.params;
            const { account_details } = req.body;

            if (!account_details || typeof account_details !== 'object') {
                return res.status(400).json({ success: false, message: 'account_details (objek) wajib diisi' });
            }

            const order = await Order.completeOrder(order_id, account_details);
            if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });

            res.json({ success: true, message: 'Order berhasil diselesaikan & info akun tersimpan.', data: order });
        } catch (error) {
            logger.error('completeOrder error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal menyelesaikan order.' });
        }
    },

    // Admin: update order status only
    async updateOrderStatus(req, res) {
        try {
            const { order_id } = req.params;
            const { status } = req.body;
            const allowed = ['processing', 'success', 'completed', 'done', 'failed', 'cancelled'];
            if (!allowed.includes(status)) {
                return res.status(400).json({ success: false, message: 'Status tidak valid' });
            }

            const order = await Order.updateStatus(order_id, status);
            if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });

            res.json({ success: true, message: `Status diubah ke ${status}`, data: order });
        } catch (error) {
            logger.error('updateOrderStatus error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal mengubah status order.' });
        }
    },

    // Admin: get single order detail
    async getOrderDetail(req, res) {
        try {
            const order = await Order.getOrderById(req.params.order_id);
            if (!order) return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
            res.json({ success: true, data: order });
        } catch (error) {
            logger.error('getOrderDetail error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal mengambil detail order.' });
        }
    },

    // Get or fetch account details for an order
    async getAccountDetails(req, res) {
        try {
            const { order_id } = req.params;
            
            const order = await Order.getOrderById(order_id);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
            }

            // Check if user owns this order (unless admin)
            if (!req.isAdmin && order.user_id !== req.userId) {
                return res.status(403).json({ success: false, message: 'Akses ditolak' });
            }

            // If account details already exist, return them
            if (order.account_details) {
                logger.info(`✅ Account details found in DB for ${order_id}`);
                const details = typeof order.account_details === 'string' 
                    ? JSON.parse(order.account_details) 
                    : order.account_details;
                return res.json({ success: true, data: details });
            }

            // Otherwise, try to fetch from WR API
            logger.info(`🔄 Fetching account details from WR API for ${order_id}`);
            const accountDetails = await Order.fetchAccountDetailsFromWR(order_id);
            if (accountDetails) {
                // Save for future use
                logger.info(`💾 Saving account details for ${order_id}`);
                await Order.setAccountDetails(order_id, accountDetails);
                logger.info(`✅ Account details saved for ${order_id}`);
                return res.json({ success: true, data: accountDetails });
            }

            logger.warn(`⚠️ Account details not available for ${order_id}`);
            res.json({ success: false, message: 'Detail akun belum tersedia', data: null });
        } catch (error) {
            logger.error('getAccountDetails error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal mengambil detail akun.' });
        }
    },

    async saveAccountDetails(req, res) {
        try {
            const { order_id } = req.params;
            const { account_details } = req.body;

            if (!account_details || typeof account_details !== 'object' || Object.keys(account_details).length === 0) {
                return res.status(400).json({ success: false, message: 'account_details tidak valid' });
            }

            const order = await Order.getOrderById(order_id);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
            }

            logger.info(`💾 Admin saving account details for ${order_id}`);
            await Order.setAccountDetails(order_id, account_details);
            logger.info(`✅ Account details manually saved for ${order_id}`);

            telegramBot.logEvent(
                'Account Details Saved',
                `Order ID: ${order_id}\nSaved by: ${req.userEmail || req.userId}\nDetails: ${Object.keys(account_details).length} fields`
            );

            res.json({ success: true, message: 'Account details berhasil disimpan', data: account_details });
        } catch (error) {
            logger.error('saveAccountDetails error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal menyimpan account details.' });
        }
    },

    // Admin trigger: fetch account details dari WR API + auto-update order status ke "completed"
    async fetchFromWR(req, res) {
        try {
            if (!req.isAdmin) {
                return res.status(403).json({ success: false, message: 'Hanya admin yang dapat fetch dari WR' });
            }

            const { order_id } = req.params;
            const order = await Order.getOrderById(order_id);

            if (!order) {
                return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
            }

            logger.info(`🔄 Admin requesting fetch from WR for ${order_id}`);

            // Fetch dari WR API
            const accountDetails = await Order.fetchAccountDetailsFromWR(order_id);

            if (!accountDetails) {
                logger.warn(`⚠️ WR API still tidak punya detail untuk ${order_id}`);
                return res.status(202).json({ 
                    success: false, 
                    message: 'Detail akun belum tersedia di WR API. Coba lagi nanti.',
                    data: null 
                });
            }

            // Simpan account details
            logger.info(`💾 Saving account details for ${order_id}`);
            await Order.setAccountDetails(order_id, accountDetails);

            // Update order status ke "completed"
            logger.info(`📤 Updating order ${order_id} status to "completed"`);
            const db = require('../config/database');
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE orders SET status = ? WHERE order_id = ?',
                    ['completed', order_id],
                    function(err) {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });

            logger.info(`✅ Order ${order_id} fetch & status update completed`);

            telegramBot.logEvent(
                '✅ Order Completed (Admin Fetch)',
                `Order ID: ${order_id}\nTriggered by: ${req.userEmail || req.userId}\nAccount Details: ${Object.keys(accountDetails).length} fields`
            );

            res.json({ 
                success: true, 
                message: 'Detail akun berhasil di-fetch dari WR. Status order diubah menjadi "completed".', 
                data: accountDetails 
            });
        } catch (error) {
            logger.error('fetchFromWR error: ' + error.message);
            res.status(500).json({ success: false, message: 'Gagal fetch dari WR API.' });
        }
    }
};

module.exports = orderController;
