# ✅ CHECKLIST QUICK START

Ikuti checklist ini untuk menjalankan aplikasi:

## ☑️ 1. Database Setup
```bash
# Buka PostgreSQL Command Line atau pgAdmin 4
psql -U postgres

# Di psql prompt:
CREATE DATABASE warung_rebahan_shop;
\c warung_rebahan_shop
\i database/init.sql
```
- [ ] Database `warung_rebahan_shop` created
- [ ] Tables created (users, products, product_variants, orders, profits, transactions)

## ☑️ 2. Environment Configuration
- [ ] File `.env` sudah ada
- [ ] `DB_PASSWORD` diisi dengan password PostgreSQL Anda
- [ ] `WR_API_KEY` valid (test di warungrebahan.com)
- [ ] `JWT_SECRET` dan `SESSION_SECRET` sudah diganti (untuk production)

## ☑️ 3. Dependencies
- [x] ✅ NPM packages sudah terinstall!

## ☑️ 4. Start Server

### Option A: Development Mode (Recommended)
```bash
npm run dev
```
- [ ] Server started successfully
- [ ] No errors in console
- [ ] Shows "Server running on: http://localhost:3000"

### Option B: Production Mode
```bash
npm start
```

## ☑️ 5. Test Aplikasi

### A. Buka Browser
```
http://localhost:3000
```
- [ ] Landing page muncul dengan design yang bagus
- [ ] Navbar terlihat normal
- [ ] Stats animasi berjalan

### B. Register Account
```
http://localhost:3000/register
```
- [ ] Form register berfungsi
- [ ] Validasi password bekerja
- [ ] Bisa register dengan sukses

### C. Login
```
http://localhost:3000/login
```
- [ ] Bisa login dengan akun yang baru dibuat
- [ ] Redirect ke halaman products
- [ ] Balance muncul di navbar

### D. Top Up Saldo (Manual via Database)
```sql
-- Jalankan di psql (sudah connect ke warung_rebahan_shop):
UPDATE users SET balance = 1000000 WHERE email = 'your-email@example.com';
```
- [ ] Balance updated
- [ ] Balance terlihat di navbar setelah refresh

### E. Browse Products
```
http://localhost:3000/products
```
- [ ] Produk muncul (auto-sync dari API)
- [ ] Harga terlihat
- [ ] Button "Beli" berfungsi
- [ ] Modal order muncul

### F. Create Order
- [ ] Modal order berfungsi
- [ ] Bisa submit order
- [ ] Alert sukses muncul
- [ ] Redirect ke halaman orders

### G. Check Orders
```
http://localhost:3000/orders
```
- [ ] Order history muncul
- [ ] Status terlihat
- [ ] Filter bekerja
- [ ] Detail modal berfungsi

### H. Check Balance & Profit
```
http://localhost:3000/balance
```
- [ ] Saldo terlihat
- [ ] Total profit terhitung
- [ ] Riwayat profit muncul

## ☑️ 6. API Integration Test

### Check API Balance
- [ ] Buka browser console (F12)
- [ ] Lihat Network tab saat buka halaman balance
- [ ] API calls berhasil (status 200)
- [ ] Data muncul dengan benar

## 🎯 Troubleshooting Quick Fixes

### ❌ Database Connection Error
```bash
# Check PostgreSQL running:
# Windows: Services > postgresql-x64-XX > Start
# Atau buka pgAdmin 4

# Verify .env:
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_ACTUAL_PASSWORD  # ← Cek ini!
DB_NAME=warung_rebahan_shop
```

### ❌ Port Already in Use
```env
# Edit .env:
PORT=3001  # atau port lain
```

### ❌ API Error / Produk Tidak Muncul
```env
# Verify API key di .env:
WR_API_KEY=YOUR_VALID_API_KEY

# Test API key di browser:
# Visit: https://warungrebahan.com/dashboard
# Check your API key is active
```

### ❌ Can't Login After Register
```sql
-- Verify user created:
SELECT * FROM users;

-- Check password is hashed (should be long string)
-- Reset password if needed:
-- (password: "password123")
UPDATE users SET password = '$2a$10$abcdefghijklmnopqrstuvwxyz123456789' WHERE email = 'test@example.com';
```

## 🎉 Success Indicators

Jika semua checklist ✅, Anda harus melihat:

1. ✨ **Landing page** dengan gradient background yang cantik
2. 🎨 **Modern UI** dengan smooth animations
3. 📦 **Products page** dengan list produk dari API
4. 🛒 **Order system** yang berfungsi sempurna
5. 💰 **Balance tracking** yang akurat
6. 📊 **Profit calculation** yang otomatis

## 📱 Test Devices

Test aplikasi di:
- [ ] Desktop browser (Chrome/Firefox/Edge)
- [ ] Mobile browser (responsive)
- [ ] Tablet view

## 🚀 Ready for Production?

Sebelum deploy ke production:
- [ ] Ganti semua `JWT_SECRET` dan `SESSION_SECRET` dengan random string
- [ ] Set `NODE_ENV=production`
- [ ] Test semua fitur sekali lagi
- [ ] Setup backup database
- [ ] Configure webhook URL di Warung Rebahan dashboard
- [ ] Setup monitoring/logging
- [ ] Enable HTTPS

---

## ✅ All Done?

**SELAMAT! 🎉** 

Aplikasi Anda siap digunakan untuk berjualan produk digital!

**Next Steps:**
1. Customize markup percentage sesuai target profit
2. Add more features sesuai kebutuhan
3. Deploy ke hosting/VPS
4. Mulai berjualan! 💰

---

**Butuh bantuan?**
- Cek [SUMMARY.md](SUMMARY.md) untuk overview lengkap
- Cek [SETUP.md](SETUP.md) untuk panduan detail
- Cek [README.md](README.md) untuk dokumentasi
