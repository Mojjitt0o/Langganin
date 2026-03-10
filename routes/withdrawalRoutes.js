// routes/withdrawalRoutes.js
const express = require('express');
const router = express.Router();
const WithdrawalController = require('../controllers/withdrawalController');
const authMiddleware = require('../middleware/auth');

// User routes
router.post('/create', authMiddleware.verifyToken, WithdrawalController.createWithdrawal);
router.get('/history', authMiddleware.verifyToken, WithdrawalController.getWithdrawalHistory);

// Admin routes (will add admin middleware later)
router.get('/admin/all', authMiddleware.verifyToken, WithdrawalController.getAllWithdrawals);
router.get('/admin/stats', authMiddleware.verifyToken, WithdrawalController.getWithdrawalStats);
router.patch('/admin/approve/:id', authMiddleware.verifyToken, WithdrawalController.approveWithdrawal);
router.patch('/admin/reject/:id', authMiddleware.verifyToken, WithdrawalController.rejectWithdrawal);
router.patch('/admin/complete/:id', authMiddleware.verifyToken, WithdrawalController.completeWithdrawal);

module.exports = router;
