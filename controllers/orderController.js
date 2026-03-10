// controllers/orderController.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const axios = require('axios');

const orderController = {
    async createOrder(req, res) {
        try {
            const { variant_id, quantity, voucher_code } = req.body;
            const userId = req.userId;

            if (!variant_id) {
                return res.status(400).json({
                    success: false,
                    message: 'variant_id harus diisi'
                });
            }

            const qty = parseInt(quantity) || 1;
            if (qty < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Quantity minimal 1'
                });
            }

            const order = await Order.create({
                variant_id,
                quantity: qty,
                voucher_code
            }, userId);

            res.json({
                success: true,
                message: 'Order berhasil dibuat! Tunggu konfirmasi.',
                data: order
            });
        } catch (error) {
            console.error('Order error:', error.message);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    async getUserOrders(req, res) {
        try {
            const orders = await Order.getUserOrders(req.userId);

            res.json({
                success: true,
                message: 'Orders fetched successfully',
                data: orders
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
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
            res.status(500).json({
                success: false,
                message: `Gagal cek saldo WR: ${error.message}`
            });
        }
    },

    // Dashboard profit total web (admin only)
    async getProfitSummary(req, res) {
        try {
            const totalProfit = await Order.getTotalProfit();
            const allOrders = await Order.getAllOrders();

            // Hitung statistik
            const totalRevenue = allOrders.reduce((sum, o) => sum + parseFloat(o.our_total || 0), 0);
            const totalModal = allOrders.reduce((sum, o) => sum + parseFloat(o.original_total || 0), 0);
            const successOrders = allOrders.filter(o => o.status === 'success' || o.status === 'completed' || o.status === 'done').length;

            res.json({
                success: true,
                data: {
                    total_profit: totalProfit,
                    total_revenue: totalRevenue,
                    total_modal: totalModal,
                    total_orders: allOrders.length,
                    success_orders: successOrders,
                    orders: allOrders.slice(0, 50)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Admin: complete order with account details
    async completeOrder(req, res) {
        try {
            const { order_id } = req.params;
            const { account_details } = req.body;

            if (!account_details || typeof account_details !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: 'account_details (objek) wajib diisi'
                });
            }

            const order = await Order.completeOrder(order_id, account_details);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
            }

            res.json({
                success: true,
                message: 'Order berhasil diselesaikan & info akun tersimpan.',
                data: order
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
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
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
            }

            res.json({ success: true, message: `Status diubah ke ${status}`, data: order });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Admin: get single order detail
    async getOrderDetail(req, res) {
        try {
            const order = await Order.getOrderById(req.params.order_id);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
            }
            res.json({ success: true, data: order });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = orderController;