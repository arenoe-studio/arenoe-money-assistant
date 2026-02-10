# Skenario Testing - Telegram AI Finance Tracker

## A. BASIC FLOW

### A1. Happy Path - Lengkap
1. `makan ayam geprek 25k di Warteg pakai Cash`
2. Klik ✅ YA

### A2. Input Bertahap - Tanpa Merchant & Payment
1. `ayam bakar 20k`
2. `Warung Mbok Sri`
3. `OVO`
4. Klik ✅ YA

### A3. Input Bertahap - Tanpa Merchant
1. `es teh 5k pakai GoPay`
2. `Indomaret`
3. Klik ✅ YA

### A4. Input Bertahap - Tanpa Payment
1. `nasi goreng 15k di Warteg Bahari`
2. `DANA`
3. Klik ✅ YA

### A5. Multiple Items
1. `ayam geprek 25k, es teh 5k, kerupuk 3k`
2. `Warteg`
3. `Cash`
4. Klik ✅ YA

---

## B. EDIT/CORRECTION FLOW

### B1. Edit Merchant
1. `makan soto 20k`
2. `Warung A`
3. `Cash`
4. Klik ❌ TIDAK
5. Klik 🏪 Ganti Toko
6. `Warung B`
7. Klik ✅ YA

### B2. Edit Payment Method
1. `bakso 18k di Warung Mbok`
2. `OVO`
3. Klik ❌ TIDAK
4. Klik 💳 Ganti Metode Pembayaran
5. `Cash`
6. Klik ✅ YA

### B3. Edit Date
1. `mie ayam 15k di Warteg pakai Cash`
2. Klik ❌ TIDAK
3. Klik 📅 Ganti Tanggal
4. `15 Januari 2026`
5. Klik ✅ YA

### B4. Cancel Edit (Kembali Konfirmasi)
1. `nasi uduk 12k`
2. `Warung`
3. `Cash`
4. Klik ❌ TIDAK
5. Klik ❌ Batal
6. Klik ✅ YA

### B5. Cancel Transaction
1. `ayam goreng 22k di Warteg pakai OVO`
2. Klik 🗑 Batal Catat

---

## C. ERROR HANDLING

### C1. Input Tidak Jelas
1. `67k`
2. `ayam geprek 25k`
3. `Warteg`
4. `Cash`
5. Klik ✅ YA

### C2. Hanya Angka
1. `15000`
2. `beli nasi goreng 15k di Warteg pakai Cash`
3. Klik ✅ YA

### C3. Hanya Verb + Price
1. `makan 16k`
2. `makan ayam geprek 16k di Warteg pakai Cash`
3. Klik ✅ YA

### C4. Item Tanpa Harga
1. `ayam geprek`
2. `ayam geprek 25k`
3. `Warteg`
4. `Cash`
5. Klik ✅ YA

### C5. Merchant Invalid (Retry 2x)
1. `ayam bakar 20k`
2. `123` (invalid)
3. `makan` (invalid)
4. Skip merchant, lanjut payment
5. `Cash`
6. Klik ✅ YA

### C6. Payment Invalid (Retry 2x)
1. `nasi goreng 15k di Warteg`
2. `abc` (invalid)
3. `12345` (invalid)
4. Skip payment, lanjut konfirmasi
5. Klik ✅ YA

---

## D. PHOTO/IMAGE RECEIPT

### D1. Receipt Photo - Valid
1. Kirim foto struk jelas
2. Konfirmasi data
3. Klik ✅ YA

### D2. Receipt Photo - Blur
1. Kirim foto struk blur
2. (Harusnya error: foto tidak jelas)

### D3. Receipt Photo - Bukan Struk
1. Kirim foto random (bukan struk)
2. (Harusnya error: bukan struk)

---

## E. COMMAND TESTING

### E1. /start
1. `/start`

### E2. /help
1. `/help`

### E3. /cancel (During Transaction)
1. `ayam geprek 25k`
2. `/cancel`

### E4. /status (Idle)
1. `/status`

### E5. /status (During Transaction)
1. `nasi goreng 15k`
2. `/status`

