# 🔐 LANGGANIN v3.0 — Security & Refactor Update

## 📅 Tanggal: Maret 2026

---

## 🛡️ Perbaikan Keamanan (Security Fixes)

### 1. **Verifikasi Signature Midtrans** *(KRITIS)*
- Endpoint `/api/topup/notification` sekarang memverifikasi `signature_key` dari Midtrans  
  menggunakan SHA512(`orderId + statusCode + grossAmount + serverKey`)
- Sebelumnya: siapapun bisa forge payload dan menambah saldo secara gratis
- **File:** `controllers/topupController.js`

### 2. **Hapus Endpoint Topup Manual** *(KRITIS)*
- `POST /api/auth/topup` dihapus — endpoint ini memungkinkan user menambah saldo sendiri  
  tanpa pembayaran apapun (dev shortcut yang tidak sengaja masuk production)
- **File:** `routes/authRoutes.js`, `controllers/authController.js`

### 3. **Fix Crash pada WR Webhook Signature Check** *(KRITIS)*
- `crypto.timingSafeEqual` sebelumnya crash jika header `http_x_premiy_signature` kosong  
  karena `Buffer.from(undefined)` melempar exception
- Sekarang: header dicek terlebih dahulu, jika tidak ada langsung return 401
- **File:** `controllers/webhookController.js`

### 4. **JWT disimpan sebagai httpOnly Cookie** *(TINGGI)*
- Token sebelumnya disimpan di `localStorage` → rentan dicuri via XSS
- Sekarang server menyimpan JWT sebagai cookie `httpOnly; Secure; SameSite=lax`
- Frontend tidak lagi punya akses ke raw token — hanya menyimpan data profil yang aman
- **File:** `controllers/authController.js`, `middleware/auth.js`, `public/js/main.js`

### 5. **CORS Dibatasi ke Domain Sendiri** *(TINGGI)*
- Sebelumnya: `app.use(cors())` menerima request dari semua origin
- Sekarang: hanya mengizinkan origin dari `APP_URL` (production) atau `localhost:3000` (dev)
- **File:** `server.js`

### 6. **Rate Limit Khusus untuk Login** *(TINGGI)*
- Login sekarang dibatasi 5 percobaan per 15 menit per IP (sebelumnya ikut limit umum 100/15 menit)
- Mencegah brute-force serangan pada endpoint login
- **File:** `routes/authRoutes.js`

### 7. **Proteksi Halaman Admin di Server-Side** *(TINGGI)*
- Sebelumnya: `GET /admin` langsung serve HTML tanpa cek auth — siapapun bisa baca source-nya
- Sekarang: middleware `requireAdminPage` memverifikasi JWT cookie dan status admin di DB
- Non-admin di-redirect ke `/login`; token tidak valid → redirect ke `/login`
- **File:** `middleware/auth.js`, `server.js`

### 8. **Hapus `error.message` dari Response 500** *(TINGGI)*
- Semua controller tidak lagi mengirimkan `error.message` ke client pada 500 error
- Pesan internal DB/stack tidak bocor ke publik
- Error di-log ke Winston, tapi client hanya menerima pesan generik

---

## 🐛 Bug Fixes

### 9. **DB Transaction pada `Order.create()`** 
- Balance dipotong, order disimpan ke DB, dan profit dicatat sekarang dalam satu `BEGIN/COMMIT` transaction
- Kalau ada error di tengah, semua dirollback — tidak ada saldo hilang tanpa order tercatat
- Ditambahkan optimistic lock check: `UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1`
- **File:** `models/Order.js`

### 10. **Fix Tipe Transaksi Withdrawal**
- Withdrawal sebelumnya dicatat dengan tipe `'topup'` (salah) dengan amount negatif
- Sekarang dicatat dengan tipe `'withdrawal'` yang semantik benar
- **File:** `controllers/withdrawalController.js`

### 11. **Fix `session.destroy()` Tanpa Callback**
- `req.session.destroy()` sekarang dipanggil dengan callback untuk menangkap error silently
- **File:** `controllers/authController.js`

---

## ✨ Fitur Baru

