# WR API Webhook Integration Guide

## Overview
This guide documents the webhook integration with Warung Rebahan (WR) API, including expected payload formats, validation, and testing procedures.

## Webhook Configuration

### Endpoint
- **URL**: `{YOUR_APP_URL}/webhook/wr`
- **Method**: POST
- **Content-Type**: application/json

### Example Webhook URL
```
https://www.langganin.my.id/webhook/wr
```

## Expected Webhook Payload Format

### order-completed Event
```json
{
  "event": "order-completed",
  "data": {
    "order_id": "RBHN-20260318-XXXXXX",
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
                "value": "user@example.com"
              },
              {
                "label": "Password",
                "value": "SecurePass123!"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### order-processing Event
```json
{
  "event": "order-processing",
  "data": {
    "order_id": "RBHN-20260318-XXXXXX",
    "status": "processing"
  }
}
```

### order-failed Event
```json
{
  "event": "order-failed",
  "data": {
    "order_id": "RBHN-20260318-XXXXXX",
    "status": "failed",
    "reason": "Insufficient stock"
  }
}
```

## Event Mapping

| WR Event | System Status | Action |
|----------|---------------|--------|
| order-processing | processing | Store order, wait for credentials |
| order-completed | done | Store credentials, notify admin |
| order-failed | failed | Mark failed, notify admin |

## Signature Validation

### How It Works
1. WR API sends webhook with `X-Premiy-Signature` header (or similar variant)
2. Signature is HMAC-SHA256 of the **raw request body**
3. Secret key is your `WR_API_KEY`

### Signature Algorithm
```javascript
signature = HMAC-SHA256(raw_body, WR_API_KEY)
```

### Supported Header Names
The system checks for these signature header formats (in order):
- `http_x_premiy_signature`
- `x-premiy-signature`
- `x-signature`
- `signature`
- `x-warung-signature`
- `x-webhook-signature`

### Development Mode
- In **development** (`NODE_ENV !== 'production'`): Missing signature header logs a warning but allows processing
- In **production** (`NODE_ENV === 'production'`): Missing signature returns 401 Unauthorized

## Account Details Processing

### Input Format (from WR)
```javascript
account_details: [
  {
    product: "Service Name",
    details: [
      {
        title: "Account 1",
        credentials: [
          { label: "Email", value: "..." },
          { label: "Password", value: "..." },
          { label: "Other Info", value: "..." }
        ]
      }
    ]
  }
]
```

### Storage Format
Stored as-is in PostgreSQL JSONB column without modification.

### Display Format (Frontend)
The `formatAccountDetails()` function in both `orders.html` and `admin.html`:
- Accepts both array (WR format) and object (legacy format)
- Renders HTML table with product, account name, and credentials
- Safely escapes HTML to prevent XSS

## Database Updates

### Atomic Update
When webhook is processed:
```sql
UPDATE orders 
SET 
  status = 'done',
  account_details = {array or object},
  updated_at = NOW()
WHERE id = {order_id}
```

### Telegram Notification
Admin receives:
- Order ID
- Event type
- Formatted credentials (if present)
- Processing status and any errors

## Race Condition Prevention

### Lock Manager
The system uses `lockManager` to prevent simultaneous processing by:
1. **Background task** (tries to fetch credentials with retries)
2. **Webhook handler** (tries to process incoming webhook)

### Logic
If either is processing an order, the other waits and returns success to avoid duplicate updates.

## Testing Webhook

### Manual Test with curl

1. **Generate Test Payload**
```bash
# Raw JSON payload
PAYLOAD='{"event":"order-completed","data":{"order_id":"RBHN-TEST-001","status":"completed","account_details":[{"product":"Test Product","details":[{"title":"Test Account","credentials":[{"label":"Email","value":"test@example.com"},{"label":"Password","value":"testpass123"}]}]}]}}'
```

2. **Calculate Signature** (using your WR_API_KEY)
```bash
# If WR_API_KEY = "your_api_key_here"
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "your_api_key_here" | awk '{print $2}')
echo $SIGNATURE
```

3. **Send Webhook Request**
```bash
curl -X POST https://www.langganin.my.id/webhook/wr \
  -H "Content-Type: application/json" \
  -H "X-Premiy-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### Using Webhook Testing Tool
1. Navigate to `http://localhost:3000/webhook-test` (if available)
2. Fill in:
   - Event: order-completed
   - Order ID: RBHN-TEST-001
   - Account Details: (copy from order in database)
3. Click "Send Test Webhook"

## Server Logs

### Webhook Logging
Enable detailed webhook logging:
```
[Webhook] 📥 Request received
[Webhook] ✓ Signature header found: xxx...
[Webhook] ✅ Signature validated
[Webhook] 🔄 Processing: event=order-completed, order=RBHN-XXX
[Webhook] ✅ Order updated successfully
```

### Debug Logs
Check `logger.debug()` for:
- Raw payload preview
- Calculated vs received signature
- Parsed data structure
- Lock acquisition/release

## Troubleshooting

### ❌ "Missing signature header"
- **Cause**: WR not sending signature header
- **Solution**: Verify webhook header name with WR support
- **Dev Mode**: Works without signature (logs warning)

### ❌ "Invalid signature"
- **Cause**: Signature calculation mismatch
- **Check**: 
  1. Is raw body being used (not parsed JSON)?
  2. Is WR_API_KEY correct?
  3. Are both sides using SHA256?

### ❌ "Missing order_id"
- **Cause**: Webhook payload missing order_id
- **Check**: WR webhook payload structure

### ❌ Order not found
- **Cause**: Order ID in webhook doesn't exist in database
- **Solution**: 
  1. Verify order was created successfully
  2. Check order ID format matches
  3. Review WR order creation response

### ⚠️ "Order already being processed"
- **Normal**: Webhook received while background task fetching credentials
- **Result**: One handler processes, other returns success (no duplicate update)

## Environment Variables

### Required
```env
WR_API_KEY=your_api_key_from_wr
WR_API_URL=https://warungrebahan.com/api/v1
```

### Optional
```env
NODE_ENV=production  # Enables strict signature validation
TELEGRAM_USE_WEBHOOK=false  # Use polling (recommended for now)
```

## Production Checklist

- [ ] WR API IP address whitelisted (request from WR support)
- [ ] `WR_API_KEY` set in environment
- [ ] `NODE_ENV=production` set
- [ ] Webhook URL is valid and publicly accessible (HTTPS)
- [ ] SSL certificate valid
- [ ] Signature validation working (test first webhook)
- [ ] Admin Telegram bot configured
- [ ] Database connection stable
- [ ] Logs being monitored

## Support

If webhook is not working:
1. Check server logs for webhook processing messages
2. Verify payload format matches WR documentation
3. Test signature calculation manually
4. Contact WR support with:
   - Timestamp of failed webhook
   - Webhook payload
   - Server response
   - Error logs

---

**Last Updated**: 2024
**Version**: 2.0 (Array Format Support)
