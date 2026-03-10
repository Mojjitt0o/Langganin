// routes/affiliateRoutes.js
const express = require('express');
const router = express.Router();
const affiliateController = require('../controllers/affiliateController');
const authMiddleware = require('../middleware/auth');

// Public
router.get('/settings', affiliateController.getSettings);
router.get('/check/:code', affiliateController.checkCode);

// User (authenticated)
router.get('/dashboard', authMiddleware.verifyToken, affiliateController.getDashboard);
router.post('/activate', authMiddleware.verifyToken, affiliateController.activate);
router.get('/referrals', authMiddleware.verifyToken, affiliateController.getReferrals);
router.get('/commissions', authMiddleware.verifyToken, affiliateController.getCommissions);
router.post('/withdraw', authMiddleware.verifyToken, affiliateController.requestWithdrawal);
router.get('/withdrawals', authMiddleware.verifyToken, affiliateController.getWithdrawals);

// Admin
router.get('/admin/overview', authMiddleware.verifyToken, authMiddleware.isAdmin, affiliateController.adminOverview);
router.put('/admin/settings', authMiddleware.verifyToken, authMiddleware.isAdmin, affiliateController.adminUpdateSettings);
router.get('/admin/withdrawals', authMiddleware.verifyToken, authMiddleware.isAdmin, affiliateController.adminGetWithdrawals);
router.patch('/admin/withdrawals/:id/approve', authMiddleware.verifyToken, authMiddleware.isAdmin, affiliateController.adminApproveWithdrawal);
router.patch('/admin/withdrawals/:id/complete', authMiddleware.verifyToken, authMiddleware.isAdmin, affiliateController.adminCompleteWithdrawal);
router.patch('/admin/withdrawals/:id/reject', authMiddleware.verifyToken, authMiddleware.isAdmin, affiliateController.adminRejectWithdrawal);

module.exports = router;
