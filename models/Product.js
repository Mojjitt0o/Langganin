// models/Product.js
const db = require('../config/database');
const axios = require('axios');
require('dotenv').config();

class Product {
    static async syncFromAPI() {
        try {
            const response = await axios.post(`${process.env.WR_API_URL}/products`, {
                api_key: process.env.WR_API_KEY
            });

            if (response.data.success) {
                const products = response.data.data;
                
                for (const product of products) {
                    await db.query(
                        `INSERT INTO products (id, name, category, description, image_url) 
                         VALUES ($1, $2, $3, $4, $5)
                         ON CONFLICT (id) DO UPDATE SET
                         name = EXCLUDED.name,
                         category = EXCLUDED.category,
                         description = EXCLUDED.description,
                         image_url = CASE WHEN EXCLUDED.image_url IS NOT NULL THEN EXCLUDED.image_url ELSE products.image_url END`,
                        [product.id, product.name, product.category, product.description, product.image_url || null]
                    );

                    for (const variant of product.variants) {
                        const originalPrice = variant.price;
                        const autoPrice = this.calculateOurPrice(originalPrice);

                        // Sync tapi jangan overwrite custom_price jika sudah di-set manual
                        await db.query(
                            `INSERT INTO product_variants (id, product_id, name, original_price, our_price, duration, type, warranty, stock) 
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                             ON CONFLICT (id) DO UPDATE SET
                             name = EXCLUDED.name,
                             original_price = EXCLUDED.original_price,
                             our_price = EXCLUDED.our_price,
                             duration = EXCLUDED.duration,
                             type = EXCLUDED.type,
                             warranty = EXCLUDED.warranty,
                             stock = EXCLUDED.stock`,
                            [variant.id, product.id, variant.name, originalPrice, autoPrice, 
                             variant.duration, variant.type, variant.warranty, variant.stock]
                        );
                    }
                }
                
                return true;
            }
        } catch (error) {
            console.error('Error syncing products:', error);
            return false;
        }
    }

    /**
     * Hitung harga jual otomatis dari harga modal
     * Menggunakan MARKUP_PERCENTAGE dan FIXED_MARKUP dari .env
     * Contoh: modal 5000, markup 20%, fixed 1000 → 5000 + 1000 + 1000 = 7000
     */
    static calculateOurPrice(originalPrice) {
        const markupPercentage = parseFloat(process.env.MARKUP_PERCENTAGE) || 20;
        const fixedMarkup = parseFloat(process.env.FIXED_MARKUP) || 1000;
        const markupAmount = Math.ceil(originalPrice * markupPercentage / 100);
        // Bulatkan ke ratusan terdekat agar harga terlihat rapi
        const rawPrice = originalPrice + markupAmount + fixedMarkup;
        return Math.ceil(rawPrice / 100) * 100;
    }

    static async getAllWithVariants() {
        const [products] = await db.query(`
            SELECT p.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', pv.id,
                               'name', pv.name,
                               'original_price', pv.original_price,
                               'our_price', pv.our_price,
                               'custom_price', pv.custom_price,
                               'sell_price', COALESCE(pv.custom_price, pv.our_price),
                               'duration', pv.duration,
                               'type', pv.type,
                               'warranty', pv.warranty,
                               'stock', pv.stock
                           ) ORDER BY pv.original_price ASC
                       ) FILTER (WHERE pv.id IS NOT NULL),
                       '[]'::json
                   ) as variants
            FROM products p
            LEFT JOIN product_variants pv ON p.id = pv.product_id
            GROUP BY p.id
            ORDER BY p.name ASC
        `);
        
        return products;
    }

    static async getVariantById(variantId) {
        const [rows] = await db.query(
            'SELECT *, COALESCE(custom_price, our_price) as sell_price FROM product_variants WHERE id = $1',
            [variantId]
        );
        return rows[0];
    }

    static async updateCustomPrice(variantId, customPrice) {
        const [rows] = await db.query(
            'UPDATE product_variants SET custom_price = $1 WHERE id = $2 RETURNING *',
            [customPrice, variantId]
        );
        return rows[0];
    }

    static async resetCustomPrice(variantId) {
        const [rows] = await db.query(
            'UPDATE product_variants SET custom_price = NULL WHERE id = $1 RETURNING *',
            [variantId]
        );
        return rows[0];
    }
}

module.exports = Product;