### E6. /debug - Turn OFF
1. `/debug`
2. Klik Debug: OFF
3. `ayam bakar 20k di Warteg pakai Cash`
4. Klik ✅ YA
5. (Validasi: tidak ada pesan debug)

### E7. /debug - Turn ON
1. `/debug`
2. Klik Debug: ON
3. `es teh 5k`
4. `Indomaret`
5. `Cash`
6. Klik ✅ YA
7. (Validasi: ada pesan debug)

---

## F. TIMEOUT TESTING

### F1. Timeout Merchant (Wait 3+ menit)
1. `ayam geprek 25k`
2. Tunggu 3 menit
3. `Warteg` (harusnya timeout)

### F2. Timeout Payment (Wait 3+ menit)
1. `nasi goreng 15k di Warteg`
2. Tunggu 3 menit
3. `Cash` (harusnya timeout)

### F3. Timeout Final Confirm (Wait 6+ menit)
1. `bakso 18k di Warung pakai OVO`
2. Tunggu 6 menit
3. Klik ✅ YA (harusnya timeout)

---

## G. EDGE CASES

### G1. Multiple Transactions Parallel
1. `ayam geprek 25k di Warteg pakai Cash`
2. Klik ✅ YA
3. Langsung: `es teh 5k di Indomaret pakai OVO`
4. Klik ✅ YA

### G2. Very Long Item Name
1. `ayam geprek sambal matah extra pedas dengan nasi putih hangat 35k di Warteg pakai Cash`
2. Klik ✅ YA

### G3. Special Characters in Merchant
1. `nasi goreng 15k`
2. `Warteg "Pak Bambang" & Co.`
3. `Cash`
4. Klik ✅ YA

### G4. Price Format Variations
1. `ayam bakar 25000 (bukan k)`
2. `Warteg`
3. `Cash`
4. Klik ✅ YA

### G5. Price Format - "rb" / "ribu"
1. `es teh 5rb, kopi 10ribu`
2. `Warung`
3. `Cash`
4. Klik ✅ YA

---

## H. GOOGLE SHEETS VALIDATION

### H1. Single Item - Verify Sheets
1. `ayam geprek 25k di Warteg pakai Cash`
2. Klik ✅ YA
3. Cek Sheets: 1 row

### H2. Multiple Items - Verify Sheets
1. `ayam geprek 25k, es teh 5k, kerupuk 3k di Warteg pakai Cash`
2. Klik ✅ YA
3. Cek Sheets: 3 rows (same timestamp, merchant, payment)

### H3. Transaction ID Unique
1. `nasi goreng 15k di Warteg pakai Cash`
2. Klik ✅ YA
3. `ayam bakar 20k di Warung pakai OVO`
4. Klik ✅ YA
5. Cek Sheets: 2 transaction IDs berbeda

---

## I. STRESS TESTING

### I1. Rapid Input (10x)
Kirim 10 transaksi berturut-turut tanpa jeda:
1. `ayam geprek 25k di Warteg pakai Cash` → YA
2. `es teh 5k di Indomaret pakai OVO` → YA
3. `nasi goreng 15k di Warung pakai DANA` → YA
4. ... (7x lagi)

### I2. Cancel Multiple Times
1. `ayam bakar 20k`
2. `Warteg`
3. `Cash`
4. Klik ❌ TIDAK
5. Klik 🏪 Ganti Toko
6. Klik ❌ Batal
7. Klik ❌ TIDAK
8. Klik 💳 Ganti Metode Pembayaran
9. Klik ❌ Batal
10. Klik ✅ YA

---

## J. REGRESSION TESTING

### J1. Full Flow After Debug OFF
1. `/debug` → OFF
2. `ayam geprek 25k di Warteg pakai Cash`
3. Klik ✅ YA
4. Cek Sheets: data tersimpan

### J2. Full Flow After Timeout
1. `nasi goreng 15k`
2. Tunggu timeout
3. `ayam bakar 20k di Warteg pakai Cash`
4. Klik ✅ YA
5. Cek Sheets: hanya transaksi ke-2 tersimpan
