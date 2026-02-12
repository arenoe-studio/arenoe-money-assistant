# Panduan Setup Google Sheets Integration

Fitur ini memungkinkan sinkronisasi **dua arah** antara Bot dan Google Sheets:

- 📱 **Telegram → Sheets**: Semua transaksi (expense, income, transfer, debt) otomatis tercatat di Google Sheets
- 📊 **Sheets → Bot**: Edit atau tambah baris baru di Sheets → otomatis update/insert ke database bot

---

## Bagian A: Setup untuk Telegram → Sheets (OAuth2)

### 1. Buat Project di Google Cloud Console

1. Kunjungi [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru (misal: "Money Assistant Bot")
3. Enable **Google Sheets API**:
   - Search "Google Sheets API" di library
   - Klik **Enable**
4. Buat OAuth 2.0 Credentials:
   - Sidebar: **APIs & Services** > **Credentials**
   - **Create Credentials** > **OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://[YOUR-APP].koyeb.app/oauth2callback`
   - Copy `Client ID` dan `Client Secret`

### 2. Konfigurasi Environment Variables di Koyeb

Tambahkan environment variables di Koyeb dashboard:

- `GOOGLE_CLIENT_ID`: Client ID dari GCP
- `GOOGLE_CLIENT_SECRET`: Client Secret dari GCP
- `GOOGLE_REDIRECT_URI`: `https://[YOUR-APP].koyeb.app/oauth2callback`
- `WEBHOOK_SECRET`: Password/secret untuk memverifikasi webhook dari Apps Script

### 3. Hubungkan Bot dengan Google Sheets

1. Di Telegram, ketik `/connectsheets`
2. Klik link OAuth yang diberikan bot
3. Login dengan akun Google Anda & izinkan akses
4. Setelah berhasil, kirim ID Spreadsheet dengan: `/setsheet SPREADSHEET_ID`

✅ Sekarang setiap transaksi dari bot (expense, income, transfer, debt) akan masuk ke Google Sheets!

---

## Bagian B: Setup untuk Sheets → Bot (Webhook)

### 1. Persiapan Google Sheet

1. Buka Google Sheets baru atau yang sudah ada.
2. Pastikan sheet pertama bernama `Transactions`.
3. Buat header row di baris 1 dengan kolom berikut:
   - **A**: Transaction ID (Auto-generated jika kosong)
   - **B**: Items
   - **C**: Harga (Angka)
   - **D**: Nama Toko
   - **E**: Metode Pembayaran
   - **F**: Tanggal (Format: YYYY-MM-DD)
   - **G**: Type (expense / income / transfer / debt)

### 2. Setup Google Apps Script

1. Di Google Sheets, klik menu **Extensions** > **Apps Script**.
2. Hapus semua code di file `Code.gs`.
3. Copy-paste isi file `GOOGLE_APPS_SCRIPT.js` dari repository ini.

### 3. Konfigurasi Script Properties

1. Di editor Apps Script, klik icon **Project Settings** (Gerigi).
2. Scroll ke bawah ke **Script Properties**.
3. Tambahkan 3 property:
   - `WEBHOOK_URL`: URL deployment Anda (contoh: `https://your-app.koyeb.app`) — **tanpa trailing slash**
   - `WEBHOOK_SECRET`: Secret yang sama dengan yang di-set di Koyeb env `WEBHOOK_SECRET`
   - `TELEGRAM_ID`: ID Telegram Anda (angka)

### 4. Setup Trigger (WAJIB! - Tidak Otomatis Setelah Deploy)

**PENTING**: Trigger TIDAK akan aktif otomatis setelah deploy. Anda HARUS setup manual.

Ada dua cara:

**Cara 1: Otomatis via Script (Rekomendasi)**

1. Di editor Apps Script, pilih fungsi `setupTrigger` dari dropdown di toolbar.
2. Klik tombol **Run** (▶️).
3. Saat pertama kali, Google akan minta izin:
   - Klik **Review Permissions**
   - Pilih akun Google Anda
   - Klik **Advanced** > **Go to [Project Name] (unsafe)**
   - Klik **Allow**
4. Setelah selesai, cek **Executions** (ikon jam) untuk memastikan tidak ada error.
5. Cek **Triggers** (ikon jam) untuk memastikan trigger `onSheetEdit` sudah terbuat.

**Cara 2: Manual**

1. Klik menu **Triggers** (gambar jam di sidebar kiri).
2. Klik **Add Trigger** (kanan bawah).
3. Pilih:
   - Function: `onSheetEdit`
   - Event source: `From spreadsheet`
   - Event type: `On edit`
4. Klik **Save** dan izinkan permission.

**Verifikasi Trigger Aktif:**

1. Buka menu **Triggers** (ikon jam).
2. Pastikan ada trigger dengan:
   - Function: `onSheetEdit`
   - Event: From spreadsheet / On edit
   - Status: Enabled (tidak ada tanda error)

**Jika Trigger Tidak Jalan:**

- Edit cell di sheet Transactions (bukan header row)
- Buka **Executions** (ikon jam) untuk lihat log
- Jika ada error "Missing Script Properties", cek kembali step 3
- Jika ada error "Unauthorized", cek `WEBHOOK_SECRET` di Koyeb dan Apps Script harus sama

### 5. Fitur Sinkronisasi

#### Edit di Sheets → Update di Bot

- Edit cell di row yang sudah ada (yang memiliki Transaction ID dari bot)
- Perubahan Items, Harga, Metode Pembayaran, dll akan otomatis update di database bot
- Saldo juga akan disesuaikan otomatis (revert lama, apply baru)

#### Tambah Row Baru di Sheets → Insert di Bot

- Tambahkan row baru di sheet Transactions
- Isi minimal: Items (B), Harga (C), dan Type (G)
- Transaction ID (A) akan auto-generated jika dikosongkan
- Row baru akan otomatis masuk ke database bot dan saldo disesuaikan

### 6. Troubleshooting

- **Webhook tidak terkirim?** Pastikan trigger sudah di-setup dan permission sudah diberikan
- **Response 401?** Pastikan `WEBHOOK_SECRET` di Apps Script Properties sama dengan `WEBHOOK_SECRET` di Koyeb env
- **Saldo tidak berubah?** Pastikan kolom Type (G) diisi dengan benar (expense/income/transfer/debt)
- **Transaction ID kosong?** Script akan otomatis membuat UUID, tidak perlu diisi manual
