// models/Order.js
const db = require('../config/database');
const axios = require('axios');
const logger = require('../services/logger');
const telegramBot = require('../services/telegramBot');
require('dotenv').config();

class Order {
    static async create(orderData, userId) {
        const { variant_id, quantity = 1, voucher_code, buyer_whatsapp, email_invite } = orderData;

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
            if (email_invite) apiPayload.email_invite = email_invite;

            const apiResponse = await axios.post(`${process.env.WR_API_URL}/order`, apiPayload, { timeout: 15000 });

            if (!apiResponse.data || !apiResponse.data.success) {
                throw new Error(apiResponse.data?.message || 'Pesanan gagal diproses. Silakan coba lagi.');
            }
            apiOrder = apiResponse.data.data;
        } catch (apiError) {
            const msg = apiError.response?.data?.message || apiError.message || 'Unknown error';
            telegramBot.logEvent(
              'WR Order Create Failed',
              `User ID: ${userId}\nVariant: ${variant_id}\nError: ${msg}`
            );

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

            // Fetch account details in background with lock to prevent race conditions
            // Lock prevents concurrent updates from webhook or background task
            const lockManager = require('../services/lockManager');
            (async () => {
                // Acquire lock to prevent race conditions with webhook/background task
                if (!lockManager.acquireLock(apiOrder.order_id)) {
                    logger.debug(`[BG IIFE] ⏳ Order ${apiOrder.order_id} already locked, skipping IIFE fetch (will use background task)`);
                    return; // Background task or webhook already processing this
                }

                try {
                    logger.info(`[BG IIFE] Starting account detail fetch for order ${apiOrder.order_id}...`);
                    
                    const accountDetails = await Order.fetchAccountDetailsWithRetry(
                        apiOrder.order_id, 
                        { maxAttempts: 10, intervalMs: 15000 }
                    );
                    
                    if (accountDetails) {
                        logger.info(`[BG IIFE ✅] Saving fetched account details for ${apiOrder.order_id}`);
                        
                        // Fetch order data with user/product info for email notification
                        const [orderRows] = await db.query(
                            `SELECT o.*, u.email, u.username, p.name as product_name
                             FROM orders o
                             LEFT JOIN users u ON o.user_id = u.id
                             LEFT JOIN product_variants pv ON o.variant_id = pv.id
                             LEFT JOIN products p ON pv.product_id = p.id
                             WHERE o.order_id = $1`,
                            [apiOrder.order_id]
                        );
                        
                        const completedOrder = await Order.completeOrder(
                            apiOrder.order_id, 
                            accountDetails,
                            orderRows?.[0] // Pass order data with user info
                        );
                        logger.info(`[BG IIFE ✅] Order ${apiOrder.order_id} marked as completed with account details`);

                        // Send to Telegram admin log
                        telegramBot.logEvent(
                            '✅ Order Completed (Auto Account Details)',
                            `Order ID: ${apiOrder.order_id}\n` +
                            `User: ${orderRows?.[0]?.username}\n` +
                            `Status: ${completedOrder?.status}\n` +
                            `✅ Details tampil di halaman Pesanan`
                        );
                    } else {
                        logger.warn(`[BG IIFE ⚠️] Could not auto-fetch account details for ${apiOrder.order_id} - will retry via background task`);
                        telegramBot.logEvent(
                            '⚠️ Order Created - Waiting for Account Details',
                            `Order ID: ${apiOrder.order_id}\nUser ID: ${userId}\n\n⏳ Account details not ready from WR API yet.\nWill retry automatically every 20 seconds.`
                        );
                    }
                } catch (err) {
                    logger.error(`[BG IIFE ❌] Fatal error fetching account details for ${apiOrder.order_id}: ${err.message}`);
                    telegramBot.logEvent(
                        '❌ BG IIFE Fatal Error',
                        `Order ID: ${apiOrder.order_id}\nError: ${err.message}\n\nContact support or check server logs.`
                    );
                } finally {
                    // Always release lock
                    lockManager.releaseLock(apiOrder.order_id);
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

    // Fetch account details from WR API (single call)
    static async fetchAccountDetailsFromWR(orderId) {
        const startTime = Date.now();
        try {
            logger.debug(`[WR API] Starting fetch for order ${orderId}...`);
            
            // Use /transactions endpoint to get all orders and find the matching one
            const apiResponse = await axios.post(`${process.env.WR_API_URL}/transactions`, {
                api_key: process.env.WR_API_KEY
            }, { timeout: 25000 }); // Increased from 10s to 25s

            const duration = Date.now() - startTime;
            
            if (!apiResponse.data || !apiResponse.data.success) {
                const msg = apiResponse.data?.message || 'Unknown error';
                logger.warn(`[WR API] /transactions endpoint failed: ${msg}`);
                return null;
            }

            // Response is array of orders, find the matching one
            const ordersData = apiResponse.data.data || [];
            logger.debug(`[WR API] /transactions returned ${ordersData.length} orders`);
            
            const matchingOrder = ordersData.find(order => {
                // Try both order_id and id field (WR might use different naming)
                return order.order_id === orderId || order.id === orderId;
            });

            if (!matchingOrder) {
                logger.debug(`[WR API 404] Order ${orderId} not found in /transactions (${duration}ms). Orders found: ${ordersData.map(o => o.order_id || o.id).join(', ')}`);
                return null;
            }

            logger.info(`[WR API ✓] Order=${orderId} found in /transactions (${duration}ms)`);
            logger.info(`[WR API ✅] ${orderId}: account_details exists = ${!!matchingOrder?.account_details}`);
            
            if (!matchingOrder.account_details || (Array.isArray(matchingOrder.account_details) && matchingOrder.account_details.length === 0)) {
                logger.debug(`[WR API] Order ${orderId} found but no account_details yet`);
                return null;
            }

            // Return account_details as-is (WR API sends in array format)
            // Let the database and frontend handle the formatting
            const accountDetails = matchingOrder.account_details;
            logger.debug(`[WR API] Returning account_details for ${orderId}:`);
            logger.debug(JSON.stringify(accountDetails).substring(0, 500));
            
            return accountDetails;

        } catch (error) {
            const duration = Date.now() - startTime;
            
            // Diagnose the error
            if (error.response?.status === 404) {
                logger.debug(`[WR API 404] Order ${orderId} not found (${duration}ms)`);
            } else if (error.response?.status === 401 || error.response?.status === 403) {
                logger.error(`[WR API 🔒 AUTH ERROR] Status ${error.response.status}: ${error.response.data?.message || error.message}`);
                logger.error(`[WR API] Check: WR_API_KEY = ${process.env.WR_API_KEY?.substring(0, 10)}...`);
                telegramBot.logEvent(
                    'WR API Authentication Error',
                    `❌ Status ${error.response.status}\nURL: ${process.env.WR_API_URL}/transactions\nError: ${error.response.data?.message || error.message}\n\nCheck WR_API_KEY in .env`
                );
            } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                logger.warn(`[WR API ⏱️ TIMEOUT] Order ${orderId} (after ${duration}ms): ${error.message}`);
                telegramBot.logEvent(
                    'WR API Timeout',
                    `Order ID: ${orderId}\n⏱️ Request timed out after ${duration}ms\nURL: ${process.env.WR_API_URL}/transactions`
                );
            } else if (error.response?.status) {
                logger.warn(`[WR API Error-${error.response.status}] Order ${orderId}: ${error.response.data?.message || error.message}`);
                telegramBot.logEvent(
                    'WR API HTTP Error',
                    `Order ID: ${orderId}\nStatus: ${error.response.status}\nError: ${error.response.data?.message || error.message}\nURL: ${process.env.WR_API_URL}/transactions`
                );
            } else if (!error.response && error.message.includes('ECONNREFUSED')) {
                logger.error(`[WR API 🔌 REFUSED] Cannot connect to WR API: ${process.env.WR_API_URL}`);
                telegramBot.logEvent(
                    'WR API Connection Refused',
                    `❌ Cannot connect to WR API at: ${process.env.WR_API_URL}/transactions\n\nCheck:\n1. WR_API_URL in .env\n2. Network connectivity\n3. WR API server status\n4. Firewall/IP whitelist`
                );
            } else {
                logger.warn(`[WR API Error] Order ${orderId} (${duration}ms): ${error.message}`);
                telegramBot.logEvent(
                    'WR API Connection Error',
                    `Order ID: ${orderId}\nError: ${error.message}\nCode: ${error.code}\nDuration: ${duration}ms`
                );
            }
            return null;
        }
    }

    // Retry fetching account details a few times when unavailable (useful if WR is slow)
    // Uses linear backoff instead of exponential to avoid extremely long wait times
    static async fetchAccountDetailsWithRetry(orderId, options = {}) {
        const maxAttempts = options.maxAttempts || 10;
        const baseIntervalMs = options.intervalMs || 15000; // Fixed interval between retries

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                logger.info(`[WR API Retry] Attempt ${attempt}/${maxAttempts} for order ${orderId}`);
                const details = await Order.fetchAccountDetailsFromWR(orderId);
                
                if (details) {
                    logger.info(`[WR API ✅] Successfully fetched account details for ${orderId} on attempt ${attempt}`);
                    return details;
                }

                logger.debug(`[WR API Retry] No details found yet for ${orderId} on attempt ${attempt}`);

                if (attempt < maxAttempts) {
                    // Linear backoff: constant 15s between retries (not exponential)
                    // Exponential would cause: attempt 10 = 150s wait, too long
                    logger.debug(`[WR API Retry] Waiting ${baseIntervalMs / 1000}s before retry ${attempt + 1}...`);
                    
                    telegramBot.logEvent(
                        'WR API Retry',
                        `Order ID: ${orderId}\nAttempt: ${attempt}/${maxAttempts}\n⏳ Waiting ${baseIntervalMs / 1000}s before next try...`
                    );
                    
                    await new Promise(r => setTimeout(r, baseIntervalMs));
                }
            } catch (err) {
                logger.warn(`[WR API Retry] Error on attempt ${attempt}/${maxAttempts} for ${orderId}: ${err.message}`);
                if (attempt < maxAttempts) {
                    // Same linear backoff on error
                    await new Promise(r => setTimeout(r, baseIntervalMs));
                }
            }
        }

        logger.error(`[WR API ❌] Failed to fetch account details for ${orderId} after ${maxAttempts} attempts`);
        telegramBot.logEvent(
            'WR API Retry Failed',
            `Order ID: ${orderId}\n❌ Tried ${maxAttempts} times but account details still unavailable.\nTotal wait time: ${(maxAttempts - 1) * (baseIntervalMs / 1000)}s\n\n⚠️ Please check:\n1. WR API status\n2. Order ID ${orderId} validity\n3. API Key configuration`
        );

        return null;
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
        const { order_id, status, account_details } = data;
        
        // Map WR webhook event names to our status
        // WR events: order-processing, order-completed, order-failed
        // Our statuses: processing, done, failed
        let mappedStatus = status;
        if (event === 'order-completed') mappedStatus = 'done';
        else if (event === 'order-processing') mappedStatus = 'processing';
        else if (event === 'order-failed') mappedStatus = 'failed';
        else if (status) mappedStatus = status; // fallback to status field

        logger.debug(`🔔 Webhook: event=${event}, order=${order_id}, status=${mappedStatus}, hasDetails=${!!account_details}`);

        // Get order details for notification (user, product)
        const [orderRows] = await db.query(
            `SELECT o.*, u.email as user_email, u.username, pv.name as variant_name, p.name as product_name
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             LEFT JOIN product_variants pv ON o.variant_id = pv.id
             LEFT JOIN products p ON pv.product_id = p.id
             WHERE o.order_id = $1`,
            [order_id]
        );

        const orderData = orderRows?.[0];
        if (!orderData) {
            logger.error(`❌ Webhook: Order ${order_id} not found in database`);
            return false;
        }

        // Handle account_details in webhook payload (WR sends array or object)
        if (account_details && typeof account_details === 'object' && Object.keys(account_details).length > 0) {
            logger.info(`✅ Webhook provided account details for ${order_id}`);
            
            // Store as-is (array or object, WR decides format)
            const detailsJson = JSON.stringify(account_details);
            
            // Atomic: update status and account_details together
            const [updatedRows] = await db.query(
                'UPDATE orders SET status = $1, account_details = $2, updated_at = CURRENT_TIMESTAMP WHERE order_id = $3 RETURNING *',
                [mappedStatus || 'done', detailsJson, order_id]
            );

            if (updatedRows && updatedRows.length > 0) {
                logger.info(`✅ [Webhook] Order ${order_id} status=${mappedStatus}, account_details saved`);
                
                // Format details for Telegram notification
                let detailsText = '';
                if (Array.isArray(account_details)) {
                    // Handle array format (WR API format)
                    account_details.forEach(item => {
                        if (item.product) detailsText += `📦 ${item.product}\n`;
                        if (item.details && Array.isArray(item.details)) {
                            item.details.forEach(detail => {
                                if (detail.title) detailsText += `  👤 ${detail.title}\n`;
                                if (detail.credentials && Array.isArray(detail.credentials)) {
                                    detail.credentials.forEach(cred => {
                                        if (cred.label && cred.value) {
                                            detailsText += `    • ${cred.label}: ${cred.value}\n`;
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else if (typeof account_details === 'object') {
                    // Handle object format (legacy)
                    Object.entries(account_details).forEach(([key, value]) => {
                        detailsText += `${key}: ${value}\n`;
                    });
                }
                
                telegramBot.logEvent(
                    '✅ Account Details Received (Webhook)',
                    `Order ID: ${order_id}\nUser: ${orderData.username}\nProduct: ${orderData.product_name}\n\n📋 Details:\n${detailsText}\n✅ Displayed to user in Pesanan page`
                );
            }

            return true;
        }

        // If no account_details in webhook, just update status
        logger.info(`[Webhook] Updating status for ${order_id} → ${mappedStatus}`);
        const [updateRows] = await db.query(
            'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2 RETURNING *',
            [mappedStatus, order_id]
        );

        if (updateRows && updateRows.length > 0) {
            logger.info(`✅ Status updated: ${order_id} → ${mappedStatus}`);
            
            // If order is marked done/complete, try fetching account details immediately
            if (['done', 'completed', 'success'].includes(mappedStatus)) {
                logger.info(`[Webhook] Order marked as ${mappedStatus}, attempting to fetch account details...`);
                try {
                    const accountDetails = await Order.fetchAccountDetailsWithRetry(
                        order_id,
                        { maxAttempts: 5, intervalMs: 10000 }
                    );
                    
                    if (accountDetails) {
                        logger.info(`✅ [Webhook] Account details fetched for ${order_id}`);
                        await Order.completeOrder(order_id, accountDetails, orderData);
                    } else {
                        logger.warn(`⚠️ [Webhook] Account details unavailable for ${order_id}`);
                    }
                } catch (err) {
                    logger.error(`❌ [Webhook] Error fetching details for ${order_id}: ${err.message}`);
                }
            }
        }

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
        // Idempotent: Only update if account_details is currently NULL or empty
        // Prevents overwriting with concurrent updates
        const [rows] = await db.query(
            `UPDATE orders SET account_details = $1 
             WHERE order_id = $2 
             AND (account_details IS NULL OR account_details = '{}'::jsonb OR account_details::text = '')
             RETURNING *`,
            [JSON.stringify(accountDetails), orderId]
        );
        
        if (!rows || rows.length === 0) {
            logger.debug(`[SetAccountDetails] Order ${orderId} already has account_details, skipping update (idempotent)`);
        }
        
        return rows[0] || null;
    }

    static async completeOrder(orderId, accountDetails, orderData = null) {
        // If orderData not provided, fetch it
        if (!orderData) {
            const [rows] = await db.query(
                `SELECT o.*, u.email as user_email, u.username, pv.name as variant_name, p.name as product_name
                 FROM orders o
                 LEFT JOIN users u ON o.user_id = u.id
                 LEFT JOIN product_variants pv ON o.variant_id = pv.id
                 LEFT JOIN products p ON pv.product_id = p.id
                 WHERE o.order_id = $1`,
                [orderId]
            );
            orderData = rows?.[0];
        }

        // Update order status to 'done' with account_details
        const [updatedRows] = await db.query(
            `UPDATE orders SET status = 'done', account_details = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE order_id = $2 AND status != 'done' RETURNING *`,
            [JSON.stringify(accountDetails), orderId]
        );

        if (updatedRows && updatedRows.length > 0) {
            logger.info(`✅ Order ${orderId} marked as DONE with account details`);

            // Notify admin via Telegram only (no email to user)
            let detailsText = '';
            if (typeof accountDetails === 'object') {
                Object.entries(accountDetails).forEach(([key, value]) => {
                    detailsText += `${key}: ${value}\n`;
                });
            }
            
            telegramBot.logEvent(
                '✅ Account Details Saved',
                `Order ID: ${orderId}\nUser: ${orderData?.username}\nProduct: ${orderData?.product_name}\n\n📋 Details:\n${detailsText}\n✅ User dapat lihat di halaman Pesanan`
            );
        } else {
            logger.debug(`[CompleteOrder] Order ${orderId} already marked as done, skipping (idempotent)`);
        }

        return updatedRows?.[0] || null;
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