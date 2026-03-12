# Langganin 🚀

Platform reseller produk digital premium (Netflix, Spotify, Canva Pro, YouTube Premium, dll.) dengan integrasi Warung Rebahan API.

**v3.0** — Security & Refactor Update

## ✨ Fitur

- 🔐 Authentication (Register, Login, Logout) — JWT via httpOnly cookie
- 📦 Sinkronisasi produk dari Warung Rebahan API
- 💳 Top Up saldo via Midtrans (QRIS, bank transfer, e-wallet, Alfamart)
- 🛒 Order management dengan koneksi langsung ke supplier WR
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

## 🔧 API Endpoints

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

## 🐛 Troubleshooting

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

## 📄 License

MIT License

## 👨‍💻 Author

Langganin — Semua Langganan Premium, Harga Terjangkau 🚀

---

**Happy Selling! 🎉**
