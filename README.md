# Langganin 🚀

Platform reseller produk digital premium (Netflix, Spotify, Canva Pro, YouTube Premium, dll.) dengan integrasi Warung Rebahan API.

**v3.0** — Security & Refactor Update  
**v3.1** — Auto Account Details Feature

## ✨ Fitur

- 🔐 Authentication (Register, Login, Logout) — JWT via httpOnly cookie
- 📦 Sinkronisasi produk dari Warung Rebahan API
- 💳 Top Up saldo via Midtrans (QRIS, bank transfer, e-wallet, Alfamart)
- 🛒 Order management dengan koneksi langsung ke supplier WR
- 📋 **Auto Account Details** — Detail akun langsung muncul setelah order (Fitur Baru!)
- 💰 Sistem withdrawal dengan flow approve/reject admin
- 🤝 Sistem affiliate & referral (komisi + diskon buyer)
- 📊 Admin dashboard: statistik, profit, manajemen user, produk, order
- 🤖 Telegram bot support (polling & webhook mode)
- 🌙 Dark/light theme + bilingual (ID/EN)
- 📱 Fully responsive UI

## 🚀 Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd Langganin
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

```bash
psql -U postgres -c "CREATE DATABASE Langganin;"
psql -U postgres -d Langganin -f database/init.sql
```

Kemudian jalankan seluruh migration:
```bash
node scripts/migrate.js
node scripts/migrate-withdrawals.js
node scripts/migrate-affiliate.js
node scripts/migrate-password-reset.js
node scripts/migrate-snap-token.js
node scripts/migrate-referral-discount.js
```

### 4. Konfigurasi Environment

Buat file `.env`:

```env
# Server
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=Langganin
DB_SSL=false

# Warung Rebahan API
WR_API_URL=https://warungrebahan.com/api/v1
WR_API_KEY=your_wr_api_key

# JWT & Session
JWT_SECRET=your_very_long_random_jwt_secret
SESSION_SECRET=your_very_long_random_session_secret

# Midtrans
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
MIDTRANS_IS_PRODUCTION=false

# Withdrawal fee (persen)
WITHDRAWAL_ADMIN_FEE=10

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_admin_chat_id
TELEGRAM_BOT_USERNAME=your_bot_username

# Telegram webhook mode (pakai 'true' di production Railway)
TELEGRAM_USE_WEBHOOK=false

# Log level (debug | info | warn | error)
LOG_LEVEL=info
```

### 5. Jalankan Aplikasi

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

## 📂 Struktur Folder

```
warung-rebahan-shop/
├── config/
│   └── database.js              # Konfigurasi koneksi PostgreSQL
├── controllers/
│   ├── authController.js        # Register, Login, Logout, Password Reset
│   ├── orderController.js       # Order management
│   ├── productController.js     # Sinkronisasi produk
│   ├── topupController.js       # Top Up via Midtrans
│   ├── withdrawalController.js  # Penarikan dana
│   ├── affiliateController.js   # Sistem affiliate
│   ├── supportController.js     # Support ticket
│   └── webhookController.js     # Webhook dari WR API
├── database/
│   ├── init.sql                 # Base schema
│   └── migrations/              # Migration SQL files
├── middleware/
│   └── auth.js                  # JWT (cookie) + session + admin guard
├── models/
│   ├── Order.js                 # Order model (DB transaction safe)
│   ├── Product.js               # Product & variant model
│   ├── Profit.js                # Profit model
│   ├── Affiliate.js             # Affiliate model
│   └── User.js                  # User model
├── public/
│   ├── css/style.css            # Global stylesheet
│   └── js/
│       ├── main.js              # Auth, Order, Balance utils (httpOnly cookie)
│       ├── theme-lang.js        # Dark/light theme + i18n
│       ├── translations.js      # ID/EN strings
│       └── support-widget.js    # Floating support widget
├── routes/                      # Express route handlers
├── scripts/                     # Migration scripts
├── services/
│   ├── logger.js                # Winston structured logger
│   └── telegramBot.js           # Telegram bot (polling & webhook)
├── views/                       # HTML views
├── .env                         # Environment variables
├── package.json
└── server.js                    # Entry point
```

