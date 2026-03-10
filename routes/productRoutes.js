// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');

// Public routes - bisa diakses tanpa login
router.get('/', productController.getProducts);
router.get('/:productId/variants', productController.getProductVariants);

// Protected routes - butuh login
router.post('/sync', authMiddleware.verifyToken, productController.syncProducts);

// Admin routes — update/reset harga jual per variant
router.put('/admin/variant/:variantId/price', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.updateVariantPrice);
router.delete('/admin/variant/:variantId/price/reset', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.resetVariantPrice);
// Alias lama (backward compat)
router.put('/variant/:variantId/price', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.updateVariantPrice);
router.delete('/variant/:variantId/price', authMiddleware.verifyToken, authMiddleware.isAdmin, productController.resetVariantPrice);

module.exports = router;