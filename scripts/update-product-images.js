// scripts/update-product-images.js
const db = require('../config/database');
require('dotenv').config();

// Logo mapping untuk brand-brand populer (high quality only)
// Hanya pakai logo berkualitas tinggi (SVG/PNG besar), sisanya pakai placeholder
const brandLogos = {
    // Streaming & Entertainment
    'Netflix': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    'Disney': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
    'Spotify': 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
    'YouTube': 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg',
    'Youtube': 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg',
    'Prime Video': 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png',
    
    // Productivity & Design
    'Canva': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Canva_icon_2021.svg',
    'Adobe': 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Adobe_Creative_Cloud_rainbow_icon.svg',
    'ChatGPT': 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
    'Office': 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Microsoft_Office_logo_%282019%E2%80%93present%29.svg',
    'GitHub': 'https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg',
    'Apple Music': 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Apple_Music_logo.svg',
    
    // Gaming (Codashop CDN - high quality)
    'Free Fire': 'https://cdn1.codashop.com/S/content/common/images/denom-logo/ff.png',
    'PUBG': 'https://cdn1.codashop.com/S/content/common/images/denom-logo/pubgm.png',
    'Mobile Legends': 'https://cdn1.codashop.com/S/content/common/images/denom-logo/mlbb.png',
    'MLBB': 'https://cdn1.codashop.com/S/content/common/images/denom-logo/mlbb.png',
    'Genshin': 'https://cdn1.codashop.com/S/content/common/images/denom-logo/gi.png',
    
    // Other high-quality logos
    'Windows': 'https://upload.wikimedia.org/wikipedia/commons/8/87/Windows_logo_-_2021.svg'
};

async function updateProductImages() {
    try {
        console.log('🎨 Starting product image update...\n');

        // Get all products from database
        const [products] = await db.query('SELECT id, name, image_url FROM products');

        let updated = 0;
        let notFound = 0;

        for (const product of products) {
            // Check if has brand logo first
            let matchedLogo = null;
            for (const [brand, logoUrl] of Object.entries(brandLogos)) {
                if (product.name.toLowerCase().includes(brand.toLowerCase())) {
                    matchedLogo = logoUrl;
                    break;
                }
            }

            // If has brand logo - always update (override any existing)
            if (matchedLogo) {
                await db.query(
                    'UPDATE products SET image_url = $1 WHERE id = $2',
                    [matchedLogo, product.id]
                );
                console.log(`✅ Brand Logo: ${product.name} → ${matchedLogo}`);
                updated++;
            } else {
                // No brand logo found - use beautiful placeholder
                const firstLetter = product.name.charAt(0).toUpperCase();
                
                // Warna gradient yang menarik untuk setiap huruf
                const gradientColors = {
                    'A': ['6366F1', '8B5CF6'], 'B': ['3B82F6', '06B6D4'], 'C': ['EC4899', 'F43F5E'],
                    'D': ['14B8A6', '10B981'], 'E': ['F59E0B', 'F97316'], 'F': ['8B5CF6', 'A855F7'],
                    'G': ['10B981', '22C55E'], 'H': ['06B6D4', '0EA5E9'], 'I': ['6366F1', '4F46E5'],
                    'J': ['F43F5E', 'EF4444'], 'K': ['14B8A6', '059669'], 'L': ['8B5CF6', '7C3AED'],
                    'M': ['F59E0B', 'EAB308'], 'N': ['3B82F6', '2563EB'], 'O': ['EC4899', 'DB2777'],
                    'P': ['10B981', '16A34A'], 'Q': ['06B6D4', '0284C7'], 'R': ['F97316', 'EA580C'],
                    'S': ['8B5CF6', '9333EA'], 'T': ['14B8A6', '0D9488'], 'U': ['F59E0B', 'D97706'],
                    'V': ['EC4899', 'BE185D'], 'W': ['3B82F6', '1D4ED8'], 'X': ['10B981', '15803D'],
                    'Y': ['F59E0B', 'CA8A04'], 'Z': ['6366F1', '6366F1']
                };
                
                const colors = gradientColors[firstLetter] || ['6366F1', '8B5CF6'];
                const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&size=512&background=${colors[0]}&color=fff&bold=true&font-size=0.4&rounded=true&length=1`;
                
                await db.query(
                    'UPDATE products SET image_url = $1 WHERE id = $2',
                    [placeholderUrl, product.id]
                );
                console.log(`🎨 Placeholder: ${product.name} → [${firstLetter}] ${colors[0]}`);
                notFound++;
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   ✅ Brand logos (high quality): ${updated}`);
        console.log(`   🎨 Placeholder icons (colorful): ${notFound}`);
        console.log(`   📦 Total products processed: ${products.length}`);
        console.log('\n✨ Done! All product images have been updated with high quality logos or beautiful placeholders.');

    } catch (error) {
        console.error('❌ Error updating product images:', error);
    } finally {
        process.exit();
    }
}

updateProductImages();