## ⚖️ Warung Rebahan — Syarat & Ketentuan

Semua transaksi dan produk di Langganin tunduk pada Syarat & Ketentuan resmi Warung Rebahan. **Pastikan Anda membaca dan memahami ketentuan berikut sebelum melakukan pembelian.**

### 1️⃣ Ketentuan Umum

- Layanan hanya untuk penggunaan pribadi (bukan untuk dijual ulang tanpa izin)
- Warung Rebahan berhak mengubah harga dan jenis paket kapan saja
- Dengan membeli, Anda setuju dengan semua aturan Warung Rebahan

### 2️⃣ Pembelian & Aktivasi

- **Pembayaran QRIS divalidasi otomatis dalam 1-3 detik**
- Detail akun dikirimkan langsung ke WhatsApp & Dashboard
- Pastikan nomor WhatsApp yang dimasukkan sudah benar dan aktif
- Kesalahan input nomor atau data = tanggung jawab pembeli (tidak bisa refund)

### 3️⃣ Larangan & Sanksi (Akun Bisa Di-Ban tanpa Refund)

❌ **Dilarang:**
- Mengubah Email/Password pada akun sharing
- Menggunakan akun pada device melebihi limit (contoh: Netflix max 4 devices)
- Menggunakan VPN/Proxy yang tidak diizinkan oleh penyedia
- Mengganggu atau mengubah profil milik orang lain

### 4️⃣ Garansi & Refund (Penting!)

**Kami memberikan garansi perbaikan/penggantian akun, BUKAN uang kembali:**

#### Masa Perlindungan: Hari 1-60
✅ **Akun bermasalah atau backfree (gratis)?**
- Klaim garansi → Kami perbaiki atau ganti akun GRATIS

#### Masa Penggunaan: Hari 61-365
❌ **Sudah tidak ada garansi**
- Akun bisa terus digunakan normal sampai masa aktif habis
- Klaim garansi tidak bisa dilakukan di periode ini

**Refund hanya diberikan jika:**
- Kami benar-benar tidak bisa memberikan solusi teknis dalam 48 jam
- Jika ada kendala ≤ 60 hari, prioritas adalah fixing/penggantian akun

**Contoh Kasus:**
```
Anda membeli Viu Premium 365 Hari (masa garansi 60 hari):
├─ Hari 1-60: Akun rusak → BISA KLAIM ✅ (ganti/perbaiki)
└─ Hari 61-365: Akun rusak → TIDAK BISA KLAIM ❌ (garansi habis)
```

### 5️⃣ Metode Pembayaran

Warung Rebahan mendukung:
- 💳 QRIS (tercepat, otomatis terverifikasi 1-3 detik)
- 🏦 Bank Transfer (BCA, Mandiri, BNI)
- 📱 E-wallet populer (Dana, OVO, GOPAY, LinkAja, dll)
- 🏪 Alfamart/Indomaret (cash payment)

---

**📖 Baca lengkap:** https://warungrebahan.com/terms  
**❓ FAQ:** https://warungrebahan.com/faq  
**🔄 Cek Refund:** https://warungrebahan.com/cek-refund

---

### Authentication
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/auth/register` | — | Daftar akun |
| POST | `/api/auth/login` | — | Login (5 req/15 min) |
| POST | `/api/auth/logout` | — | Logout + clear cookie |
| GET  | `/api/auth/profile` | ✅ | Profil user |
| PUT  | `/api/auth/profile` | ✅ | Update nomor WA |
| GET  | `/api/auth/profit` | ✅ | Summary profit |
| POST | `/api/auth/forgot-password` | — | Request reset password |
| POST | `/api/auth/reset-password` | — | Reset dengan token |

### Products
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/products` | — | Semua produk + variant |
| GET | `/api/products/:id/variants` | — | Variant produk |

