# 🔄 Product Auto-Sync Feature

## Deskripsi

Tombol **Sync** telah diganti dengan sistem **Auto-Sync realtime**. Produk, harga, dan stok sekarang akan otomatis terupdate setiap **10 detik** (atau 5 detik, sesuai konfigurasi) tanpa perlu user klik tombol.

---

## ⚙️ Konfigurasi

Ubah interval auto-sync di `views/products.html` baris ~113:

```javascript
// ── Auto-Sync Configuration (atur di sini) ──
// Pilih: 5000 (5 detik) atau 10000 (10 detik) atau ubah sesuai kebutuhan
const AUTO_SYNC_INTERVAL = 10000; // 10 detik (ubah ke 5000 untuk 5 detik)
```

**Opsi Default:**
- `10000` = 10 detik (lebih ringan untuk server)
- `5000` = 5 detik (realtime lebih cepat, tapi lebih berat)

---

## 🔄 Alur Kerja

### 1. **Page Load**
```
User buka /products
    ↓
DOMContentLoaded trigger
    ↓
startAutoSync() dijalankan
    ↓
Sync pertama langsung dilakukan
    ↓
Interval timer dimulai (auto-sync setiap X detik)
```

### 2. **Setiap Interval (misal 10 detik)**
```
syncProducts() dipanggil otomatis
    ↓
Fetch data ke /api/products/sync
    ↓
Update database dengan data terbaru dari WR API
    ↓
Re-render halaman dengan data baru
    ↓
Button menunjukkan kapan sync terakhir ("Just now", "5s ago", dll)
```

### 3. **Manual Click (Optional)**
Jika user klik tombol sync, akan trigger sync segera (tidak menunggu interval berikutnya).

### 4. **Page Unload**
```
User keluar dari halaman
    ↓
beforeunload event trigger
    ↓
stopAutoSync() diberhentikan
    ↓
Interval interval diterminate
```

---

## 📊 Button Display

Tombol sekarang menunjukkan **waktu sync terakhir**:

| Status | Tampilan |
|--------|---------|
| Sedang sync | `↻ Syncing...` |
| Baru saja (< 10 detik) | `↻ Just now` |
| 30 detik lalu | `↻ 30s ago` |
| 2 menit lalu | `↻ 2m ago` |
| Belum pernah sync | `↻ Sync` |

---

## 🔧 Implementasi Teknis

### Variables

```javascript
const AUTO_SYNC_INTERVAL = 10000;  // Interval (ms)
let autoSyncInterval = null;       // Interval ID (untuk clear later)
let lastSyncTime = null;           // Waktu sync terakhir
let isSyncing = false;             // Flag sedang sync?
```

### Functions

#### 1. `syncProducts()`
- Melakukan fetch ke `/api/products/sync`
- Update `lastSyncTime`
- Update tampilan button
- Re-load produk jika berhasil
- Prevent duplicate sync dengan `isSyncing` flag

```javascript
async function syncProducts() {
  if (isSyncing) return;  // Prevent parallel sync
  isSyncing = true;
  // ... fetch dan update ...
  isSyncing = false;
}
```

#### 2. `updateSyncButtonDisplay()`
- Hitung waktu sejak sync terakhir
- Update text tombol
- Matikan button jika sedang sync

#### 3. `startAutoSync()`
- Clear interval yang sedang berjalan (jika ada)
- Set interval baru setiap `AUTO_SYNC_INTERVAL`
- Trigger sync pertama langsung

```javascript
function startAutoSync() {
  if (autoSyncInterval) clearInterval(autoSyncInterval);
  autoSyncInterval = setInterval(() => {
    syncProducts();
  }, AUTO_SYNC_INTERVAL);
  syncProducts(); // Sync langsung saat start
}
```

#### 4. `stopAutoSync()`
- Bersihkan interval
- Dipanggil saat page unload

```javascript
function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
}
```

---

## 📱 UI/UX Changes

### Before
```html
<button class="btn btn-secondary btn-sm" onclick="syncProducts()">
  ↻ Sync
</button>
```
- User harus klik manual untuk update
- Tidak tahu kapan data terakhir diupdate
- Mudah lupa sync

### After
```html
<button class="btn btn-secondary btn-sm" onclick="syncProducts()" id="syncBtn" 
        title="Auto-sync every 10 seconds">
  ↻ Just now
</button>
```
- Otomatis update setiap 10 detik
- Button menunjukkan waktu sync terakhir
- User bisa klik untuk force-sync jika diperlukan

---

## 🚀 Performance Considerations

### Interval Timing

**10 detik (Default)**
- ✅ Hemat bandwidth server
- ✅ Tidak overload database
- ✅ Update cukup cepat untuk stok realtime
- ✅ Baik untuk production

**5 detik**
- ⚠️ 2x lebih banyak request ke server
- ⚠️ Lebih berat untuk database
- ✅ Lebih realtime
- ⚠️ Hanya gunakan jika server kuat

### Tips Optimasi

1. **Rate Limiting:** Jika server kewalahan, naikkan interval ke 15-20 detik
2. **Conditional Sync:** Hanya sync jika user sedang aktif view produk
3. **Batch Requests:** Backend bisa optimize dengan cache N detik

### Backend `/api/products/sync`

Pastikan endpoint ini efisien:
- Gunakan DB caching untuk reduce API calls ke WR
- Implement rate limiting jika diperlukan
- Pastikan response time < 2 detik

---

## 🧪 Testing

### Test Manual Sync
1. Buka `/products`
2. Klik tombol sync → seharusnya trigger langsung
3. Lihat button berubah dari `↻ Just now` → `↻ Xs ago`

### Test Auto-Sync
1. Buka DevTools → Console
2. Lihat request ke `/api/products/sync` setiap 10 detik
3. Tampilan produk seharusnya update otomatis

### Test Stop Auto-Sync
1. Buka DevTools → Console
2. Jalankan: `stopAutoSync()`
3. Seharusnya tidak ada request lagi

### Test Start Auto-Sync
1. Jalankan: `startAutoSync()`
2. Seharusnya mulai sync lagi setiap 10 detik

---

## ❓ Troubleshooting

### Sync tidak jalan
```
Masalah: Auto-sync tidak berjalan
Solusi:
1. Buka DevTools Console
2. Cek ada error?
3. Jalankan: console.log(autoSyncInterval)
4. Kalau null, jalankan: startAutoSync()
5. Cek network tab → lihat request `/api/products/sync`
```

### Sync terlalu sering
```
Masalah: Server kewalahan, terlalu banyak request
Solusi: 
1. Ubah AUTO_SYNC_INTERVAL ke 15000 atau lebih
2. Implementasi server-side caching
3. Implement rate limiting di backend
```

### Button tidak update
```
Masalah: Button text tidak berubah
Solusi:
1. Check browser console ada error?
2. Pastikan updateSyncButtonDisplay() dipanggil
3. Cek timezone browser OK?
4. Refresh page
```

---

## 📚 Related Files

- `views/products.html` — Frontend auto-sync logic
- `controllers/productController.js` — Backend sync endpoint
- `models/Product.js` — Database operations
- `routes/productRoutes.js` — Route definitions

---

## ✅ Checklist

- [x] Default interval 10 detik (adjustable)
- [x] Auto-sync on page load
- [x] Manual sync by button click
- [x] Prevent duplicate sync dengan `isSyncing` flag
- [x] Show last sync time on button
- [x] Stop auto-sync on page unload
- [x] Realtime stock updates
- [x] Error handling

---

**Status:** ✅ READY TO USE