### 12. **Structured Logging dengan Winston**
- Menggantikan semua `console.log/error` dengan Winston logger
- HTTP request logging dengan format: `METHOD /path statusCode Xms - IP`
- Log level otomatis: `debug` di development, `info` di production
- **File Baru:** `services/logger.js`

### 13. **Health Check Verifikasi Database**
- `GET /api/health` sekarang menjalankan test query ke PostgreSQL
- Jika DB tidak bisa dijangkau, API mengembalikan status 503 (bukan 200 like before)
- **File:** `server.js`

### 14. **Pagination pada Admin Endpoints**
- `GET /api/orders/profit-summary?page=1&limit=50` — admin order list
- `GET /api/withdrawal/admin/all?page=1&limit=50&status=pending` — withdrawal list
- Tidak lagi hard-cap 200 rows; response menyertakan `pagination` metadata
- **File:** `controllers/orderController.js`, `controllers/withdrawalController.js`, `models/Order.js`

### 15. **Telegram Webhook Mode (Production)**
- Tambahkan `TELEGRAM_USE_WEBHOOK=true` ke `.env` untuk menggunakan Telegram webhook  
  (lebih reliable di Railway vs long-polling)
- Set webhook URL otomatis di startup: `{APP_URL}/api/telegram/webhook`
- Endpoint baru: `POST /api/telegram/webhook`
- Default masih polling (untuk kompatibilitas development)
- **File:** `services/telegramBot.js`, `server.js`

---

## ⚙️ Perubahan Konfigurasi `.env`

Tambahkan ke file `.env`:

```env
# Telegram mode (opsional — default: polling)
# Set 'true' di production Railway untuk efisiensi
TELEGRAM_USE_WEBHOOK=true

# Log level (opsional — default: info di production, debug di development)
LOG_LEVEL=info
```

**Penting:** `APP_URL` **wajib diisi** jika menggunakan `TELEGRAM_USE_WEBHOOK=true`:
```env
APP_URL=https://your-railway-domain.up.railway.app
```

---

## 🔄 API Changes

| Perubahan | Detail |
|---|---|
| `POST /api/auth/topup` | ❌ **DIHAPUS** (insecure dev shortcut) |
| `GET /admin` | Sekarang memerlukan auth admin (server-side) |
| `GET /api/health` | Sekarang verifikasi DB connectivity |
| `GET /api/orders/profit-summary` | Mendukung `?page=1&limit=50` |
| `GET /api/withdrawal/admin/all` | Mendukung `?page=1&limit=50&status=pending` |
| `POST /api/telegram/webhook` | ✅ Baru — endpoint Telegram webhook |

---

## 📦 Dependencies Baru

```json
"cookie-parser": "^1.4.7",
"winston": "^3.19.0"
```

Install:
```bash
npm install
```

---



## ✨ Fitur Baru yang Sudah Ditambahkan:

### 1. 💳 **Integrasi Midtrans untuk Top Up**
- User bisa top up saldo dengan berbagai metode:
  - Bank Transfer (BCA, BNI, Mandiri, Permata, dll)
  - E-Wallet (GoPay, OVO, DANA, ShopeePay, LinkAja)
  - QRIS
  - Alfamart/Indomaret
  - Credit Card
- Otomatis update saldo setelah payment sukses
- Webhook notification dari Midtrans
- History topup lengkap

**File Baru:**
- `controllers/topupController.js` - Handler untuk topup & Midtrans
- `routes/topupRoutes.js` - API routes topup
- `scripts/migrate-withdrawals.js` - Migration script

### 2. 💰 **Sistem Withdrawal/Tarik Dana**
- User bisa request tarik dana (minimum Rp 50.000)
- Admin fee 10% otomatis dipotong
- Flow: 
  - User request → Balance langsung hold
  - Admin review & approve → Transfer manual ke rekening user
  - Admin mark completed ATAU reject (balance dikembalikan)
- Track status: pending, approved, rejected, completed

**File Baru:**
- `controllers/withdrawalController.js` - Handler withdrawal
- `routes/withdrawalRoutes.js` - API routes withdrawal

