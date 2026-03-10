# 🚀 LANGGANIN - Platform Langganan Digital

Platform jual-beli langganan digital dengan sistem reseller otomatis. Integrasi dengan Warung Rebahan API dan Midtrans payment gateway.

## ✨ Fitur Utama

### User Features
- ✅ Registrasi & Login dengan JWT
- ✅ Browse & Search produk digital (Netflix, Spotify, Canva, dll)
- ✅ **Top Up Saldo via Midtrans** (Bank Transfer, E-Wallet, QRIS, dll)
- ✅ **Withdrawal/Tarik Dana** dengan approval system
- ✅ Auto-order ke Warung Rebahan API
- ✅ Riwayat transaksi & pesanan
- ✅ Input nomor WhatsApp saat checkout
- ✅ Product images support

### Admin Features
- ✅ Dashboard dengan statistik
- ✅ Kelola produk & set custom pricing
- ✅ Kelola user (promote admin, dll)
- ✅ View semua order & profit
- ✅ **Approve/Reject permintaan withdrawal**
- ✅ Statistik withdrawal & profit

### NEW: Sistem Withdrawal 💰
- User bisa tarik dana kapan saja (min Rp 50.000)
- Admin fee 10% otomatis terpotong
- 3 Status: Pending → Approved → Completed
- Admin review & approve via admin panel
- Balance dikembalikan jika ditolak

### NEW: Midtrans Integration 💳
- Top up saldo dengan berbagai metode
- Bank Transfer, E-Wallet, QRIS, Alfamart, dll
- Otomatis update saldo setelah pembayaran
- Webhook notification dari Midtrans

## 📦 Setup

### 1. Prerequisites
```bash
- Node.js v16+
- PostgreSQL
- NPM packages sudah ter-install
```

### 2. Database Setup
```bash
# Jalankan migration
node scripts/migrate-add-images-whatsapp.js
node scripts/migrate-withdrawals.js

# Atau via SQL langsung
psql -U postgres -d warung_rebahan_shop -f database/init.sql
psql -U postgres -d warung_rebahan_shop -f database/migrations/add-withdrawals-table.sql
```

### 3. Environment Variables
```bash
# Copy .env.example ke .env
cp .env.example .env

# Edit .env dan isi:
- Database credentials (PostgreSQL)
- WR_API_KEY dari warungrebahan.com
- MIDTRANS_SERVER_KEY & MIDTRANS_CLIENT_KEY dari dashboard Midtrans
- JWT_SECRET & SESSION_SECRET (random string)
```

### 4. Midtrans Setup
1. Daftar di [Midtrans](https://midtrans.com/)
2. Ambil Server Key & Client Key di Settings → Access Keys
3. Set Notification URL di Settings → Configuration:
   ```
   https://your-domain.com/api/topup/notification
   ```
4. Test dengan Sandbox mode dulu (MIDTRANS_IS_PRODUCTION=false)

### 5. Run Server
```bash
npm start
# atau
node server.js
```

Server akan running di `http://localhost:3000`

## 🎨 Product Images

Untuk menambah gambar produk:

1. Download logo/gambar produk (PNG/JPG recommended)
2. Simpan di `public/images/products/`
3. Update database:
```sql
UPDATE products 
SET image_url = '/images/products/nama-file.png' 
WHERE id = 'product-id';
```

Atau gunakan external URL:
```sql
UPDATE products 
SET image_url = 'https://example.com/logo.png' 
WHERE id = 'product-id';
```

## 🔄 Workflow

### User Topup Flow
1. User klik "Top Up" di halaman Balance
2. Input jumlah nominal
3. Redirect ke Midtrans Snap payment
4. User pilih metode & bayar
5. Midtrans kirim webhook → saldo auto-update

### User Withdrawal Flow  
1. User request withdrawal (min Rp 50k)
2. Balance langsung dipotong (hold)
3. Admin review di Admin Panel → Withdrawals
4. Admin approve → tandai "Transfer Sudah Dikirim"
5. Atau admin reject → balance dikembalikan ke user

### Order Flow
1. User pilih produk & varian
2. Input nomor WhatsApp (wajib)
3. Konfirmasi order → potong saldo
4. Auto-order ke Warung Rebahan API
5. Simpan data order & profit

## 📊 Database Schema

### New Tables

**withdrawals**
```sql
- id, user_id, amount, admin_fee, net_amount
- bank_name, account_number, account_name
- status: pending/approved/rejected/completed
- approved_by, approved_at, rejected_reason
```

**topup_transactions**
```sql
- id, user_id, order_id, amount
- status, payment_type, transaction_id
- midtrans_response (JSONB)
```

**users (updated)**
```sql
+ bank_name, account_number, account_name
+ whatsapp
```

**products (updated)**
```sql
+ image_url
```

**orders (updated)**
```sql
+ buyer_whatsapp
```

## 🔐 API Endpoints

### Topup
- `POST /api/topup/create` - Create topup transaction
- `POST /api/topup/notification` - Midtrans webhook
- `GET /api/topup/history` - Get topup history

### Withdrawal
- `POST /api/withdrawal/create` - Request withdrawal
- `GET /api/withdrawal/history` - Get withdrawal history
- `GET /api/withdrawal/admin/all` - [Admin] Get all withdrawals
- `GET /api/withdrawal/admin/stats` - [Admin] Get statistics
- `POST /api/withdrawal/admin/:id/approve` - [Admin] Approve
- `POST /api/withdrawal/admin/:id/reject` - [Admin] Reject
- `POST /api/withdrawal/admin/:id/complete` - [Admin] Mark completed

## 🎨 Branding

Nama: **Langganin** 🚀  
Tagline: "Semua Langganan Premium, Harga Terjangkau"

Icon/Emoji: 🚀 (menggantikan ⚡)

## 📝 TODO untuk Production

- [ ] Ganti .env dengan credentials production
- [ ] Set MIDTRANS_IS_PRODUCTION=true
- [ ] Set APP_URL ke domain production
- [ ] Setup HTTPS/SSL
- [ ] Setup proper database backup
- [ ] Add rate limiting untuk API
- [ ] Add logging system
- [ ] Add email notification untuk withdrawal
- [ ] Add WhatsApp notification untuk user

## 💡 Tips

### Untuk Upload Gambar Produk Manual
1. Cari logo di Google Images (search: "netflix logo png")
2. Download yang transparent background (PNG)
3. Upload ke `/public/images/products/`
4. Update database

### Testing Midtrans
Gunakan test cards dari [docs Midtrans](https://docs.midtrans.com/docs/testing-payment-on-sandbox)

### Admin Fee Withdrawal
Default 10%, bisa diubah di `.env`:
```
WITHDRAWAL_ADMIN_FEE=10
```

## 📞 Support

Untuk pertanyaan atau issue, hubungi developer atau buat issue ticket.

---

**© 2026 Langganin** - Platform Langganan Digital Terbaik  
Built with ❤️ using Node.js, PostgreSQL, Express
