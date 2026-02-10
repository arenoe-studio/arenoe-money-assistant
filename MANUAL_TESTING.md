# Manual Testing Checklist for Money Assistant Bot

Use this checklist to verify the bot functionality manually in Telegram.

## 1. Setup Verification

- [ ] **Startup**: Run `npm run start`. Verify logs show "Bot is online".
- [ ] **Database**: Verify database connection text in logs.
- [ ] **Bot Info**: Send `/status` to the bot. It should reply with State: Idle.

## 2. Core Transaction Flows (Happy Paths)

### A. Complete Natural Language Input

_Input_: "Nasi Goreng 15k di Warteg Bahari pakai Cash"

- [ ] Bot replies with **Konfirmasi**.
- [ ] Item: Nasi Goreng
- [ ] Harga: Rp 15.000
- [ ] Toko: Warteg Bahari
- [ ] Bayar: Cash
- [ ] Action: Click **✅ YA**.
- [ ] Bot replies "✅ Tercatat!". (Check logs for mock write if DB not ready).

### B. Partial Input (Missing Merchant & Payment)

_Input_: "Beli Pulsa 50rb"

- [ ] Bot asks "Beli di mana?"
- [ ] _Input_: "Indomaret"
- [ ] Bot asks "Bayar pakai apa?"
- [ ] _Input_: "OVO"
- [ ] Bot shows Confirmation with correct data.

### C. Partial Input (Missing Payment)

_Input_: "Kopi 20rb di Janji Jiwa"

- [ ] Bot asks "Bayar pakai apa?"
- [ ] _Input_: "GoPay"
- [ ] Bot shows Confirmation.

## 3. Validation & Error Handling

### D. Invalid Price

_Input_: "Makan" (No price)

- [ ] Bot replies "Maaf, saya tidak menangkap nama item atau harga."

### E. Invalid Payment Method

_Input_: "Roti 5k di Omah" -> "Bayar pakai apa?" -> "Daun"

- [ ] Bot replies "Metode tidak valid. Pilih: Cash, OVO, ..."
- [ ] Retry with "Cash". Should proceed.

### F. Invalid Merchant (Only Numbers)

_Input_: "Roti 5k" -> "Beli di mana?" -> "123"

- [ ] Bot replies "Nama toko tidak valid".
- [ ] Retry with "Toko 123". Should proceed.

## 4. Commands

- [ ] **/start**: Shows welcome message.
- [ ] **/help**: Shows help guide.
- [ ] **/cancel**:
  - During a flow: "Transaksi dibatalkan."
  - Idle: "Tidak ada transaksi yang aktif."
- [ ] **/debug**: Toggles debug mode logs.

## 5. Edge Cases

- [ ] **Timeout**: Start a transaction and wait 3 minutes. Bot should say "Waktu habis".
- [ ] **Cancel Button**: At confirmation, click "🗑 Batal Catat". Should cancel.
- [ ] **No Button**: Replies "Transaksi dibatalkan".