### 3. 🖼️ **Support Gambar Produk**
- Database support kolom `image_url` di tabel products
- Frontend otomatis tampilkan gambar jika ada
- Folder `public/images/products/` untuk simpan logo
- Fallback jika gambar tidak ada/error

**Updated:**
- `models/Product.js` - Sync image_url dari API
- `views/products.html` - Render product images
- `public/css/style.css` - Styling untuk product images

### 4. 📱 **Input Nomor WhatsApp saat Checkout**
- Kolom wajib input nomor WA buyer
- Auto-fill dari profile user jika sudah tersimpan
- Untuk komunikasi setelah transaksi
- Format: 628xxx (tanpa +)

**Updated:**
- `models/Order.js` - Save buyer_whatsapp
- `views/products.html` - Form input WhatsApp
- `database` - Kolom buyer_whatsapp di orders table

### 5. 🚀 **Rebranding ke "LANGGANIN"**
- Nama toko: **Langganin**
- Icon: 🚀 (ganti dari ⚡)
- Tagline: "Semua Langganan Premium, Harga Terjangkau"
- Hero section homepage di-refresh
- Semua file HTML & branding updated

## 📊 Database Changes (Migration Required!)

Jalankan migration ini untuk update database:

```bash
# Migration 1: Image URL & WhatsApp (sudah jalan)
node scripts/migrate-add-images-whatsapp.js

# Migration 2: Withdrawals & Topup (PERLU DIJALANKAN)
node scripts/migrate-withdrawals.js
```

**Tables Baru:**
1. `withdrawals` - Data permintaan tarik dana
2. `topup_transactions` - History topup via Midtrans

**Columns Baru:**
- `products.image_url` - URL gambar produk
- `orders.buyer_whatsapp` - Nomor WA buyer
- `users.bank_name` - Nama bank user
- `users.account_number` - No rekening
- `users.account_name` - Nama pemilik rekening

## ⚙️ Setup yang Perlu Dilakukan:

### 1. Update .env
Tambahkan ke file `.env` Anda:

```env
# Midtrans Configuration
MIDTRANS_SERVER_KEY=your_midtrans_server_key_here
MIDTRANS_CLIENT_KEY=your_midtrans_client_key_here
MIDTRANS_IS_PRODUCTION=false
APP_URL=http://localhost:3000

# Withdrawal Settings
WITHDRAWAL_ADMIN_FEE=10
```

### 2. Daftar & Setup Midtrans
1. Daftar di https://midtrans.com/
2. Ke Dashboard → Settings → Access Keys
3. Copy Server Key & Client Key
4. Paste ke `.env`
5. Set Notification URL di Midtrans Dashboard:
   ```
   https://your-domain.com/api/topup/notification
   ```

### 3. Install Package Baru
```bash
npm install  # Package midtrans-client sudah di-install
```

### 4. Jalankan Migration Database
```bash
node scripts/migrate-withdrawals.js
```

### 5. Start Server
```bash
node server.js
```

## 🎨 Upload Gambar Produk (Manual)

Karena API Warung Rebahan tidak menyediakan gambar, Anda perlu upload manual:

### Cara Upload:
1. **Download logo produk** dari sumber resmi (Google Images: "nama produk logo png")
2. **Simpan di**: `public/images/products/` 
   - Contoh: `netflix.png`, `spotify.jpg`, `canva-pro.png`
3. **Update database**:
```sql
UPDATE products 
SET image_url = '/images/products/netflix.png' 
WHERE name LIKE '%Netflix%';
```

Atau pakai URL external:
```sql
UPDATE products 
SET image_url = 'https://cdn.example.com/netflix-logo.png' 
WHERE name LIKE '%Netflix%';
```

## 🔄 API Endpoints Baru

### Topup
```
POST   /api/topup/create          # Create topup & get Snap token
POST   /api/topup/notification    # Midtrans webhook (jangan manual)
GET    /api/topup/history          # Riwayat topup user
```

