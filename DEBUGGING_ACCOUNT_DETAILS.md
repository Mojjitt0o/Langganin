# 🔍 Debugging Account Details Issue

## Masalah yang Diperbaiki

1. **Timeout WR API** - Ditingkatkan dari 10s → 25s
2. **Retry Mechanism** - Ditingkatkan dari 6 attempts → 10 attempts dengan exponential backoff
3. **SQL Query** - Diperbaiki untuk mendeteksi empty account_details dengan lebih baik
4. **Logging** - Ditambahkan logging detail untuk debugging
5. **Error Handling** - Improved diagnostics untuk setiap jenis error

---

## 📋 Checklist Testing

### 1️⃣ Test di Development (Local)

```bash
# Terminal 1: jalankan server
node server.js

# Periksa logs untuk melihat background task berjalan
# Harusnya ada: "Background auto-fetch task started"
```

### 2️⃣ Buat Order Test

1. Login ke aplikasi (atau buat user baru)
2. Buka halaman Produk
3. Beli product (contoh: API Premium)
4. Lihat di console server untuk logs:

```
[BG] Starting account detail fetch for order ORD-XXXX...
[WR API] Starting fetch for order ORD-XXXX...
[WR API Retry] Attempt 1/10 for order ORD-XXXX...
```

### 3️⃣ Check Database

Setelah order dibuat, run di PostgreSQL:

```sql
-- Check order terbaru
SELECT 
  order_id, 
  status, 
  account_details,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 1;
```

**Harusnya:**
- `account_details` tidak NULL setelah beberapa detik
- `status` = 'completed' atau 'done'

### 4️⃣ Check Frontend Response

Open DevTools (F12) → Network tab:
1. Klik ke halaman "Pesanan"
2. Cari request ke `/api/orders/history`
3. Check response JSON:

```json
{
  "data": [
    {
      "order_id": "ORD-XXXX",
      "account_details": {
        "Produk": "...",
        "Akun 1 - Email": "...",
        "Akun 1 - Password": "..."
      }
    }
  ]
}
```

---

## 🐛 Debugging Checklist

### Jika account_details masih kosong:

#### ✅ Check 1: WR API Configuration 
```bash
# Di .env, pastikan sudah benar:
WR_API_URL=https://warungrebahan.com/api/v1
WR_API_KEY=DHgq4Kzc35K3obiEUPIpiGLOkgLuFHIb
```

**Test dengan curl:**
```bash
curl -X POST https://warungrebahan.com/api/v1/order/detail \
  -H "Content-Type: application/json" \
  -d '{"api_key": "YOUR_KEY", "order_id": "ORD-XXXX"}'
```

#### ✅ Check 2: Server Logs
Cari pattern di server logs:
```
[WR API Response] Order=...      // Response received
[WR API ✅] Order=...              // Details found
[WR API ⏱️ TIMEOUT]               // If timeout occurred
[WR API 🔌 REFUSED]               // If connection failed
```

**Interpresi logs:**
- ✅ Jika ada `[WR API ✅]` = OK, account_details ada
- ⏱️  Jika timeout = WR API slow, retry otomatis berjalan
- 🔌 Jika connection refused = check URL/network

#### ✅ Check 3: Background Task
Di logs, cari:
```
[BG Task] Found N orders pending account details
[BG Task] Fetching account details for ORD-XXXX (status: processing)...
[BG Task] ✅ Order ORD-XXXX: Details fetched & saved
```

Jika tidak ada = background task tidak berjalan
- Check: Apakah Node.js berhasil start?
- Check: Apakah ada error saat require modules?

#### ✅ Check 4: Database Connection
```sql
-- Check apakah tabel orders punya kolom account_details
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='orders' AND column_name='account_details';
```

Harusnya: `account_details | jsonb`

---

## 🚀 Deployment ke Production (Railway)

Setelah test berhasil di local:

### 1. Push code ke Git
```bash
git add .
git commit -m "Fix: Improve account details fetching with better timeout and logging"
git push origin main
```

### 2. Railway otomatis redeploy
- Monitor di Railway Dashboard → Logs
- Cari: `Background auto-fetch task started`

### 3. Test di Production
```bash
# Test endpoint dengan curl
curl -X POST https://your-app.up.railway.app/api/orders/history \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📊 Expected Behavior Timeline

| Waktu | Event |
|-------|-------|
| T+0s | User membuat order |
| T+1-5s | Background IIFE mencoba fetch dari WR API |
| T+5-15s | Jika WR API slow, retry otomatis dengan backoff |
| T+15-30s | Server background task (every 20s) juga fetch |
| T+30s | Account details muncul di database |
| T+35s | Frontend polling mendapat account_details, display ke user |

---

## ⚠️ Possible Issues & Solutions

### Issue 1: Still No Account Details After 5 Minutes
**Solution:**
```bash
# 1. Restart server
# 2. Check WR API status: curl https://warungrebahan.com/api/v1/balance -X POST ...
# 3. Check order ID is valid
# 4. Check API key is correct
```

### Issue 2: Timeout Errors in Logs
**Solution:**
- Increase timeout further (currently 25s)
- Check internet connectivity
- WR API might be overloaded - retry is automatic

### Issue 3: Connection Refused to WR API
**Solution:**
```bash
# Check if URL is correct:
# Should be: https://warungrebahan.com/api/v1

# Test connectivity:
curl -v https://warungrebahan.com/api/v1/balance
```

### Issue 4: Orders Stuck in "Processing" Status
**Solution:**
```sql
-- Admin can manually fetch & save details:
UPDATE orders 
SET account_details = '{"Akun 1 - Email": "..."}', status = 'completed'
WHERE order_id = 'ORD-XXXX';
```

---

## 📝 Changes Made

### Order.js
- ✅ `fetchAccountDetailsFromWR()`: timeout 10s → 25s, improved error logging
- ✅ `fetchAccountDetailsWithRetry()`: 6 → 10 attempts, exponential backoff
- ✅ Better error diagnostics for timeout, connection refused, HTTP errors

### server.js (Background Task)
- ✅ Fixed SQL query to detect empty account_details better
- ✅ Added detailed logging with emoji indicators
- ✅ Better error notifications via Telegram
- ✅ Check existing status before updating

---

## 🔗 Useful Links

- [WR API Docs](https://warungrebahan.com/api-docs)
- [PostgreSQL JSONB Docs](https://www.postgresql.org/docs/current/datatype-json.html)
- [Node.js Axios Timeout](https://axios-http.com/docs/req_config)

---

## 💡 Next Steps if Still Not Working

1. Check Telegram logs (admin notifications)
2. Run: `SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;` in DB
3. Check if webhook from WR API is being received
4. Contact WR API support with order ID and account details

---

**Last Updated:** 2026-03-18
