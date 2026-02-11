# Manual Testing Checklist

Gunakan checklist ini untuk memverifikasi fungsionalitas bot secara manual di Telegram dan Google Sheets.

## 1. Setup & Basic Flow

- [ ] **Startup**: Pastikan bot online (`/start` merespons).
- [ ] **Bot Info**: `/status` menampilkan "State: Idle".
- [ ] **Help**: `/help` menampilkan daftar perintah yang benar.

## 2. Core Transaction (Pencatatan)

### A. Kalimat Lengkap (Natural Language)

_Input_: "Nasi Goreng 15k di Warteg Bahari pakai Cash"

- [ ] Bot membalas dengan **Konfirmasi**.
- [ ] Data Valid: Item (Nasi Goreng), Harga (15.000), Toko (Warteg Bahari), Metode (Cash).
- [ ] Klik **✅ YA**. Balasan: "✅ Tercatat!".
- [ ] Cek `/laporan`: Transaksi harus muncul.

### B. Input Parsial (Interaktif)

_Input_: "Beli Pulsa 50rb"

- [ ] Bot tanya: "Beli di mana?" → Jawab: "Indomaret".
- [ ] Bot tanya: "Bayar pakai apa?" → Jawab: "OVO".
- [ ] Konfirmasi muncul dengan data lengkap.

### C. Error Handling

- [ ] **Harga Kosong**: "Makan siang" → Bot tolak ("Harga/Item tidak ditemukan").
- [ ] **Metode Salah**: Jawab "Daun" saat ditanya metode bayar → Bot minta ulang.
- [ ] **Cancel**: Ketik `/cancel` atau klik tombol "Batal" saat konfirmasi → Transaksi dibatalkan.

## 3. Fitur Keuangan

- [ ] **Cek Saldo**: `/cek` menampilkan saldo per metode pembayaran.
- [ ] **Set Saldo**: `/setting` > Set Saldo Awal. Update saldo OVO jadi 500k. Cek `/cek` lagi.
- [ ] **Hutang (PayLater)**:
  - Input: "Hutang ke Budi 100k beli pulsa".
  - Masuk ke menu PayLater? Atau tercatat sebagai Expense biasa tipe Debt?
  - Cek command `/paylater`.
- [ ] **Laporan**: `/laporan` > Pilih "Bulan Ini". Pastikan total sesuai.

## 4. Google Sheets Sync

- [ ] **Create from Sheet**:
  - Buka Google Sheet "Transactions".
  - Isi baris baru manual (Item: "Test Sheet", Harga: 12345, dll).
  - Tunggu ~5 detik. Cek di bot (Laporan hari ini).
- [ ] **Update from Sheet**:
  - Ubah harga transaksi "Test Sheet" jadi 50000.
  - Cek di bot apakah harga terupdate.
  - Cek saldo Cash (jika pakai Cash), apakah terpotong sesuai harga baru.

## 5. Edge Cases

- [ ] **Timeout**: Diamkan bot saat flow aktif selama 3 menit → Bot harus reset ke Idle.
- [ ] **Emoji**: Input dengan emoji "🍔 Burger 50k" → Bot harus tetap bisa parsing.