### Orders
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/orders/create` | ✅ | Buat order |
| GET  | `/api/orders/history` | ✅ | Riwayat order user |
| GET  | `/api/orders/:order_id/account-details` | ✅ | **[BARU]** Ambil account details (auto-fetched) |
| GET  | `/api/orders/profit-summary?page=1&limit=50` | Admin | Dashboard profit |
| GET  | `/api/orders/:id/detail` | Admin | Detail order |
| PATCH | `/api/orders/:id/status` | Admin | Update status |
| PATCH | `/api/orders/:id/complete` | Admin | Complete + kirim account_details |

### Top Up
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/topup/create` | ✅ | Buat transaksi Midtrans |
| POST | `/api/topup/notification` | — | Midtrans webhook (verified) |
| GET  | `/api/topup/history` | ✅ | Riwayat topup |
| GET  | `/api/topup/invoice/:orderId` | ✅ | Detail invoice |
| DELETE | `/api/topup/cancel/:orderId` | ✅ | Cancel pending |

### Withdrawal
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/withdrawal/create` | ✅ | Request tarik dana |
| GET  | `/api/withdrawal/history` | ✅ | Riwayat withdrawal |
| GET  | `/api/withdrawal/admin/all?page=1&limit=50` | Admin | Semua withdrawal |
| POST | `/api/withdrawal/admin/:id/approve` | Admin | Approve |
| POST | `/api/withdrawal/admin/:id/reject` | Admin | Reject + refund saldo |
| POST | `/api/withdrawal/admin/:id/complete` | Admin | Mark selesai |

### Lainnya
| Endpoint | Deskripsi |
|----------|-----------|
| `GET /api/health` | Health check (verifikasi DB) |
| `POST /api/webhook` | WR API webhook (HMAC verified) |
| `POST /api/telegram/webhook` | Telegram webhook endpoint |

## 🔒 Security

| Fitur | Implementasi |
|-------|-------------|
| Password | bcryptjs (cost factor 10) |
| JWT | httpOnly cookie `Secure; SameSite=lax` |
| Rate limiting | 100 req/15 min umum; 5 req/15 min khusus login |
| Midtrans | SHA512 signature verification |
| WR Webhook | HMAC-SHA256 signature verification |
| SQL Injection | Parameterized queries (prepared statements) |
| CORS | Dibatasi ke domain `APP_URL` |
| Admin page | Server-side JWT + DB admin check |
| DB Integrity | Order creation dalam `BEGIN/COMMIT` transaction |
| Error leaking | Internal errors tidak dikirim ke client |
| Session | httpOnly cookie, `SESSION_SECRET` wajib |

## 🤖 Telegram Bot — Webhook Mode (Production)

Di Railway atau hosting dengan domain publik, lebih baik pakai webhook:

1. Set `TELEGRAM_USE_WEBHOOK=true` di `.env`
2. Set `APP_URL=https://your-domain.up.railway.app`
3. Webhook akan diset otomatis di startup: `{APP_URL}/api/telegram/webhook`
4. Untuk kembali ke polling, set `TELEGRAM_USE_WEBHOOK=false`

## 📊 Logging

Winston logger aktif di semua controller dan service.
Format: `YYYY-MM-DD HH:mm:ss [level]: message`

Level: `debug` (development) | `info` (production)

## � Auto Account Details (v3.1)

**Fitur baru:** Detail akun sekarang diambil otomatis dari Warung Rebahan API tanpa input admin!

### Alur Kerja

1. User membuat order → Disimpan ke database
2. Backend **otomatis fetch detail akun** dari WR API (background, non-blocking)
3. Frontend **polling setiap 3 detik** untuk mengecek apakah detail sudah tersedia
4. Ketika detail sampeai → **Update otomatis** tanpa refresh halaman
5. User lihat email/password langsung di halaman pesanan

