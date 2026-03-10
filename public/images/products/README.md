# Product Images

Folder ini untuk menyimpan gambar/logo produk.

## Struktur
- Simpan gambar dengan format: `{product_id}.png` atau `{product_id}.jpg`
- Contoh: `netflix.png`, `spotify.jpg`, `canva-pro.png`

## Cara Upload Gambar:
1. Download logo produk dari sumber resmi
2. Rename sesuai dengan ID produk
3. Upload ke folder `public/images/products/`
4. Update database: `UPDATE products SET image_url = '/images/products/nama-file.png' WHERE id = 'product_id'`

## Recommended Sizes:
- Width: 400-800px
- Height: 300-600px
- Format: PNG (transparent background) lebih baik
- Max filesize: 200KB
