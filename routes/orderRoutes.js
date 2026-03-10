// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

router.post('/create', authMiddleware.verifyToken, orderController.createOrder);
router.get('/history', authMiddleware.verifyToken, orderController.getUserOrders);
router.get('/wr-balance', authMiddleware.verifyToken, authMiddleware.isAdmin, orderController.getWRBalance);

// Admin: dashboard profit web
router.get('/profit-summary', authMiddleware.verifyToken, authMiddleware.isAdmin, orderController.getProfitSummary);

// Admin: order management
router.get('/:order_id/detail', authMiddleware.verifyToken, authMiddleware.isAdmin, orderController.getOrderDetail);
router.patch('/:order_id/status', authMiddleware.verifyToken, authMiddleware.isAdmin, orderController.updateOrderStatus);
router.patch('/:order_id/complete', authMiddleware.verifyToken, authMiddleware.isAdmin, orderController.completeOrder);

module.exports = router;