// routes/topupRoutes.js
const express = require('express');
const router = express.Router();
const TopupController = require('../controllers/topupController');
const authMiddleware = require('../middleware/auth');

// User routes (require authentication)
router.post('/create', authMiddleware.verifyToken, TopupController.createTopup);
router.get('/history', authMiddleware.verifyToken, TopupController.getTopupHistory);
router.get('/invoice/:orderId', authMiddleware.verifyToken, TopupController.getInvoice);
router.post('/cancel/:orderId', authMiddleware.verifyToken, TopupController.cancelTopup);

// Midtrans client config (for dynamic snap.js loading)
router.get('/midtrans-config', (req, res) => {
    res.json({
        success: true,
        clientKey: process.env.MIDTRANS_CLIENT_KEY,
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true'
    });
});

// Midtrans notification webhook (no auth required)
router.post('/notification', TopupController.handleNotification);

module.exports = router;
