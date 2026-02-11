# Panduan Setup Google Sheets Integration

Fitur ini memungkinkan perubahan data di Google Sheets (Edit/Update) tersinkronisasi otomatis ke Database Bot.

## 1. Persiapan Google Sheet

1. Buka Google Sheets baru atau yang sudah ada.
2. Pastikan sheet pertama bernama `Transactions`.
3. Buat header row di baris 1 dengan kolom berikut:
   - **A**: Transaction ID (Jangan diubah manual)
   - **B**: Items
   - **C**: Harga (Angka)
   - **D**: Nama Toko
   - **E**: Metode Pembayaran
   - **F**: Tanggal (Format: YYYY-MM-DD)
   - **G**: Type (expense / income / transfer / debt)

## 2. Setup Google Apps Script

1. Di Google Sheets, klik menu **Extensions** > **Apps Script**.
2. Hapus semua code di file `Code.gs`.
3. Copy-paste code berikut:

```javascript
/*
 * COPY CODE BELOW
 * GANTI 'WEBHOOK_URL' DENGAN URL DEPLOYMENT ANDA
 */
const CONFIG = {
  WEBHOOK_URL: "https://[YOUR_APP_URL]/webhook/sheets-sync",
};

function onEdit(e) {
  // Hanya proses edit manual oleh user, bukan script lain
  if (!e) return;

  const sheet = e.source.getActiveSheet();

  if (sheet.getName() !== "Transactions") return;

  const range = e.range;
  const row = range.getRow();

  // Skip header
  if (row === 1) return;

  const sheetData = sheet.getRange(row, 1, 1, 7).getValues()[0];

  // Ambil atau Generate Transaction ID (Kolom A)
  let txId = sheetData[0];
  if (!txId) {
    txId = Utilities.getUuid();
    sheet.getRange(row, 1).setValue(txId);
  }

  // Ambil credentials dari Script Properties
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty("WEBHOOK_SECRET");
  const telegramId = props.getProperty("TELEGRAM_ID");

  if (!secret || !telegramId) {
    Logger.log("MISSING CONFIG: WEBHOOK_SECRET or TELEGRAM_ID");
    return;
  }

  const payload = {
    telegramId: parseInt(telegramId),
    sheetRowId: row.toString(),
    transactionId: txId,
    items: sheetData[1],
    harga: Number(sheetData[2]),
    namaToko: sheetData[3],
    metodePembayaran: sheetData[4],
    tanggal: sheetData[5], // Google Sheets Date Object usually
    type: sheetData[6] || "expense",
  };

  sendWebhook(payload, secret);
}

function sendWebhook(payload, secret) {
  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "X-Webhook-Secret": secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
  } catch (err) {
    Logger.log("Sync Error: " + err);
  }
}
```

## 3. Konfigurasi Script Properties

1. Di editor Apps Script, klik icon **Project Settings** (Gerigi).
2. Scroll ke bawah ke **Script Properties**.
3. Tambahkan:
   - `WEBHOOK_SECRET`: (Buat sendiri password yg aman)
   - `TELEGRAM_ID`: (ID Telegram Anda)

## 4. Setup Trigger (Wajib!)

Karena `UrlFetchApp` butuh permission khusus, kita tidak bisa pakai `Simple Trigger` (onEdit bawaan). Kita harus buat `Installable Trigger`.

1. Klik menu **Triggers** (gambar jam).
2. **Add Trigger** > Function: `onEdit` > Event source: `From spreadsheet` > Event type: `On edit`.
3. Save dan Allow permission.

## 5. Konfigurasi Database Bot

Bot harus tahu secret yang Anda buat tadi.
Jalankan command SQL ini di NEON Console (atau minta tolong developer):

```sql
UPDATE users SET webhook_secret = 'ISI_SECRET_ANDA_DISINI' WHERE telegram_id = [TELEGRAM_ID_ANDA];
```

Sekarang coba edit data di sheet, dan cek apakah terupdate di bot!
