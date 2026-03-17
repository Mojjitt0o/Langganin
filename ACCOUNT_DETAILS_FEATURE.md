# 🎯 Auto Account Details Feature

## Ringkasan Fitur

Sekarang ketika user membeli produk, mereka akan **otomatis mendapatkan account details** tanpa perlu admin memasukkannya secara manual. Details akan muncul di halaman pesanan user.

## 🔄 Alur Kerja

### 1. User Membuat Order
```
User membeli → Order dikirim ke WR API → Order disimpan ke DB
                ↓
         Fetch account details dari WR API (Background)
                ↓
         Simpan ke kolom account_details (JSONB)
```

### 2. Frontend Polling
```
Frontend mendeteksi order tanpa account_details
         ↓
Poll ke /api/orders/:order_id/account-details setiap 3 detik
         ↓
Ketika details tersedia → Update tampilan secara otomatis
```

### 3. User Melihat Details
User membuka detail order → Lihat account info secara langsung (Email, Password, dll)

---

## 📝 Data Format

### Format dari WR API:
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
        },
        {
          "title": "Akun 2",
          "credentials": [
            {"label": "Email", "value": "user2@example.com"},
            {"label": "Password", "value": "different456"}
          ]
        }
      ]
    }
  ]
}
```

### Format yang Disimpan & Ditampilkan:
```json
{
  "Produk": "Canva Pro - Member Pro",
  "Akun 1 - Email": "user1@example.com",
  "Akun 1 - Password": "secret123",
  "Akun 2 - Email": "user2@example.com",
  "Akun 2 - Password": "different456"
}
```

---

## 🛠️ Perubahan Teknis

### Backend

#### 1. **Order Model** (`models/Order.js`)
```javascript
// Method baru untuk fetch dari WR API
static async fetchAccountDetailsFromWR(orderId) {
  // Calls: POST {WR_API_URL}/order/detail
  // Returns: Formatted account details or null
}

// Modified: Order.create()
// Sekarang otomatis memanggil fetchAccountDetailsFromWR di background
```

#### 2. **Order Controller** (`controllers/orderController.js`)
```javascript
// Endpoint baru
async getAccountDetails(req, res) {
  // GET /api/orders/:order_id/account-details
  // User/Admin bisa check account details kapan saja
}
```

#### 3. **Routes** (`routes/orderRoutes.js`)
```javascript
GET /api/orders/:order_id/account-details
// Accessible oleh user (own order) atau admin
```

#### 4. **Auth Middleware** (`middleware/auth.js`)
```javascript
// Added optional admin check middleware
checkAdmin(req, res, next)
// Sets req.isAdmin = true/false tanpa require admin
```

### Frontend

#### `views/orders.html`
```javascript
// Fungsi baru: pollAccountDetails()
// - Deteksi order yang belum punya account_details
// - Poll setiap 3 detik
// - Max 100 kali polling (≈ 5 menit)
// - Auto-update tampilan ketika details datang
```

---

## ✅ Testing Checklist

### Test Lokal
- [ ] Jalankan server: `node server.js`
- [ ] Buat order baru sebagai user (buka `/products`)
- [ ] Lihat di order history apakah status berubah
- [ ] Buka detail order → cek apakah account details muncul (tunggu polling)
- [ ] Periksa console browser untuk error (F12 → Console)

### Check Database
```sql
SELECT order_id, status, account_details 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;
```

Harusnya `account_details` berisi JSON data seperti:
```json
{"Produk": "...", "Akun 1 - Email": "...", ...}
```

### Check Backend Logs
Server logs harusnya menunjukkan:
```
Account details fetched and saved for order {order_id}
```

Atau jika gagal:
```
Failed to fetch account details for order {order_id}: {error}
```

---

## 🔧 Konfigurasi

Polling behavior bisa diubah di `views/orders.html`:

```javascript
const pollInterval = 3000;        // Polling setiap 3 detik (ubah ke 5000 untuk 5 detik)
const maxAttempts = 100;           // Max 100 kali polling (5 menit)

// Rumus: (maxAttempts * pollInterval) / 1000 = detik total
// = (100 * 3000) / 1000 = 300 detik = 5 menit
```

---

## 🌍 WR API Integration

Fitur ini bergantung pada endpoint WR API:
- **Endpoint**: `POST {WR_API_URL}/order/detail`
- **Payload**:
  ```json
  {
    "api_key": "{WR_API_KEY}",
    "order_id": "{order_id}"
  }
  ```
- **Expected Response**:
  ```json
  {
    "success": true,
    "data": {
      "account_details": [...]
    }
  }
  ```

Jika WR API belum support endpoint ini, hubungi WR untuk membuat endpoint baru.

---

## 🚀 Fitur Tambahan (Optional)

### Kirim via WhatsApp
Account details otomatis termasuk dalam pesan WhatsApp yang dikirim:
```
Customer melihat account details → Klik "Kirim WA" → W.A berisi:
📋 Detail Akun / Produk:
• Akun 1 - Email: user@example.com
• Akun 1 - Password: secret123
... dst
```

---

## ❓ Troubleshooting

### Account details tetap tidak muncul
1. Pastikan WR API endpoint `/order/detail` sudah aktif dan benar
2. Cek logs: `node server.js` untuk error message
3. Cek database apakah order sudah tersimpan
4. Cek browser console (F12) untuk request errors

### Data format tidak sesuai
- Pastikan format WR API response sesuai struktur di atas
- Adjust parsing logic di `fetchAccountDetailsFromWR()` jika format berbeda

### Polling terlalu lama/terlalu cepat
- Edit `pollInterval` dan `maxAttempts` di `views/orders.html`

---

## 📞 Support

Jika ada issue, check:
1. `console.error()` di browser (F12 → Console)
2. Server logs di terminal
3. Database: `SELECT * FROM orders WHERE account_details IS NOT NULL`

---

Status: ✅ SIAP DIGUNAKAN
