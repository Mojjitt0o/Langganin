# Webhook Testing Guide - Step by Step

## Quick Test (No IP Whitelist Required)

This guide helps you test webhook functionality locally before the WR API IP whitelist is enabled.

---

## Method 1: Using curl (Easiest)

### Step 1: Create Test Order in Database

Execute this SQL in your PostgreSQL:

```sql
INSERT INTO orders (
  id,
  user_id, 
  product_name,
  quantity,
  status,
  price_per_unit,
  total_price,
  created_at,
  updated_at
) VALUES (
  'RBHN-TEST-001',
  1,
  'Canva Pro - Member Pro', 
  1,
  'processing',
  150000,
  150000,
  NOW(),
  NOW()
);
```

### Step 2: Prepare Webhook Payload

Open a text editor and save this as `webhook-test.json`:

```json
{
  "event": "order-completed",
  "data": {
    "order_id": "RBHN-TEST-001",
    "status": "completed",
    "account_details": [
      {
        "product": "Canva Pro - Member Pro",
        "details": [
          {
            "title": "Akun 1",
            "credentials": [
              {
                "label": "Email",
                "value": "testuser@example.com"
              },
              {
                "label": "Password",
                "value": "TestPassword123!"
              },
              {
                "label": "Security Question",
                "value": "Answer123"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Step 3: Calculate Signature

**On Windows (PowerShell)**:

```powershell
# Read the file
$jsonFile = Get-Content webhook-test.json -Raw
$secret = "YOUR_WR_API_KEY_HERE"  # Replace with your actual WR_API_KEY

# Calculate HMAC-SHA256
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($secret)
$signature = [System.BitConverter]::ToString($hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($jsonFile))).Replace("-","").ToLower()

Write-Host "Signature: $signature"
```

**On Linux/Mac**:

```bash
PAYLOAD=$(cat webhook-test.json)
SECRET="YOUR_WR_API_KEY_HERE"
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
echo "Signature: $SIGNATURE"
```

### Step 4: Send Webhook to Your Server

**Start your server first**:
```bash
node server.js
```

**Then send the webhook** (in new PowerShell window):

```powershell
$payload = Get-Content webhook-test.json -Raw
$signature = "PASTE_SIGNATURE_HERE"  # from Step 3

$headers = @{
    "Content-Type" = "application/json"
    "X-Premiy-Signature" = $signature
}

Invoke-WebRequest `
  -Uri "http://localhost:3000/webhook/wr" `
  -Method POST `
  -Headers $headers `
  -Body $payload
```

### Step 5: Verify Results

**Check server logs**:
- Look for: `[Webhook] ✅ Signature validated`
- Look for: `[Webhook] ✅ Order updated successfully`

**Check database**:
```sql
SELECT 
  id,
  status,
  account_details
FROM orders 
WHERE id = 'RBHN-TEST-001';
```

Expected output:
- `status`: changed from 'processing' to 'done'
- `account_details`: Contains the JSON array with credentials

**Check Telegram notification**:
- Admin should receive message with order ID and details
- Look for emoji: ✅ "Webhook: order-completed"

---

## Method 2: Using HTML Tester (Browser)

If there's a `public/webhook-tester.html` file:

1. Open in browser: `http://localhost:3000/webhook-tester.html`
2. Fill in fields:
   - Event: `order-completed`
   - Order ID: `RBHN-TEST-001`
   - JSON Payload: (copy-paste full data section from above)
3. Click "Send Test Webhook"
4. Check results in console/logs

---

## Method 3: Using Postman

### Import Configuration

1. Open Postman
2. Create new Request:
   - **Method**: POST
   - **URL**: `http://localhost:3000/webhook/wr`

3. **Headers** tab:
   - Add: `Content-Type: application/json`
   - Add: `X-Premiy-Signature: {signature_from_step3}`

4. **Body** tab:
   - Select "raw"
   - Select "JSON"
   - Paste webhook-test.json content

5. Click "Send"

