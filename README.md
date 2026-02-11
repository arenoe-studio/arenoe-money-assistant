# Arenoe Money Assistant 🤖💰

**Personal Finance Tracker Telegram Bot**

Arenoe Money Assistant adalah bot Telegram pintar yang membantu Anda mencatat pengeluaran dan pemasukan sehari-hari menggunakan bahasa natural (Natural Language Processing). Bot ini terintegrasi dengan Google Sheets untuk sinkronisasi data dua arah dan pelaporan yang fleksibel.

## ⭐ Fitur Utama

- **📝 Natural Language Input**: Catat transaksi semudah chat biasa.
  - _"Nasi goreng 15k di Warteg Bahari pakai Cash"_
  - _"Beli pulsa 50rb"_ (Bot akan tanya detail yang kurang)
- **📊 Google Sheets Sync (2-Way)**:
  - Data tersimpan otomatis ke Spreadsheet pribadi Anda.
  - Edit data di Google Sheet → Bot database otomatis terupdate via Webhook.
- **💳 Manajemen Saldo & Hutang**:
  - Track saldo dompet/e-wallet.
  - Fitur "PayLater" untuk mencatat hutang/piutang.
- **📈 Laporan**:
  - Rekap Harian, Mingguan, Bulanan.
  - Custom Date Range dengan kalender interaktif.
- **🛡️ Aman & Pribadi**: Data milik Anda, tersimpan di database pribadi dan Google Sheet Anda sendiri.

## 🛠️ Tech Stack

- **Runtime**: Node.js v20 (TypeScript)
- **Framework**: Telegraf.js
- **AI/NLP**: Anthropic Claude Haiku (via OpenRouter) + Regex Fallback
- **Database**: NEON PostgreSQL (Serverless) + Drizzle ORM
- **Infrastructure**: Koyeb (Docker)
- **Integration**: Google Sheets API + Google Apps Script

## 🚀 Instalasi & Menjalankan Lokal

1.  **Clone Repository**

    ```bash
    git clone https://github.com/username/project-arenoe-money-assistant.git
    cd project-arenoe-money-assistant
    ```

2.  **Install Dependencies**

    ```bash
    pnpm install
    # atau
    npm install
    ```

3.  **Setup Environment Variables**
    Copy `.env.example` ke `.env` dan isi variabel berikut:

    ```env
    DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
    TELEGRAM_BOT_TOKEN="your_bot_token"
    OPENROUTER_API_KEY="your_api_key"
    WEBHOOK_SECRET="create_a_strong_password"
    ```

4.  **Database Migration**

    ```bash
    npm run db:push
    ```

5.  **Jalankan Bot (Development)**
    ```bash
    npm run dev
    ```

## 🌐 Deployment & Integrasi

- **Deployment Guide**: [Lihat DEPLOYMENT.md](./DEPLOYMENT.md) untuk panduan deploy ke Koyeb.
- **Google Sheets Setup**: [Lihat GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md) untuk cara menghubungkan bot dengan Spreadsheet Anda.

## 🧪 Testing

Kami menyediakan checklist testing manual untuk memverifikasi fitur bot.

- [Lihat MANUAL_TESTING.md](./MANUAL_TESTING.md)

---

_Created by Arenoe Studio_
