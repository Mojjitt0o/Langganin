// models/Order.js
const db = require('../config/database');
const axios = require('axios');
const logger = require('../services/logger');
require('dotenv').config();

class Order {
    static async create(orderData, userId) {
        const { variant_id, quantity = 1, voucher_code, buyer_whatsapp } = orderData;

        // ── 1. Validate variant (outside transaction — read-only) ──────────
        const [variantRows] = await db.query(
            'SELECT *, COALESCE(custom_price, our_price) as sell_price FROM product_variants WHERE id = $1',
            [variant_id]
        );

        if (!variantRows || variantRows.length === 0) {
            throw new Error('Variant tidak ditemukan');
        }

        const variantData = variantRows[0];

        const originalTotal = parseFloat(variantData.original_price) * quantity;
        const sellTotal     = parseFloat(variantData.sell_price)      * quantity;

        // ── 2. Check user balance & referral (outside transaction) ─────────
        const [userRows] = await db.query(
            'SELECT balance, referred_by FROM users WHERE id = $1',
            [userId]
        );

        if (!userRows || userRows.length === 0) {
            throw new Error('User tidak ditemukan');
        }

        let discountAmount = 0;
        if (userRows[0].referred_by) {
            try {
                const Affiliate = require('./Affiliate');
                discountAmount = await Affiliate.calcDiscount(sellTotal);
            } catch (e) {
                logger.error('Referral discount calc error: ' + e.message);
            }
        }

        const chargeTotal = sellTotal - discountAmount;

        if (parseFloat(userRows[0].balance) < chargeTotal) {
            throw new Error(
                `Saldo tidak cukup. Saldo kamu: Rp ${Number(userRows[0].balance).toLocaleString('id-ID')}, ` +
                `dibutuhkan: Rp ${chargeTotal.toLocaleString('id-ID')}`
            );
        }

        // ── 3. Place order at WR API (before DB transaction — external call) 
        let apiOrder;
        try {
            const apiPayload = { api_key: process.env.WR_API_KEY, variant_id, quantity };
            if (voucher_code) apiPayload.voucher_code = voucher_code;

            const apiResponse = await axios.post(`${process.env.WR_API_URL}/order`, apiPayload, { timeout: 15000 });

            if (!apiResponse.data || !apiResponse.data.success) {
                throw new Error(apiResponse.data?.message || 'Pesanan gagal diproses. Silakan coba lagi.');
            }
            apiOrder = apiResponse.data.data;
        } catch (apiError) {
            if (apiError.response) {
                throw new Error(`Pesanan gagal diproses: ${apiError.response.data?.message || 'Silakan coba lagi'}`);
            }
            throw apiError;
        }

        // ── 4. Persist everything inside a DB transaction ─────────────────
        const client = await db.pool.connect();
        let commissionAmount = 0;
        try {
            await client.query('BEGIN');

            // Deduct user balance (with optimistic lock check)
            const balanceResult = await client.query(
                'UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING id',
                [chargeTotal, userId]
            );
            if (balanceResult.rowCount === 0) {
                throw new Error('Saldo tidak cukup atau sudah berubah. Silakan coba lagi.');
            }

            // Record affiliate commission
            if (userRows[0].referred_by) {
                try {
                    const Affiliate = require('./Affiliate');
                    const commission = await Affiliate.recordCommission(
                        userRows[0].referred_by,
                        userId,
                        apiOrder.order_id,
                        sellTotal,
                        client
                    );
                    commissionAmount = commission ? parseFloat(commission.commission_amount) : 0;
                } catch (affErr) {
                    logger.error('Affiliate commission error: ' + affErr.message);
                }
            }

            const profit = chargeTotal - originalTotal - commissionAmount;

            // Insert order
            await client.query(
                `INSERT INTO orders (order_id, user_id, variant_id, quantity, original_total, our_total, profit, status, payment_status, voucher_code, buyer_whatsapp)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    apiOrder.order_id, userId, variant_id, quantity,
                    originalTotal, sellTotal, profit,
                    apiOrder.status         || 'processing',
                    apiOrder.payment_status || 'paid',
                    voucher_code   || null,
                    buyer_whatsapp || null
                ]
            );

            // Record profit
            if (profit > 0) {
                await client.query(
                    'INSERT INTO profits (order_id, user_id, amount) VALUES ($1, $2, $3)',
                    [apiOrder.order_id, userId, profit]
                );
            }

            await client.query('COMMIT');

            // Fetch account details from WR API asynchronously (non-blocking)
            const result = {
                ...apiOrder,
                original_total:    originalTotal,
                our_total:         sellTotal,
                charge_total:      chargeTotal,
                discount_amount:   discountAmount,
                commission_amount: commissionAmount,
                profit
            };

            // Fetch and store account details in background
            (async () => {
                try {
                    const accountDetails = await Order.fetchAccountDetailsFromWR(apiOrder.order_id);
                    if (accountDetails) {
                        await Order.setAccountDetails(apiOrder.order_id, accountDetails);
                        logger.info(`Account details fetched and saved for order ${apiOrder.order_id}`);
                    }
                } catch (err) {
                    logger.error(`Failed to fetch account details for order ${apiOrder.order_id}: ${err.message}`);
                }
            })();

            return result;
        } catch (dbErr) {
            await client.query('ROLLBACK');
            logger.error(`Order DB transaction rolled back for WR order ${apiOrder?.order_id}: ${dbErr.message}`);
            throw dbErr;
        } finally {
            client.release();
        }
    }

    // Fetch account details from WR API
    static async fetchAccountDetailsFromWR(orderId) {
        try {
            const apiResponse = await axios.post(`${process.env.WR_API_URL}/order/detail`, {
                api_key: process.env.WR_API_KEY,
                order_id: orderId
            }, { timeout: 10000 });

            if (!apiResponse.data || !apiResponse.data.success) {
                logger.warn(`WR API order detail failed for ${orderId}: ${apiResponse.data?.message}`);
                return null;
            }

            const orderData = apiResponse.data.data;
            
            // Transform WR API account_details format to the format we use
            if (orderData.account_details && Array.isArray(orderData.account_details)) {
                const formatted = {};
                orderData.account_details.forEach(item => {
                    if (item.product) {
                        formatted['Produk'] = item.product;
                    }
                    if (item.details && Array.isArray(item.details)) {
                        item.details.forEach(detail => {
                            if (detail.title) {
                                if (detail.credentials && Array.isArray(detail.credentials)) {
                                    detail.credentials.forEach(cred => {
                                        if (cred.label && cred.value) {
                                            formatted[`${detail.title} - ${cred.label}`] = cred.value;
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
                return Object.keys(formatted).length > 0 ? formatted : null;
            }

            return null;
        } catch (error) {
            logger.error(`WR API call error for order detail: ${error.message}`);
            return null;
        }
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
                   u.username, u.email, u.whatsapp, o.buyer_whatsapp
            FROM orders o
            LEFT JOIN product_variants pv ON o.variant_id = pv.id
            LEFT JOIN products p ON pv.product_id = p.id
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 200
        `);
        return orders;
    }

    static async getAllOrdersPaginated(page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const [countRows] = await db.query('SELECT COUNT(*) FROM orders', []);
        const total = parseInt(countRows[0].count);
        const [orders] = await db.query(`
            SELECT o.*, p.name as product_name, pv.name as variant_name,
                   u.username, u.email, u.whatsapp, o.buyer_whatsapp
            FROM orders o
            LEFT JOIN product_variants pv ON o.variant_id = pv.id
            LEFT JOIN products p ON pv.product_id = p.id
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `);
        return { orders, total };
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