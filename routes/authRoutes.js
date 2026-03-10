// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/profile', authMiddleware.verifyToken, authController.getProfile);
router.put('/profile', authMiddleware.verifyToken, authController.updateProfile);
router.post('/topup', authMiddleware.verifyToken, authController.topup);
router.get('/profit', authMiddleware.verifyToken, authController.getProfitSummary);

// Admin-only: manage users
router.get('/users', authMiddleware.verifyToken, authMiddleware.isAdmin, authController.listUsers);
router.patch('/users/:id/set-admin', authMiddleware.verifyToken, authMiddleware.isAdmin, authController.setAdmin);
router.get('/users/:id/whatsapp', authMiddleware.verifyToken, authMiddleware.isAdmin, authController.getUserWhatsapp);

// Forgot/reset password (no auth required)
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/validate-reset-token/:token', authController.validateResetToken);

module.exports = router;