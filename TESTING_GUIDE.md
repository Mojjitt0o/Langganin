# 🧪 COMPREHENSIVE TESTING GUIDE
**Langganin Account Details - End-to-End Flow Test**

---

## ✅ Current Status

From database verification:
- **✅ System Working**: 3/7 orders punya account_details (42.9%)
- **✅ Database OK**: Connected, account_details column functional
- **✅ Background Task Running**: Every 20 seconds, checking pending orders
- **⚠️ WR API**: May not have account details for all orders (depends on WR API status)

---

## 📋 Test Flow: Create Order → Monitor Logs → Verify Database

### **STEP 1: Login & Create Order (Browser)**

1. **Open**: http://localhost:3000
2. **Login**:
   - Email: `tester.fingerspot2@gmail.com`
   - Password: `Admin123`

3. **Create Order**:
   - Navigate to "Produk"
   - Select any product (e.g., "API Premium - Pro")
   - Click "Beli"
   - Note the **Order ID** (format: RBHN-YYYYMMDD-XXXXXX)

**Key Success Indicator:**
- ✅ Order created successfully
- ✅ Redirect to payment/confirmation page
- ✅ Order shows in "Pesanan" page

---

### **STEP 2: Monitor Server Logs (Terminal)**

Keep the terminal with `node server.js` open and watch for these log messages within 20-30 seconds:

#### **Within 1-5 seconds (IIFE exec in Order.create)**
```
[BG IIFE] Starting account detail fetch for order RBHN-XXXXXXX...
[WR API] Starting fetch for order RBHN-XXXXXXX...
```

#### **Within 5-30 seconds (Retry if needed)**
```
[WR API Retry] Attempt 1/10 for order RBHN-XXXXXXX
[WR API Retry] Attempt 2/10 for order RBHN-XXXXXXX  (after 15s)
...
```

#### **Success Case - Account Details Found**
```
[WR API ✓] Order=RBHN-XXXXXXX responded in XXXms: {...}
[BG IIFE ✅] Saving fetched account details for RBHN-XXXXXXX
[BG IIFE ✅] Order RBHN-XXXXXXX marked as completed with account details
```

#### **Or via Background Task (every 20s)**
```
[BG Task] Found N orders pending account details
[BG Task] 🔄 Fetching account details for RBHN-XXXXXXX (status: processing)...
[BG Task] ✅ Account Details Auto-Completed
  Order ID: RBHN-XXXXXXX
  📋 Details:
    Email: xxx@example.com
    Password: xxxxx
```

#### **Timeout/Failure Case**
```
[WR API ⏱️ TIMEOUT] Order RBHN-XXXXXXX (after XXms)
[WR API ❌] Failed to fetch account details after 10 attempts
```

**If you see TIMEOUT logs:** This means WR API is slow or not responding - this is normal during WR API maintenance.

---

### **STEP 3: Verify in Database**

Run this after ~30 seconds:

```bash
node verify_db.js
```

Expected output:
```
[Order 1]
  Order ID: RBHN-20260318-XXXXXX
  Status: done ✅ (or processing)
  ✅ Account Details: FOUND
  Details content:
    - Email: testxxx@gmail.com
    - Password: pass123
```

---

### **STEP 4: Verify in Frontend (User View)**

1. **Go to "Pesanan"** page
2. **Click order ID** to view details
3. **Look for "Data Akun" section** - should show:
   - Email
   - Password
   - Or other account credentials

**Possible states:**
- ✅ **BEST**: Account details visible
- ⚠️ **OK**: Status "processing", details loading (refresh after 20s)
- ❌ **Bad**: Status "done" but no account details visible (admin needs to fill manual)

---

## 🔍 Troubleshooting

### **Problem 1: No Account Details After 2 Minutes**

**Possible causes:**
1. ❌ WR API not responding
   - Check: WR API account status
   - Check: Valid API key in `.env`

2. ❌ Background task not running
   - Check: Server logs should show every 20s:
     ```
     [BG Task] Found N orders pending account details
     ```
   - If missing: Server might not have started BG task

3. ❌ Order ID not valid
   - Check: Order created successfully
   - Check: Order ID format correct

**Solution:**
```sql
-- Manually update account details (Admin only):
UPDATE orders 
SET account_details = '{"Email": "testxxx@gmail.com", "Password": "pass123"}'
WHERE order_id = 'RBHN-20260318-XXXXXX';

-- Or set status to done:
UPDATE orders 
SET status = 'done' 
WHERE order_id = 'RBHN-20260318-XXXXXX';
```

---

### **Problem 2: Log Shows "[WR API 404]"**

**Meaning**: WR API says order details not ready yet

**Solution**: Wait longer, background task will retry every 20s

```
[WR API 404] Order details not ready yet for RBHN-XXXXXXX (XXms)
[WR API Retry] Attempt 3/10...  (after 30s)
[WR API Retry] Attempt 4/10...  (after 45s)
```

