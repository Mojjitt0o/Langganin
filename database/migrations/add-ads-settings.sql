-- Migration: Membuat tabel ads_settings untuk pengaturan iklan
CREATE TABLE IF NOT EXISTS ads_settings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    delay_after_announcement INTEGER DEFAULT 3, -- detik
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contoh insert data iklan BINGX
INSERT INTO ads_settings (title, content, is_active, delay_after_announcement)
VALUES (
    'BINGX - Setor USDT UNTUK MENANG',
    '🔥 Setor USDT UNTUK MENANG Menangkan Hingga $4.500 dan Paket Produk Apple Anda 🍎\n🇮🇩 Kelayakan: Acara ini hanya terbuka untuk pengguna dari Indonesia\n\n1️⃣ Peningkatan Hadiah Mega: 📲\nNikmati hingga $4.500 dalam bentuk manfaat + Paket Ultimate Apple, termasuk iPhone 17 Pro, MacBook Pro M5, dan Apple Vision Pro.\n\n2️⃣ Hadiah Bertingkat: 💰\nAcara ini dibagi menjadi Zona Tantangan Dasar (100–50.000 USDT) dan Zona Sprint Lanjutan (1.000.000–3.000.000 USDT).\n\n3️⃣ Hadiah yang Dapat Ditumpuk:\nPenuhi berbagai persyaratan pencapaian untuk menumpuk dan mengklaim semua hadiah yang sesuai — tidak ada batasan manfaat! Semua hadiah akan didistribusikan setelah jumlah deposit mencapai persyaratan.\n\nTo join: https://bingx.pro/invite/0WK7V1/',
    TRUE,
    3
);
