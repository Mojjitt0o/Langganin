// controllers/productController.js
const Product = require('../models/Product');

const productController = {
    async getProducts(req, res) {
        try {
            const products = await Product.getAllWithVariants();
            res.json({ success: true, data: products });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async syncProducts(req, res) {
        try {
            const ok = await Product.syncFromAPI();
            if (ok) {
                const products = await Product.getAllWithVariants();
                res.json({ success: true, message: 'Produk berhasil disinkronkan', data: products });
            } else {
                res.status(500).json({ success: false, message: 'Gagal sinkronisasi dari API supplier' });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async getProductVariants(req, res) {
        try {
            const { productId } = req.params;
            const products = await Product.getAllWithVariants();
            const product = products.find(p => p.id === productId);
            if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
            res.json({ success: true, data: product.variants });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Admin: update harga custom per variant
    async updateVariantPrice(req, res) {
        try {
            const { variantId } = req.params;
            const { custom_price } = req.body;

            if (!custom_price || custom_price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Harga harus lebih dari 0'
                });
            }

            const variant = await Product.updateCustomPrice(variantId, custom_price);
            if (!variant) {
                return res.status(404).json({
                    success: false,
                    message: 'Variant not found'
                });
            }

            res.json({
                success: true,
                message: 'Harga berhasil diupdate',
                data: variant
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Admin: reset harga ke auto markup
    async resetVariantPrice(req, res) {
        try {
            const { variantId } = req.params;
            const variant = await Product.resetCustomPrice(variantId);

            if (!variant) {
                return res.status(404).json({
                    success: false,
                    message: 'Variant not found'
                });
            }

            res.json({
                success: true,
                message: 'Harga direset ke auto markup',
                data: variant
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = productController;