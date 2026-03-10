# Langganin 🛍️

Website integrasi dengan Warung Rebahan API untuk penjualan produk digital dengan sistem markup otomatis dan tracking profit.

## ✨ Fitur

- 🔐 Sistem Authentication (Register, Login, Logout)
- 📦 Sinkronisasi Produk otomatis dari Warung Rebahan API
- 💰 Sistem Markup harga otomatis (persentase + fixed)
- 🛒 Order Management
- 💵 Balance & Profit Tracking
- 📊 Dashboard statistik
- 🎨 UI Modern dan Responsif
- ⚡ Real-time webhook untuk update order

## 🚀 Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd warung-rebahan-shop
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

Buat database PostgreSQL dan import schema:

```bash
psql -U postgres -c "CREATE DATABASE warung_rebahan_shop;"
psql -U postgres -d warung_rebahan_shop -f database/init.sql
```

Atau jalankan manual di psql:

```sql
CREATE DATABASE warung_rebahan_shop;
```

Kemudian import file `database/init.sql`

### 4. Konfigurasi Environment

Edit file `.env` dan sesuaikan dengan konfigurasi Anda:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=warung_rebahan_shop

# Warung Rebahan API
WR_API_URL=https://warungrebahan.com/api/v1
WR_API_KEY=your_api_key_here

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_here

# Markup Configuration
MARKUP_PERCENTAGE=20
FIXED_MARKUP=5000
```

### 5. Jalankan Aplikasi

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

Aplikasi akan berjalan di `http://localhost:3000`

## 📂 Struktur Folder

```
warung-rebahan-shop/
├── config/
│   └── database.js          # Konfigurasi koneksi database
├── controllers/
│   ├── authController.js    # Handler authentication
│   ├── orderController.js   # Handler order
│   ├── productController.js # Handler produk
│   └── webhookController.js # Handler webhook dari API
├── database/
│   └── init.sql            # Schema database
├── middleware/
│   └── auth.js             # Middleware authentication
├── models/
│   ├── Order.js            # Model order
│   ├── Product.js          # Model produk
│   ├── Profit.js           # Model profit
│   └── User.js             # Model user
├── public/
│   ├── css/
│   │   └── style.css       # Styling modern
│   └── js/
│       └── main.js         # JavaScript frontend
├── routes/
│   ├── authRoutes.js       # Routes authentication
│   ├── orderRoutes.js      # Routes order
│   ├── productRoutes.js    # Routes produk
│   └── webhookRoutes.js    # Routes webhook
├── views/
│   ├── index.html          # Landing page
│   ├── login.html          # Halaman login
│   ├── register.html       # Halaman register
│   ├── products.html       # Halaman produk
│   ├── orders.html         # Halaman pesanan
│   └── balance.html        # Halaman saldo & profit
├── .env                    # Environment variables
├── package.json            # Dependencies
└── server.js              # Entry point aplikasi
```

## 🎯 Cara Penggunaan

### 1. Register Akun

- Buka `http://localhost:3000/register`
- Isi form registrasi
- Klik "Daftar"

### 2. Login

- Buka `http://localhost:3000/login`
- Masukkan email dan password
- Klik "Login"

### 3. Lihat Produk

- Setelah login, buka halaman Produk
- Sistem akan otomatis sinkronisasi produk dari API
- Lihat berbagai produk dengan harga dan profit

### 4. Buat Pesanan

- Pilih produk yang ingin dibeli
- Klik "Beli Sekarang"
- Isi jumlah dan kode voucher (opsional)
- Konfirmasi pesanan

### 5. Cek Pesanan

- Buka halaman "Pesanan"
- Lihat riwayat semua pesanan
- Filter berdasarkan status

### 6. Cek Profit

- Buka halaman "Saldo & Profit"
- Lihat total keuntungan
- Lihat riwayat profit per transaksi

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Registrasi user baru
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Ambil profil user
- `POST /api/auth/topup` - Top up saldo
- `GET /api/auth/profit` - Ambil summary profit

### Products
- `GET /api/products` - Ambil semua produk (auto sync dari API)
- `GET /api/products/:id/variants` - Ambil varian produk

### Orders
- `POST /api/orders/create` - Buat pesanan baru
- `GET /api/orders/history` - Ambil riwayat pesanan
- `GET /api/orders/balance` - Ambil saldo

### Webhook
- `POST /api/webhook` - Endpoint untuk menerima webhook dari Warung Rebahan API

## 💡 Tips

1. **Markup Configuration**: Sesuaikan `MARKUP_PERCENTAGE` dan `FIXED_MARKUP` di `.env` untuk mengatur keuntungan Anda

2. **Webhook Setup**: Daftarkan URL webhook Anda di dashboard Warung Rebahan:
   ```
   https://yourdomain.com/api/webhook
   ```

3. **Security**: Pastikan untuk mengganti `JWT_SECRET` dan `SESSION_SECRET` dengan string acak yang aman

4. **Database Backup**: Backup database secara berkala untuk menjaga data

## 🎨 Fitur UI

- 🌈 Design modern dengan animasi smooth
- 📱 Fully responsive (mobile, tablet, desktop)
- 🎯 User-friendly interface
- ⚡ Loading states dan error handling
- 🎭 Modal dialogs untuk konfirmasi
- 🏷️ Badge status yang informatif

## 🔒 Security Features

- Password hashing dengan bcrypt
- JWT untuk authentication
- Session management
- Rate limiting untuk API
- SQL injection protection dengan prepared statements
- CORS configuration

## 📝 Notes

- Pastikan PostgreSQL server berjalan sebelum start aplikasi
- API Key Warung Rebahan harus valid
- Default port adalah 3000, bisa diubah di `.env`
- Untuk production, set `NODE_ENV=production`

## 🐛 Troubleshooting

### Database Connection Error
- Pastikan PostgreSQL berjalan
- Cek kredensial di `.env`
- Pastikan database sudah dibuat

### API Error
- Cek API Key di `.env`
- Pastikan koneksi internet stabil
- Cek saldo API di dashboard Warung Rebahan

### Port Already in Use
- Ganti PORT di `.env`
- Atau kill process yang menggunakan port:
  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```

## 📄 License

MIT License

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## 👨‍💻 Author

Warung Rebahan Shop

---

**Happy Selling! 🎉**
