# Arenoe Money Assistant 🤖💰

**Personal Finance Tracker Telegram Bot dengan AI Natural Language Processing**

Arenoe Money Assistant adalah bot Telegram pintar yang membantu Anda mencatat pengeluaran dan pemasukan sehari-hari menggunakan bahasa natural. Bot ini terintegrasi dengan Google Sheets untuk sinkronisasi data dua arah dan pelaporan yang fleksibel.

---

## ⭐ Fitur Utama

### � Natural Language Input dengan AI

- **Expense**: Catat pengeluaran dengan bahasa natural
  - _"2 februari 2026 pentol 14k"_ → Tercatat dengan tanggal spesifik
  - _"Nasi goreng 15k di Warteg Bahari pakai Cash"_
  - _"Beli pulsa 50rb"_ (Bot akan tanya detail yang kurang)
- **Income**: Flow bertahap untuk mencatat pemasukan
  - Pilih metode → Input nominal → Keterangan → Tanggal
- **Smart Date Detection**:
  - Support format natural: "kemarin", "2 februari 2026", "3 hari lalu"
  - Output tanggal tanpa waktu (YYYY-MM-DD)

### 📊 Google Sheets Sync (Bidirectional)

- **Neon → Sheets**: Semua transaksi (expense, income, transfer, debt) otomatis ter-sync
- **Sheets → Neon**: Edit atau tambah baris di Sheets → Bot database otomatis update/insert
- **Features**:
  - Auto-clear pending updates saat deployment
  - Webhook secret validation untuk keamanan
  - Auto-generate Transaction ID untuk row baru di Sheets

### 💳 Manajemen Keuangan

- **Balance Tracking**: Monitor saldo dompet/e-wallet/bank
- **Debt Management**: Catat dan track hutang/piutang
- **Transfer**: Transfer antar metode pembayaran
- **Payment Methods**: Dynamic payment methods dengan kategori (Bank, E-Wallet, Other)

### 📈 Reporting

- Rekap Harian, Mingguan, Bulanan
- Custom Date Range dengan kalender interaktif
- Export ke Google Sheets untuk analisis lebih lanjut

### 🛡️ Keamanan & Privacy

- Data tersimpan di database pribadi (Neon PostgreSQL)
- Google Sheets milik Anda sendiri
- Webhook validation dengan secret key

---

## 🛠️ Tech Stack

| Layer              | Technology                                 |
| ------------------ | ------------------------------------------ |
| **Runtime**        | Node.js v20 (TypeScript)                   |
| **Framework**      | Telegraf.js                                |
| **AI/NLP**         | GPT-4o-mini (via OpenRouter)               |
| **Database**       | Neon PostgreSQL (Serverless) + Drizzle ORM |
| **Infrastructure** | Koyeb (Docker + Auto-deploy from GitHub)   |
| **Integration**    | Google Sheets API + Google Apps Script     |
| **Logging**        | Winston                                    |

---

## 🚀 Quick Start (Local Development)

### 1. Clone Repository

```bash
git clone https://github.com/arenoe-studio/arenoe-money-assistant.git
cd arenoe-money-assistant
```

### 2. Install Dependencies

```bash
npm install
# atau
pnpm install
```

### 3. Setup Environment Variables

Copy `.env.example` ke `.env` dan isi:

```env
# Database
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Telegram
TELEGRAM_BOT_TOKEN="your_bot_token"
WEBHOOK_DOMAIN=""  # Kosongkan untuk Mode Polling (Development)

# AI Provider
OPENROUTER_API_KEY="your_openrouter_key"

# Google Sheets (Optional untuk development)
GOOGLE_CLIENT_ID="your_client_id"
GOOGLE_CLIENT_SECRET="your_client_secret"
GOOGLE_REDIRECT_URI="http://localhost:8000/oauth2callback"

# Webhook Secret (untuk Sheets sync)
WEBHOOK_SECRET="create_a_strong_password"

# Timezone
TZ="Asia/Jakarta"
```

### 4. Database Migration

```bash
npm run db:push
```

### 5. Jalankan Bot

```bash
npm run dev
```

Bot akan running di mode **polling** (development). Buka Telegram dan kirim `/start` ke bot Anda.

---

## 🌐 Production Deployment

### Deploy ke Koyeb

