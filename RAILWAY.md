# Railway Deployment Guide

## ✅ Pre-Deployment Checklist

Code sudah disiapkan untuk Railway deployment dengan konfigurasi berikut:
- ✅ **Trust Proxy** enabled untuk rate limiting dan security
- ✅ **Procfile** untuk process configuration
- ✅ **PORT** menggunakan environment variable
- ✅ **Session cookies** otomatis secure di production
- ✅ **API endpoints** menggunakan relative paths

## Environment Variables yang Harus Diset di Railway

Setelah `railway up`, set environment variables berikut di Railway Dashboard:

### Database Configuration (PostgreSQL dari Supabase)
```
DB_HOST=aws-1-ap-south-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.vyrkzhqutwyhlmtteade
DB_PASSWORD=SLwpXTbrGBLdlAIU
DB_NAME=postgres
DB_SSL=true
```

### Warung Rebahan API
```
WR_API_URL=https://warungrebahan.com/api/v1
WR_API_KEY=DHgq4Kzc35K3obiEUPIpiGLOkgLuFHIb
```

### Security Keys
```
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_here
```

### Business Configuration
```
MARKUP_PERCENTAGE=20
FIXED_MARKUP=5000
WITHDRAWAL_ADMIN_FEE=10
```

### Midtrans Payment Gateway
```
MIDTRANS_SERVER_KEY=Mid-server-IPzCYslpGDaQ-amwkl5a1Ug1
MIDTRANS_CLIENT_KEY=Mid-client-c8_NtkrQXWWqx16H
MIDTRANS_IS_PRODUCTION=false
```

### App Configuration
```
NODE_ENV=production
APP_URL=https://your-app-name.up.railway.app
```
**PENTING:** Ganti `your-app-name` dengan domain Railway yang diberikan setelah deploy!

## Step-by-Step Deployment

### 1. Deploy ke Railway
```bash
railway up
```

### 2. Set Environment Variables
Setelah deploy, buka Railway Dashboard:
1. Pilih project Anda
2. Klik tab "Variables"
3. Copy paste semua environment variables di atas
4. **Update `APP_URL`** dengan domain Railway Anda (contoh: https://warung-rebahan-shop-production.up.railway.app)

### 3. Redeploy
Setelah set environment variables, Railway akan otomatis redeploy. Atau bisa manual:
```bash
railway up --detach
```

### 4. Generate Domain
Di Railway Dashboard:
1. Klik tab "Settings"
2. Scroll ke "Environment" → "Domains"
3. Klik "Generate Domain" untuk mendapatkan public URL

### 5. Update Midtrans Callback URL
1. Login ke [Midtrans Dashboard](https://dashboard.midtrans.com/)
2. Settings → Configuration
3. Update Payment Notification URL menjadi: `https://your-app-name.up.railway.app/api/webhook/midtrans`
4. Update Finish Redirect URL menjadi: `https://your-app-name.up.railway.app/invoice`

## Useful Commands

```bash
# Deploy app
railway up

# View logs
railway logs

# Open dashboard
railway open

# Link to existing project
railway link

# Check status
railway status

# Set single variable
railway variables set KEY=value
```

## Troubleshooting

### Database Connection Failed
- Pastikan DB_SSL=true
- Cek koneksi Supabase masih aktif
- Verifikasi credentials di Supabase Dashboard

### Midtrans Webhook Gagal
- Update Payment Notification URL di Midtrans Dashboard
- Pastikan APP_URL sudah benar
- Cek Railway logs: `railway logs`

### Port Issues
- Railway otomatis set PORT environment variable
- Server.js sudah dikonfigurasi: `const PORT = process.env.PORT || 3000`

### Failed to create code snapshot
- Jalankan deploy dari root project ini, bukan dari parent folder lain
- Snapshot CLI sekarang dibatasi oleh `.railwayignore` agar file lokal seperti `tests/`, `node_modules/`, `.env`, log, dan file scratch tidak ikut terupload
- Di Windows PowerShell, command `railway` bisa gagal karena Execution Policy. Jika itu terjadi, gunakan `npx @railway/cli up`, Command Prompt, atau set `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
- Tambahkan `--verbose` saat retry untuk melihat apakah gagalnya terjadi sebelum build dimulai: `railway up --verbose`
- Jika error hanya muncul dari CLI tetapi deploy dari GitHub berhasil, gunakan GitHub deploy sebagai workaround karena itu melewati proses snapshot lokal

## Health Check

Setelah deploy, test health endpoint:
```bash
curl https://your-app-name.up.railway.app/api/health
```

Response sukses:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-03-07T...",
  "uptime": 123.456
}
```

## Production Checklist

- [x] Procfile dibuat
- [x] Package.json memiliki start script
- [x] Server menggunakan process.env.PORT
- [ ] Environment variables sudah diset di Railway
- [ ] APP_URL sudah diupdate dengan domain Railway
- [ ] Midtrans webhook URL sudah diupdate
- [ ] Database migrations sudah dijalankan (jika ada)
- [ ] Test semua fitur: login, topup, checkout, withdrawal

## Security Notes

1. **NEVER** commit `.env` file ke Git (sudah ada di .gitignore)
2. Generate secret keys yang kuat untuk JWT_SECRET dan SESSION_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
3. Untuk production, set `MIDTRANS_IS_PRODUCTION=true` setelah testing selesai
4. Monitor Railway logs secara berkala untuk detect issues

## Support

Railway Documentation: https://docs.railway.com/
Midtrans Documentation: https://docs.midtrans.com/
