// controllers/topupController.js
const db = require('../config/database');
const midtransClient = require('midtrans-client');
require('dotenv').config();

// Initialize Midtrans Snap
const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// Initialize Midtrans Core API for checking transaction status
const core = new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

class TopupController {
    // Create topup transaction and get Midtrans Snap token
    static async createTopup(req, res) {
        try {
            const { amount } = req.body;
            const userId = req.userId;

            // Validate amount
            if (!amount || amount < 10000) {
                return res.status(400).json({
                    success: false,
                    message: 'Minimum topup adalah Rp 10.000'
                });
            }

            if (amount > 10000000) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum topup adalah Rp 10.000.000'
                });
            }

            // Get user data
            const [userRows] = await db.query(
                'SELECT id, username, email FROM users WHERE id = $1',
                [userId]
            );

            if (!userRows || userRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User tidak ditemukan'
                });
            }

            const user = userRows[0];

            // Check if user has any pending transaction
            const [pendingRows] = await db.query(
                'SELECT order_id FROM topup_transactions WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
                [userId, 'pending']
            );

            if (pendingRows && pendingRows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Anda masih memiliki transaksi yang belum selesai. Selesaikan pembayaran terlebih dahulu atau tunggu hingga transaksi expired.',
                    pending_order_id: pendingRows[0].order_id
                });
            }

            // Generate unique order ID
            const orderId = `TOPUP-${userId}-${Date.now()}`;

            // Create Midtrans transaction parameter
            const parameter = {
                transaction_details: {
                    order_id: orderId,
                    gross_amount: amount
                },
                customer_details: {
                    first_name: user.username,
                    email: user.email
                },
                item_details: [{
                    id: 'TOPUP',
                    price: amount,
                    quantity: 1,
                    name: 'Top Up Saldo Langganin'
                }],
                callbacks: {
                    finish: `${process.env.APP_URL || 'http://localhost:3000'}/invoice?order_id=${orderId}`,
                    error: `${process.env.APP_URL || 'http://localhost:3000'}/invoice?order_id=${orderId}`,
                    pending: `${process.env.APP_URL || 'http://localhost:3000'}/invoice?order_id=${orderId}`
                }
            };

            // Create Snap transaction
            const transaction = await snap.createTransaction(parameter);

            // Save to database with snap token and redirect url
            await db.query(
                `INSERT INTO topup_transactions (user_id, order_id, amount, status, snap_token, redirect_url)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [userId, orderId, amount, 'pending', transaction.token, transaction.redirect_url]
            );

            res.json({
                success: true,
                data: {
                    token: transaction.token,
                    redirect_url: transaction.redirect_url,
                    order_id: orderId
                }
            });

        } catch (error) {
            console.error('Topup error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal membuat transaksi topup',
                error: error.message
            });
        }
    }

    // Midtrans notification webhook
    static async handleNotification(req, res) {
        try {
            const notification = req.body;
            
            const orderId = notification.order_id;
            const transactionStatus = notification.transaction_status;
            const fraudStatus = notification.fraud_status;

            console.log(`Notification received for ${orderId}:`, transactionStatus);

            // Get transaction from database
            const [rows] = await db.query(
                'SELECT * FROM topup_transactions WHERE order_id = $1',
                [orderId]
            );

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            const transaction = rows[0];
            let newStatus = transaction.status;

            // Handle transaction status
            if (transactionStatus === 'capture') {
                if (fraudStatus === 'accept') {
                    newStatus = 'success';
                }
            } else if (transactionStatus === 'settlement') {
                newStatus = 'success';
            } else if (transactionStatus === 'pending') {
                newStatus = 'pending';
            } else if (transactionStatus === 'expire') {
                newStatus = 'expired';
            } else if (transactionStatus === 'deny' || transactionStatus === 'cancel') {
                newStatus = 'failed';
            }

            // Update transaction status
            await db.query(
                `UPDATE topup_transactions 
                 SET status = $1, 
                     payment_type = $2, 
                     transaction_id = $3,
                     transaction_time = $4,
                     settlement_time = $5,
                     midtrans_response = $6,
                     updated_at = NOW()
                 WHERE order_id = $7`,
                [
                    newStatus,
                    notification.payment_type,
                    notification.transaction_id,
                    notification.transaction_time,
                    notification.settlement_time || null,
                    JSON.stringify(notification),
                    orderId
                ]
            );

            // If success, add balance to user and create transaction record
            if (newStatus === 'success' && transaction.status !== 'success') {
                await db.query(
                    'UPDATE users SET balance = balance + $1 WHERE id = $2',
                    [transaction.amount, transaction.user_id]
                );

                // Record in transactions table
                await db.query(
                    `INSERT INTO transactions (user_id, type, amount, description)
                     VALUES ($1, $2, $3, $4)`,
                    [
                        transaction.user_id,
                        'topup',
                        transaction.amount,
                        `Top up via ${notification.payment_type || 'Midtrans'}`
                    ]
                );

                console.log(`✅ Balance added for user ${transaction.user_id}: Rp ${transaction.amount}`);
            }

            res.json({ success: true });

        } catch (error) {
            console.error('Notification error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get user's topup history
    static async getTopupHistory(req, res) {
        try {
            const userId = req.userId;

            const [transactions] = await db.query(
                `SELECT * FROM topup_transactions 
                 WHERE user_id = $1 
                 ORDER BY created_at DESC 
                 LIMIT 50`,
                [userId]
            );

            res.json({
                success: true,
                data: transactions
            });

        } catch (error) {
            console.error('Get topup history error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil riwayat topup'
            });
        }
    }

    // Get invoice detail
    static async getInvoice(req, res) {
        try {
            const { orderId } = req.params;
            const userId = req.userId;

            const [rows] = await db.query(
                `SELECT t.*, u.username, u.email 
                 FROM topup_transactions t
                 JOIN users u ON t.user_id = u.id
                 WHERE t.order_id = $1 AND t.user_id = $2`,
                [orderId, userId]
            );

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice tidak ditemukan'
                });
            }

            let invoice = rows[0];

            // If transaction is still pending, check latest status from Midtrans
            if (invoice.status === 'pending') {
                try {
                    const statusResponse = await core.transaction.status(orderId);
                    console.log(`Midtrans status for ${orderId}:`, statusResponse.transaction_status);

                    let newStatus = invoice.status;
                    const transactionStatus = statusResponse.transaction_status;
                    const fraudStatus = statusResponse.fraud_status;

                    // Update status based on Midtrans response
                    if (transactionStatus === 'capture') {
                        if (fraudStatus === 'accept') {
                            newStatus = 'success';
                        }
                    } else if (transactionStatus === 'settlement') {
                        newStatus = 'success';
                    } else if (transactionStatus === 'expire') {
                        newStatus = 'expired';
                    } else if (transactionStatus === 'deny' || transactionStatus === 'cancel') {
                        newStatus = 'failed';
                    }

                    // Update database if status changed
                    if (newStatus !== invoice.status) {
                        await db.query(
                            `UPDATE topup_transactions 
                             SET status = $1, 
                                 payment_type = $2,
                                 transaction_id = $3,
                                 updated_at = NOW()
                             WHERE order_id = $4`,
                            [newStatus, statusResponse.payment_type, statusResponse.transaction_id, orderId]
                        );

                        // If success, add balance
                        if (newStatus === 'success') {
                            await db.query(
                                'UPDATE users SET balance = balance + $1 WHERE id = $2',
                                [invoice.amount, invoice.user_id]
                            );
                        }

                        invoice.status = newStatus;
                        invoice.payment_type = statusResponse.payment_type;
                        invoice.transaction_id = statusResponse.transaction_id;
                    }
                } catch (midtransError) {
                    console.log('Midtrans status check error:', midtransError.message);
                    // Continue with database status if Midtrans check fails
                }
            }

            res.json({
                success: true,
                data: invoice
            });

        } catch (error) {
            console.error('Get invoice error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal mengambil invoice'
            });
        }
    }

    // Cancel pending topup transaction
    static async cancelTopup(req, res) {
        try {
            const { orderId } = req.params;
            const userId = req.userId;

            // Get the transaction
            const [rows] = await db.query(
                'SELECT * FROM topup_transactions WHERE order_id = $1 AND user_id = $2',
                [orderId, userId]
            );

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaksi tidak ditemukan'
                });
            }

            const transaction = rows[0];

            if (transaction.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Hanya transaksi pending yang bisa dibatalkan'
                });
            }

            // Try to cancel on Midtrans side
            try {
                await core.transaction.cancel(orderId);
                console.log(`Midtrans transaction ${orderId} cancelled`);
            } catch (midtransError) {
                // If Midtrans returns 404 or already expired/cancelled, that's fine
                console.log(`Midtrans cancel for ${orderId}:`, midtransError.message);
            }

            // Update status in database
            await db.query(
                "UPDATE topup_transactions SET status = 'cancelled', updated_at = NOW() WHERE order_id = $1",
                [orderId]
            );

            res.json({
                success: true,
                message: 'Transaksi berhasil dibatalkan. Kamu bisa membuat top up baru.'
            });

        } catch (error) {
            console.error('Cancel topup error:', error);
            res.status(500).json({
                success: false,
                message: 'Gagal membatalkan transaksi'
            });
        }
    }
}

module.exports = TopupController;