1. **Push ke GitHub** (Auto-deploy enabled)
2. **Set Environment Variables** di Koyeb Dashboard
3. **Redeploy** → Bot otomatis:
   - Clear pending Telegram updates
   - Set webhook ke URL baru
   - Siap menerima pesan

📖 **Detail**: [DEPLOYMENT.md](./DEPLOYMENT.md)

### Google Sheets Integration

1. **Setup OAuth2** di Google Cloud Console
2. **Copy Apps Script** ke Google Sheets
3. **Set Script Properties** (WEBHOOK_URL, WEBHOOK_SECRET, TELEGRAM_ID)
4. **Run setupTrigger()** untuk enable auto-sync

📖 **Detail**: [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md)

---

## 📁 Project Structure

```
project-arenoe-money-assistant/
├── src/
│   ├── bot/
│   │   ├── commands/         # Bot commands (/start, /help, etc)
│   │   └── scenes/           # Wizard scenes (expense, income, debt, etc)
│   ├── db/
│   │   ├── client.ts         # Drizzle DB client
│   │   └── schema.ts         # Database schema
│   ├── services/
│   │   ├── ai.ts             # GPT-4o-mini expense parser
│   │   ├── income-parser.ts  # GPT-4o-mini income parser
│   │   ├── sheets.ts         # Google Sheets write (Neon → Sheets)
│   │   ├── sync.ts           # Google Sheets read (Sheets → Neon)
│   │   ├── balance.ts        # Balance management
│   │   ├── debt.ts           # Debt management
│   │   └── vision.ts         # Receipt OCR (Claude Vision)
│   └── index.ts              # HTTP server + Bot launcher
├── drizzle/                  # Database migrations
├── DEPLOYMENT.md             # Deployment guide
├── GOOGLE_SHEETS_SETUP.md    # Sheets integration guide
├── DEBUG_SHEETS_SYNC.md      # Troubleshooting Sheets sync
└── GOOGLE_APPS_SCRIPT.js     # Apps Script for Sheets → Bot sync
```

---

## 🧪 Testing

Checklist testing manual untuk memverifikasi semua fitur:

### Expense Testing

```
✅ "pentol 14k"
✅ "2 februari 2026 pentol 14k"
✅ "kemarin beli bensin 50rb"
```

### Income Testing

```
✅ /income → 500k → "Gaji" → "today"
✅ /income → 2jt → "Freelance" → "2 februari 2026"
```

### Google Sheets Sync

```
✅ Create expense via bot → Check Sheets
✅ Edit cell in Sheets → Check Neon DB updated
✅ Add new row in Sheets → Check bot DB inserted
```

---

## 🐛 Troubleshooting

### Issue: Webhook tidak jalan setelah deploy

**Solution**: Bot otomatis clear pending updates. Check Koyeb logs untuk:

```
[INFO] Sheets Sync: Webhook endpoint called
[INFO] ✅ Pending updates cleared and webhook reset
```

### Issue: Sheets sync tidak jalan

**Solution**: Debug step-by-step dengan [DEBUG_SHEETS_SYNC.md](./DEBUG_SHEETS_SYNC.md)

### Issue: TypeScript build error

**Solution**:

```bash
npx tsc --noEmit  # Check errors
npm run build     # Build production
```

---

## 📝 Changelog

### v1.2.0 (2026-02-12)

- ✅ Enhanced Google Sheets bidirectional sync (INSERT + UPDATE)
- ✅ AI-powered income parser dengan GPT-4o-mini
- ✅ Natural language date detection (2 februari 2026, kemarin, dll)
- ✅ Auto-clear pending Telegram updates on deployment
- ✅ Step-by-step income flow (nominal → keterangan → tanggal)
- ✅ Date output tanpa waktu (YYYY-MM-DD only)
- ✅ Comprehensive logging untuk debug webhook
- ✅ Fixed unique index issue on sheetRowId

### v1.1.0

- Google Sheets integration
- Receipt OCR dengan Claude Vision
- Debt management
- Report feature dengan custom date range

### v1.0.0

- Initial release
- Basic expense tracking
- Natural language parsing
- Balance management

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Developer

**Arenoe Studio**

- GitHub: [@arenoe-studio](https://github.com/arenoe-studio)

---

## 🙏 Acknowledgments

- [Telegraf.js](https://telegraf.js.org/) - Telegram Bot Framework
- [OpenRouter](https://openrouter.ai/) - AI API Gateway
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [Koyeb](https://koyeb.com/) - Deployment Platform