### Format Data

**Dari WR API (Struktur asli):**
```json
{
  "account_details": [
    {
      "product": "Canva Pro - Member Pro",
      "details": [
        {
          "title": "Akun 1",
          "credentials": [
            {"label": "Email", "value": "user1@example.com"},
            {"label": "Password", "value": "secret123"}
          ]
        }
      ]
    }
  ]
}
```

**Disimpan & Ditampilkan (Format Frontend):**
```json
{
  "Produk": "Canva Pro - Member Pro",
  "Akun 1 - Email": "user1@example.com",
  "Akun 1 - Password": "secret123"
}
```

### Endpoint

```http
GET /api/orders/:order_id/account-details

# Response (jika detail tersedia)
{
  "success": true,
  "data": {
    "Produk": "Canva Pro - Member Pro",
    "Akun 1 - Email": "user@example.com",
    "Akun 1 - Password": "secret123"
  }
}
```

### Polling Behavior

- **Interval:** 3 detik
- **Max polling:** 100 kali (≈ 5 menit)
- **Target orders:** Status = success/done/completed (yang belum punya account_details)

Bisa dikonfigurasi di `views/orders.html`:
```javascript
const pollInterval = 3000;  // ubah ke 5000 untuk 5 detik
const maxAttempts = 100;     // ubah untuk durasi lebih lama
```

---

## �🐛 Troubleshooting
### Account Details Tidak Muncul

**Masalah:** Detail akun tetap kosong meskipun sudah lama
**Solusi:**
1. Pastikan WR API endpoint `/order/detail` sudah tersedia
2. Cek server logs: `node server.js` → cari error message
3. Cek database: `SELECT account_details FROM orders WHERE status='done' LIMIT 1;`
4. Buka browser console (F12) → Console tab → Cek request error
5. Cek polling status di console → seharusnya ada request `/api/orders/:order_id/account-details`

**Debug:** Tambah log di backend `models/Order.js`:
```javascript
// Di dalam fetchAccountDetailsFromWR()
logger.info(`Fetching WR details for order: ${orderId}`);
```

---
### Database Connection Error
- Pastikan PostgreSQL berjalan
- Cek kredensial di `.env`
- Cek dengan: `GET /api/health`

### Login Cookie Tidak Berfungsi
- Pastikan `credentials: 'include'` ada di semua fetch call frontend
- Di production, `APP_URL` harus HTTPS agar cookie `Secure` berfungsi
- Pastikan CORS `credentials: true` dan `allowedOrigins` cocok dengan domain

### Telegram 409 Conflict
- Hanya boleh satu instance yang polling
- Di production, gunakan webhook mode (`TELEGRAM_USE_WEBHOOK=true`)

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## � Warung Rebahan Support & Resources

**Official Links:**
- 🌐 Website: https://warungrebahan.com
- 📋 Syarat & Ketentuan: https://warungrebahan.com/terms
- ❓ FAQ: https://warungrebahan.com/faq
- 📠 API Docs: https://warungrebahan.com/api-docs
- 💬 WhatsApp Admin: https://wa.me/6289628522213
- 🔄 Cek Refund Status: https://warungrebahan.com/cek-refund
- 🧾 Cek Invoice: https://warungrebahan.com/cek-invoice
- 📞 Pusat Bantuan: https://warungrebahan.com/faq

**Produk WR yang Didukung:**
- Netflix Premium
- Spotify Family
- YouTube Premium
- Canva Pro
- Disney+
- ChatGPT+ Premium
- CapCut Pro
- Apple Music
- Github Student
- Getcontact Premium
- Dan banyak lagi...

---

## �📄 License

MIT License

## 👨‍💻 Author

Langganin — Semua Langganan Premium, Harga Terjangkau 🚀

---

**Happy Selling! 🎉**