---

### **Problem 3: Log Shows "[WR API ⏱️ TIMEOUT]"**

**Meaning**: WR API too slow to respond (>25s)

**Solution**: This is normal during slow networks/WR API overload
- Retry mechanism will kick in (up to 10 attempts)
- Each retry waits 15s
- Total max wait: ~2.5 minutes

```
[WR API ⏱️ TIMEOUT] Order RBHN-XXXXXXX (after 25000ms)
[WR API Retry] Attempt 2/10 for order RBHN-XXXXXXX
[WR API Retry] Attempt 3/10 for order RBHN-XXXXXXX (after 15s)
```

---

### **Problem 4: "[WR API 🔌 REFUSED]"**

**Meaning**: Cannot connect to WR API

**Solution**: Check network + WR API endpoint
```bash
# Check WR API URL in .env:
cat .env | grep WR_API

# Should be:
WR_API_URL=https://warungrebahan.com/api/v1
WR_API_KEY=DHgq4Kzc35K3obiEUPIpiGLOkgLuFHIb
```

---

## 📊 Expected Timeline

For successful order:

| Time | Event | Log Pattern |
|------|-------|------------|
| T+0s | Order created | (No log) |
| T+1s | IIFE starts fetch | `[BG IIFE] Starting account detail fetch` |
| T+5s | WR API responds | `[WR API ✓] Order=...` |
| T+10s | Account details saved | `[BG IIFE ✅] ... marked as completed` |
| T+15s | Database updated | `account_details` field filled |
| T+20s | Frontend polling updates | User sees credentials |

**Worst case (timeout + retries):**
- T+0-30s: IIFE tries, fails with timeout
- T+30-60s: Retries (up to 10 attempts)
- T+60s: Background task also tries
- T+150s: Either gets details or gives up

---

## ✅ Success Checklist

After creating an order, verify ALL of these:

- [ ] **Server log** shows `[BG IIFE] Starting account detail fetch` within 5s
- [ ] **Account details appear in logs** showing Email/Password
- [ ] **Database verification** shows account_details NOT NULL
- [ ] **Frontend displays** account info in "Data Akun" section
- [ ] **Order status** changes to "done" or "completed"
- [ ] **No [WR API ❌] errors** in logs

If ALL checkmarks ✅:** Test PASSED - System Working**

If some missing: Check **Troubleshooting** section above

---

## 🔐 How It Works (Architecture)

```
User creates order
    ↓
1. IIFE (fire-and-forget) tries to fetch account details
   └─ Uses lockManager to prevent conflicts
   └─ Timeout: 25s per request
   └─ Retries: 10 attempts × 15s = 150s max
   ↓
2. If IIFE succeeds → Order completed immediately ✅
   ↓
3. If IIFE fails → Background task will retry (every 20s)
   ↓
4. Background task
   └─ Runs every 20 seconds
   └─ Finds orders with missing account_details
   └─ Fetches from WR API
   └─ Updates database atomically
   └─ Also has lock to prevent conflicts with webhook
   ↓
5. Webhook (if WR API sends it)
   └─ Receives webhook from WR API
   └─ Updates order status + account_details
   └─ Also uses lock for coordination
```

**Race-condition safe:** All 3 sources (IIFE, background task, webhook) use lockManager

---

## 📞 Emergency Manual Update (Admin)

If account details not showing after 3 minutes, admin can manually update:

```bash
# 1. Open database client (pgAdmin / DBeaver / psql)

# 2. Run:
UPDATE orders 
SET account_details = '{"Email":"user@example.com","Password":"password123"}'
WHERE order_id = 'RBHN-20260318-XXXXXX';

# 3. If needed, also update status:
UPDATE orders 
SET status = 'done' 
WHERE order_id = 'RBHN-20260318-XXXXXX';
```

---

## 📝 Test Report Template

Use this to document your test:

```
TEST DATE: 2026-03-18
TEST USER: tester.fingerspot2@gmail.com

ORDER CREATED:
  Order ID: RBHN-20260318-XXXXXX
  Product: API Premium - Pro
  Time Created: HH:MM:SS

LOGS OBSERVED:
  ✓ [BG IIFE] Starting account detail fetch
  ✓ [WR API ✓] Order responded
  ✓ [BG IIFE ✅] Order completed
  ° [WR API Timeout] (if applicable)
  
DATABASE VERIFICATION:
  ✓ account_details: NOT NULL
  ✓ Status: done
  
FRONTEND VERIFICATION:
  ✓ Account details visible
  ✓ Email displayed: ___@___.com
  ✓ Password displayed: ________

RESULT: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL

NOTES:
[Any issues or observations]
```

---

**Last Updated**: 2026-03-18
**Status**: ✅ Ready for Testing
