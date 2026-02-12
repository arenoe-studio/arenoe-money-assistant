# Debug Sheets → Neon Sync

## Step 1: Cek Apps Script Logs

1. Buka Google Sheets → Extensions → Apps Script
2. Klik **Executions** (ikon jam di sidebar kiri)
3. Edit satu cell di sheet Transactions (bukan header)
4. Refresh Executions page
5. Lihat apakah ada execution baru untuk `onSheetEdit`

**Yang harus muncul:**

- ✅ Status: Completed
- ✅ Function: onSheetEdit
- ✅ Duration: < 5 detik

**Jika ada error:**

- ❌ "Missing Script Properties" → Cek step 2
- ❌ "Authorization required" → Run setupTrigger() lagi dan allow permissions
- ❌ Network error → Cek WEBHOOK_URL

## Step 2: Verifikasi Script Properties

Di Apps Script editor:

1. Klik **Project Settings** (ikon gerigi)
2. Scroll ke **Script Properties**
3. Pastikan ada 3 properties:

```
WEBHOOK_URL = https://your-app.koyeb.app (TANPA trailing slash)
WEBHOOK_SECRET = [secret yang sama dengan di Koyeb]
TELEGRAM_ID = [ID Telegram Anda, angka]
```

## Step 3: Test Manual Webhook

Buka terminal dan jalankan:

```bash
curl -X POST https://your-app.koyeb.app/webhook/sheets-sync \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_SECRET" \
  -d '{
    "telegramId": YOUR_TELEGRAM_ID,
    "sheetRowId": "2",
    "transactionId": "test-123",
    "items": "Test Item",
    "harga": 10000,
    "namaToko": "Test Store",
    "metodePembayaran": "Cash",
    "tanggal": "2026-02-12",
    "type": "expense"
  }'
```

**Expected response:**

```json
{ "success": true }
```

**Jika error:**

- 401 → WEBHOOK_SECRET tidak match
- 400 → Payload format salah
- 500 → Server error (cek Koyeb logs)

## Step 4: Cek Koyeb Logs

1. Buka Koyeb Dashboard → Your App → Logs
2. Edit cell di Sheets
3. Lihat apakah ada log masuk:

**Yang harus muncul:**

```
[INFO] Sync: Processing webhook for transaction [ID]
[INFO] Sync: Updating transaction [ID] for user [TELEGRAM_ID]
[INFO] Sync: Successfully updated transaction [ID]
```

**Jika tidak ada log sama sekali:**

- Webhook tidak sampai ke server
- Cek WEBHOOK_URL di Script Properties

**Jika ada error log:**

- Copy error message untuk debugging

## Step 5: Cek Database

Jalankan query di Neon Console:

```sql
-- Cek apakah user ada
SELECT * FROM users WHERE telegram_id = YOUR_TELEGRAM_ID;

-- Cek transaksi terbaru
SELECT * FROM transactions
WHERE user_id = (SELECT id FROM users WHERE telegram_id = YOUR_TELEGRAM_ID)
ORDER BY created_at DESC
LIMIT 5;
```

## Common Issues & Solutions

### Issue 1: "Webhook tidak sampai ke Koyeb"

**Penyebab:** WEBHOOK_URL salah atau Apps Script tidak punya permission
**Solusi:**

1. Cek WEBHOOK_URL tidak ada typo
2. Pastikan tidak ada trailing slash
3. Re-run setupTrigger() dan allow all permissions

### Issue 2: "401 Unauthorized"

**Penyebab:** WEBHOOK_SECRET tidak match
**Solusi:**

1. Copy WEBHOOK_SECRET dari Koyeb env vars
2. Paste exact ke Apps Script properties
3. Redeploy Koyeb jika perlu

### Issue 3: "Transaction not found in DB"

**Penyebab:** Transaction ID tidak ada di database
**Solusi:**

- Fitur ini hanya untuk UPDATE transaksi yang sudah ada dari bot
- Untuk INSERT baris baru, pastikan TELEGRAM_ID ada di payload

### Issue 4: "Trigger tidak jalan"

**Penyebab:** Trigger belum di-setup atau permission belum di-allow
**Solusi:**

1. Buka Triggers (ikon jam)
2. Pastikan ada trigger `onSheetEdit` dengan status Enabled
3. Jika tidak ada, run setupTrigger() lagi

## Quick Fix: Disable Fitur Ini

Jika tidak butuh sync Sheets → Neon, bisa disable:

1. Di Apps Script, hapus semua triggers (via Triggers menu)
2. Atau comment out isi function onSheetEdit:

```javascript
function onSheetEdit(e) {
  // Disabled - sync Sheets to Neon not needed
  return;
}
```

Bot tetap akan sync Neon → Sheets (satu arah).
