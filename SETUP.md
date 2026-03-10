# 🚀 PANDUAN SETUP CEPAT

## Langkah 1: Persiapan Database

### Buka PostgreSQL
```bash
psql -U postgres
```

### Buat Database dan Import Schema
```sql
CREATE DATABASE warung_rebahan_shop;
\c warung_rebahan_shop
\i database/init.sql
```

Atau jika di Windows dengan pgAdmin:
1. Buka pgAdmin 4
2. Klik kanan "Databases" -> "Create" -> "Database" -> Nama: `warung_rebahan_shop`
3. Klik kanan database -> "Query Tool"
4. Buka file `database/init.sql` dan klik Execute (▶ icon)

## Langkah 2: Konfigurasi .env

File `.env` sudah ada, pastikan isi sesuai:

```env
PORT=3000
NODE_ENV=development

# Sesuaikan dengan kredensial PostgreSQL Anda
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password          # Isi password PostgreSQL Anda
DB_NAME=warung_rebahan_shop

# Warung Rebahan API - WAJIB diisi dengan API key valid
WR_API_URL=https://warungrebahan.com/api/v1
WR_API_KEY=DHgq4Kzc35K3obiEUPIpiGLOkgLuFHIb

# Ubah dengan string random untuk keamanan
JWT_SECRET=your_jwt_secret_key_change_this_in_production
SESSION_SECRET=your_session_secret_change_this_in_production

# Atur profit margin Anda (default: 20% + Rp 5.000)
MARKUP_PERCENTAGE=20
FIXED_MARKUP=5000
```

## Langkah 3: Install Dependencies (Sudah Selesai ✅)

Dependencies sudah terinstall!

## Langkah 4: Jalankan Aplikasi

### Development Mode (dengan auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

## Langkah 5: Akses Aplikasi

Buka browser dan kunjungi:
```
http://localhost:3000
```

## 🎯 Mulai Menggunakan

1. **Register Akun**
   - Klik "Register" atau kunjungi http://localhost:3000/register
   - Isi username, email, dan password
   - Klik "Daftar"

2. **Login**
   - Kunjungi http://localhost:3000/login
   - Masukkan email dan password
   - Klik "Login"

3. **Top Up Saldo** (Manual via Database dulu)
   Buka psql dan jalankan:
   ```sql
   \c warung_rebahan_shop
   UPDATE users SET balance = 1000000 WHERE email = 'your-email@example.com';
   ```

4. **Belanja Produk**
   - Klik menu "Produk"
   - Pilih produk dan klik "Beli Sekarang"
   - Isi form dan konfirmasi

5. **Cek Pesanan & Profit**
   - Menu "Pesanan" untuk melihat riwayat order
   - Menu "Saldo & Profit" untuk melihat keuntungan

## ⚠️ Troubleshooting

### Error: Cannot connect to database
```bash
# Pastikan PostgreSQL berjalan
# Windows: Check Services -> postgresql-x64-XX
# Atau buka pgAdmin 4
# Pastikan DB_PASSWORD di .env benar
```

### Error: Port 3000 already in use
```bash
# Ubah PORT di .env menjadi 3001 atau port lain
```

### Error: API Key invalid
```bash
# Ganti WR_API_KEY di .env dengan API key valid dari warungrebahan.com
```

### Produk tidak muncul
```bash
# Pastikan API Key valid
# Cek koneksi internet
# Cek console/terminal untuk error message
```

## 📱 Test Account (Setelah Register)

Setelah register, Anda perlu top up saldo manual dulu via PostgreSQL:

```sql
-- Ganti dengan email Anda
UPDATE users SET balance = 1000000 WHERE email = 'test@example.com';
```

## 🎉 Selesai!

Aplikasi siap digunakan. Selamat berjualan! 💰

---

**Tips Pro:**
- Set markup sesuai keuntungan yang diinginkan di `.env`
- Backup database secara berkala
- Untuk production, ganti semua secret keys
- Setup webhook di dashboard Warung Rebahan untuk notifikasi real-time