### Withdrawal
```
POST   /api/withdrawal/create                  # Request tarik dana
GET    /api/withdrawal/history                 # Riwayat withdrawal user
GET    /api/withdrawal/admin/all               # [Admin] Lihat semua
GET    /api/withdrawal/admin/stats             # [Admin] Statistik
POST   /api/withdrawal/admin/:id/approve       # [Admin] Approve
POST   /api/withdrawal/admin/:id/reject        # [Admin] Reject
POST   /api/withdrawal/admin/:id/complete      # [Admin] Mark selesai
```

## 💪 Workflow Admin untuk Withdrawal

### Approve Withdrawal:
1. Login sebagai Admin
2. Buka Admin Panel → tab "Withdrawals" (perlu tambah UI)
3. Lihat pending requests
4. Click "Approve" → akan dapat data rekening user
5. **Transfer manual** ke rekening user (via m-banking)
6. Setelah transfer berhasil, click "Mark Completed"

### Reject Withdrawal:
1. Click "Reject" 
2. Isi alasan penolakan
3. Balance otomatis dikembalikan ke user

## 📱 UI Pages yang Perlu Dibuat (NEXT STEP)

Untuk lengkapi sistem, perlu buat UI page:

1. **Balance Page Enhancement**
   - Button "Top Up" → modal input nominal → redirect Midtrans Snap
   - Button "Tarik Dana" → form input amount + rekening bank
   - Tab History: Topup & Withdrawal

2. **Admin Panel Enhancement**
   - Tab "Withdrawals" → list pending/approved/completed
   - Button Approve/Reject untuk setiap request
   - Show bank details user untuk transfer

3. **User Profile Page**
   - Form update data bank account (bank, no rek, nama)
   - Biar withdrawal lebih cepat (nggak perlu isi tiap kali)

## 🎯 File Structure Baru

```
controllers/
  - topupController.js          ✨ NEW
  - withdrawalController.js     ✨ NEW
  
routes/
  - topupRoutes.js               ✨ NEW
  - withdrawalRoutes.js          ✨ NEW
  
database/migrations/
  - add-withdrawals-table.sql    ✨ NEW
  
scripts/
  - migrate-withdrawals.js       ✨ NEW
  
public/images/products/          ✨ NEW (folder for images)
  - README.md

views/ (ALL UPDATED)
  - index.html                   🔄 Rebranded
  - products.html                🔄 Gambar + WA input
  - balance.html                 🔄 Branding
  - orders.html                  🔄 Branding
  - admin.html                   🔄 Branding
  - login.html                   🔄 Branding
  - register.html                🔄 Branding
```

## 🐛 Testing Checklist

- [ ] Database migration berhasil
- [ ] Top up via Midtrans (test dengan sandbox)
- [ ] Request withdrawal
- [ ] Admin approve withdrawal
- [ ] Admin reject withdrawal (balance kembali)
- [ ] Upload 1-2 gambar produk & cek tampilan
- [ ] Input nomor WA saat checkout
- [ ] Branding "Langganin" muncul di semua page

## 📞 Troubleshooting

### Database Connection Error saat Migration
- Pastikan PostgreSQL running
- Check credentials di `.env`
- Test connection: `psql -U postgres -d warung_rebahan_shop`

### Midtrans Tidak Work
- Pastikan Server Key & Client Key benar
- Test di Sandbox mode dulu (IS_PRODUCTION=false)
- Check notification URL sudah diset di Midtrans Dashboard

### Gambar Produk Tidak Muncul
- Check file path benar: `public/images/products/nama-file.png`
- Check database `image_url` sudah terisi
- Check browser console for errors
- Try hard refresh: Ctrl+F5

## 🎉 Summary

Sistem Langganin sekarang sudah lengkap dengan:
- ✅ Topup otomatis via Midtrans
- ✅ Withdrawal dengan approval system
- ✅ Product images support
- ✅ WhatsApp input saat order
- ✅ Fresh new branding

**Next step**: Jalankan migration, setup Midtrans, upload gambar produk, dan test semua fitur! 🚀

---

💡 **Catatan Penting**: 
- Database migration **WAJIB** dijalankan
- Midtrans credentials **WAJIB** diisi di .env
- Test dulu di Sandbox sebelum production

Happy coding! 🎊
