// routes/withdrawalRoutes.js
const express = require('express');
const router = express.Router();
const WithdrawalController = require('../controllers/withdrawalController');
const authMiddleware = require('../middleware/auth');

// User routes
router.post('/create', authMiddleware.verifyToken, WithdrawalController.createWithdrawal);
router.get('/history', authMiddleware.verifyToken, WithdrawalController.getWithdrawalHistory);

// Admin routes
router.get('/admin/all', authMiddleware.verifyToken, authMiddleware.isAdmin, WithdrawalController.getAllWithdrawals);
router.get('/admin/stats', authMiddleware.verifyToken, authMiddleware.isAdmin, WithdrawalController.getWithdrawalStats);
router.patch('/admin/approve/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, WithdrawalController.approveWithdrawal);
router.patch('/admin/reject/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, WithdrawalController.rejectWithdrawal);
router.patch('/admin/complete/:id', authMiddleware.verifyToken, authMiddleware.isAdmin, WithdrawalController.completeWithdrawal);
router.get('/settings', authMiddleware.verifyToken, WithdrawalController.getSettings);
router.patch('/settings', authMiddleware.verifyToken, authMiddleware.isAdmin, WithdrawalController.updateSettings);

module.exports = router;