6. Check response (should be `{"success": true}`

---

## Debugging Webhook Issues

### Issue: Signature Validation Failed

```
logs: [Webhook] ❌ Invalid signature! (len: 64 vs 65)
```

**Solution**:
1. Verify WR_API_KEY is correct: 
   ```
   echo $env:WR_API_KEY  # PowerShell
   ```
2. Recalculate signature with exact same payload (no extra spaces)
3. Ensure payload is raw JSON, not parsed

### Issue: Signature Header Not Found

```
logs: [Webhook] ⚠️ No signature header found
```

**In Development**: This is OK - logs warning but processes anyway
**In Production** (`NODE_ENV=production`): Returns 401

**Solution**:
- Check you're sending header correctly
- Verify header name (try: `x-premiy-signature`, `X-Premiy-Signature`, `signature`)

### Issue: Order Not Found

```
logs: [Webhook] ❌ Order not found: RBHN-TEST-001
```

**Solution**:
1. Verify order exists in database
2. Check order ID matches exactly (case-sensitive)
3. Create test order manually (see Step 1)

### Issue: JSON Parse Error

```
logs: [Webhook] ❌ Failed to parse JSON
```

**Solution**:
1. Verify JSON is valid (use https://jsonlint.com/)
2. Ensure no extra whitespace or special characters
3. Check Content-Type header is `application/json`

---

## Testing Different Event Types

### Test "order-processing" Event

```json
{
  "event": "order-processing",
  "data": {
    "order_id": "RBHN-TEST-002",
    "status": "processing"
  }
}
```

**Expected**: Order status → 'processing'

### Test "order-failed" Event

```json
{
  "event": "order-failed",
  "data": {
    "order_id": "RBHN-TEST-003",
    "status": "failed",
    "reason": "Out of stock"
  }
}
```

**Expected**: Order status → 'failed'

### Test Object Format Account Details (Legacy)

```json
{
  "event": "order-completed",
  "data": {
    "order_id": "RBHN-TEST-004",
    "status": "completed",
    "account_details": {
      "Email": "legacy@example.com",
      "Password": "legacypass123"
    }
  }
}
```

**Expected**: 
- Status → 'done'
- Account details stored as object
- Frontend still displays correctly (formatAccountDetails handles both)

---

## Checking Order in Dashboard

### User View
1. Login as any user
2. Click "Pesanan" (Orders)
3. Click order with credentials
4. Should see formatted account details in modal

### Admin View
1. Login as admin
2. Click "Orders" menu
3. Click order row
4. Should see credentials in admin interface
5. Can send via WhatsApp from here

---

## Log Reference

### Full Webhook Processing Log

```
[Webhook] 📥 Request received
[Webhook] Raw body (buffer): {"event":"order-completed"...
[Webhook] ✓ Signature header found: abc123def...
[Webhook] Expected sig: abc123def456...
[Webhook] Got sig:      abc123def456...
[Webhook] ✅ Signature validated
[Webhook] ✓ Payload parsed: event=order-completed, order=RBHN-TEST-001
[Webhook] 🔄 Processing: event=order-completed, order=RBHN-TEST-001, status=completed
[Webhook] ✅ Order RBHN-TEST-001 updated successfully
[Webhook] Lock released for RBHN-TEST-001
```

### If Any Error Occurs

```
[Webhook] ❌ [SPECIFIC_ERROR]
[Webhook] Stack: [ERROR_STACK_TRACE]
```

---

## Next: Testing with Real WR API

Once you get IP whitelist from WR support:

1. Create a real order through your order form
2. Wait for webhook notification from WR
3. Check logs for:
   - Webhook received
   - Signature validated
   - Order updated
   - Telegram notification
4. Refresh dashboard
5. Verify credentials appear

---

## Quick Reference: Signature Calculation

**Purpose**: Verify webhook came from WR and wasn't tampered with

**Formula**: 
```
HMAC-SHA256(raw_body, WR_API_KEY) = expected_signature
```

**Testing Signature Locally** (PowerShell):
```powershell
$data = Get-Content webhook-test.json -Raw
$key = [System.Text.Encoding]::UTF8.GetBytes("YOUR_WR_API_KEY")
$hmac = New-Object System.Security.Cryptography.HMACSHA256 -ArgumentList $key
$signature = [System.Convert]::ToHexString($hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($data))).ToLower()
$signature
```

---

## Troubleshooting Checklist

- [ ] Server is running on port 3000
- [ ] Test order exists in database
- [ ] WR_API_KEY environment variable set
- [ ] JSON payload is valid
- [ ] Signature calculated with correct secret
- [ ] Using raw body for signature (not parsed)
- [ ] Content-Type header is application/json
- [ ] Order ID in payload matches database
- [ ] Telegram bot token configured
- [ ] Database connection working

---

**Last Updated**: 2024
**Purpose**: Local webhook testing without IP whitelist
**Success Rate**: Should see "✅ Order updated successfully" in logs
