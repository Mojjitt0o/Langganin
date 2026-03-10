// models/Order.js
const db = require('../config/database');
const axios = require('axios');
require('dotenv').config();

class Order {
    static async create(orderData, userId) {
        const { variant_id, quantity = 1, voucher_code, buyer_whatsapp } = orderData;
        
        // Get variant details — sell_price = custom_price ?? our_price (harga jual ke user)
        const [variantRows] = await db.query(
            'SELECT *, COALESCE(custom_price, our_price) as sell_price FROM product_variants WHERE id = $1',
            [variant_id]
        );
        
        if (!variantRows || variantRows.length === 0) {
            throw new Error('Variant tidak ditemukan');
        }

        const variantData = variantRows[0];

        // Hitung harga
        const originalTotal = parseFloat(variantData.original_price) * quantity; // harga modal (dibayar ke WR)
        const sellTotal = parseFloat(variantData.sell_price) * quantity;         // harga jual ke user

        // Check user balance & referral discount
        const [userRows] = await db.query(
            'SELECT balance, referred_by FROM users WHERE id = $1',
            [userId]
        );

        if (!userRows || userRows.length === 0) {
            throw new Error('User tidak ditemukan');
        }

        // Apply referral discount jika user didaftarkan via kode referral
        let discountAmount = 0;
        if (userRows[0].referred_by) {
            try {
                const Affiliate = require('./Affiliate');
                discountAmount = await Affiliate.calcDiscount(sellTotal);
            } catch (e) {
                console.error('Referral discount calc error:', e.message);
            }
        }
        const chargeTotal = sellTotal - discountAmount; // yang benar-benar dipotong dari saldo

        if (parseFloat(userRows[0].balance) < chargeTotal) {
            throw new Error(`Saldo tidak cukup. Saldo kamu: Rp ${Number(userRows[0].balance).toLocaleString('id-ID')}, dibutuhkan: Rp ${chargeTotal.toLocaleString('id-ID')}`);
        }

        // =====================================================
        // ORDER KE WARUNG REBAHAN API (pakai harga modal WR)
        // Saldo akun WR kita yang berkurang sebesar original_price
        // =====================================================
        let apiOrder;
        try {
            const apiPayload = {
                api_key: process.env.WR_API_KEY,
                variant_id: variant_id,
                quantity: quantity
            };
            if (voucher_code) apiPayload.voucher_code = voucher_code;

            const apiResponse = await axios.post(`${process.env.WR_API_URL}/order`, apiPayload, {
                timeout: 15000
            });

            if (!apiResponse.data || !apiResponse.data.success) {
                const errMsg = apiResponse.data?.message || 'Order ke supplier gagal';
                throw new Error(errMsg);
            }

            apiOrder = apiResponse.data.data;
        } catch (apiError) {
            // Jika error bukan dari response, lempar pesan aslinya
            if (apiError.response) {
                throw new Error(`Supplier error: ${apiError.response.data?.message || apiError.response.statusText}`);
            }
            throw apiError;
        }

        // =====================================================
        // Potong saldo user (harga jual setelah diskon)
        // =====================================================
        await db.query(
            'UPDATE users SET balance = balance - $1 WHERE id = $2',
            [chargeTotal, userId]
        );

        // =====================================================
        // Affiliate commission: catat dulu agar bisa masuk hitungan profit
        // Komisi dihitung dari harga jual penuh (sebelum diskon pembeli)
        // =====================================================
        let commissionAmount = 0;
        try {
            if (userRows[0].referred_by) {
                const Affiliate = require('./Affiliate');
                const commission = await Affiliate.recordCommission(
                    userRows[0].referred_by,
                    userId,
                    apiOrder.order_id,
                    sellTotal
                );
                commissionAmount = commission ? parseFloat(commission.commission_amount) : 0;
            }
        } catch (affErr) {
            console.error('Affiliate commission error:', affErr.message);
        }

        // Profit bersih = pendapatan user (setelah diskon) - modal ke WR - komisi ke affiliate
        const profit = chargeTotal - originalTotal - commissionAmount;

        // =====================================================
        // Simpan order ke DB kita
        // =====================================================
        await db.query(
            `INSERT INTO orders (order_id, user_id, variant_id, quantity, original_total, our_total, profit, status, payment_status, voucher_code, buyer_whatsapp) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                apiOrder.order_id,
                userId,
                variant_id,
                quantity,
                originalTotal,   // harga modal WR
                sellTotal,        // harga jual ke user (our_total)
                profit,           // profit bersih setelah diskon & komisi
                apiOrder.status || 'processing',
                apiOrder.payment_status || 'paid',
                voucher_code || null,
                buyer_whatsapp || null
            ]
        );

        // =====================================================
        // Catat profit bersih (setelah diskon referral dan komisi affiliate)
        // =====================================================
        if (profit > 0) {
            await db.query(
                'INSERT INTO profits (order_id, user_id, amount) VALUES ($1, $2, $3)',
                [apiOrder.order_id, userId, profit]
            );
        }

        return {
            ...apiOrder,
            original_total: originalTotal,
            our_total: sellTotal,
            charge_total: chargeTotal,
            discount_amount: discountAmount,
            commission_amount: commissionAmount,
            profit: profit
        };
    }

    static async getUserOrders(userId) {
        const [orders] = await db.query(`
            SELECT o.*, p.name as product_name, pv.name as variant_name,
                   pv.original_price, pv.our_price,
                   u.username, u.email, u.whatsapp,
                   o.buyer_whatsapp
            FROM orders o
            LEFT JOIN product_variants pv ON o.variant_id = pv.id
            LEFT JOIN products p ON pv.product_id = p.id
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.user_id = $1
            ORDER BY o.created_at DESC
            LIMIT 50
        `, [userId]);

        return orders;
    }

    static async getAllOrders() {
        const [orders] = await db.query(`
            SELECT o.*, p.name as product_name, pv.name as variant_name,
                   u.username, u.email, u.whatsapp,
                   o.buyer_whatsapp
            FROM orders o
            LEFT JOIN product_variants pv ON o.variant_id = pv.id
            LEFT JOIN products p ON pv.product_id = p.id
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 200
        `);
        return orders;
    }

    static async getTotalProfit() {
        const [rows] = await db.query(
            'SELECT COALESCE(SUM(profit), 0) as total FROM orders WHERE status != $1',
            ['failed']
        );
        return parseFloat(rows[0]?.total || 0);
    }

    static async updateFromWebhook(event, data) {
        const { order_id, status } = data;
        
        await db.query(
            'UPDATE orders SET status = $1 WHERE order_id = $2',
            [status, order_id]
        );

        return true;
    }

    static async updateStatus(orderId, status) {
        const [rows] = await db.query(
            'UPDATE orders SET status = $1 WHERE order_id = $2 RETURNING *',
            [status, orderId]
        );
        return rows[0] || null;
    }

    static async setAccountDetails(orderId, accountDetails) {
        const [rows] = await db.query(
            'UPDATE orders SET account_details = $1 WHERE order_id = $2 RETURNING *',
            [JSON.stringify(accountDetails), orderId]
        );
        return rows[0] || null;
    }

    static async completeOrder(orderId, accountDetails) {
        const [rows] = await db.query(
            `UPDATE orders SET status = 'done', account_details = $1 WHERE order_id = $2 RETURNING *`,
            [JSON.stringify(accountDetails), orderId]
        );
        return rows[0] || null;
    }

    static async getOrderById(orderId) {
        const [rows] = await db.query(`
            SELECT o.*, p.name as product_name, pv.name as variant_name,
                   u.username, u.email, u.whatsapp,
                   o.buyer_whatsapp
            FROM orders o
            LEFT JOIN product_variants pv ON o.variant_id = pv.id
            LEFT JOIN products p ON pv.product_id = p.id
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.order_id = $1
        `, [orderId]);
        return rows[0] || null;
    }
}

module.exports = Order;