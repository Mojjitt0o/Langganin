# 🎉 PERUBAHAN BESAR - LANGGANIN v2.0

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
