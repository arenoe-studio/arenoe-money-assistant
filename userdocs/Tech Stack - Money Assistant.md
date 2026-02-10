# Tech Stack: Arenoe Money Assistant

## 1. Core Logic (Bahasa & Framework)
- **Language**: Node.js v20 LTS dengan TypeScript
- **Bot Framework**: Telegraf.js (v4.x)
- **Package Manager**: PNPM
- **Reason**: Telegraf Scenes untuk state management dialog konfirmasi

## 2. AI & NLP Layer
- **AI Provider**: Anthropic Claude
- **Model**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- **NLP Fallback**: Regex patterns untuk parsing format standar (15k, 15rb, 15000)
- **Library**: Compromise.js untuk pre-processing natural language
- **Reason**: Claude Haiku optimal untuk ekstraksi terstruktur dengan biaya rendah; Compromise sebagai fallback offline

## 3. Database & ORM
- **Database**: Neon PostgreSQL (Serverless)
- **ORM**: Drizzle ORM
- **Connection Pooling**: Drizzle built-in pooling
- **Reason**: Drizzle lebih ringan dari Prisma untuk bot sederhana; Neon gratis 10 project

## 4. External Integration
- **Google Sheets API**: googleapis package (OAuth2 untuk write access)
- **Storage Config**: PostgreSQL untuk menyimpan `spreadsheet_id` & `refresh_token` per user

## 5. Utility Libraries
- **Date/Time**: Luxon (timezone WIB)
- **Currency Handling**: Currency.js
- **Input Validation**: Zod
- **Reason**: Mencegah error perhitungan desimal & validasi input user

## 6. Infrastructure & Deployment
- **Hosting**: Koyeb Nano Plan (no sleep mode)
- **Version Control**: GitHub
- **CI/CD**: Auto-deploy via Koyeb GitHub integration
- **Environment Variables**: `.env` file (disimpan di Koyeb Secrets)

## 7. Observability & Monitoring
- **Logging**: Winston (file + console transport)
- **Error Tracking**: Sentry (free tier)
- **Reason**: Notifikasi instan jika bot crash di production

## 8. Security & Authentication
- **Telegram Auth**: Built-in Telegram user ID verification
- **Google OAuth**: OAuth2 flow untuk akses Spreadsheet (token disimpan encrypted di PostgreSQL)
- **Input Sanitization**: Zod schema validation
- **Rate Limiting**: Telegraf middleware (5 requests/detik per user)

## 9. Development Tools
- **Testing**: Vitest untuk unit test
- **Linter**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Documentation**: JSDoc untuk business logic kompleks

## 10. Cost Estimation
- **Free**: Neon PostgreSQL, Koyeb Nano, Sentry (5k events/month), GitHub
- **Paid**: Anthropic API (~$5/month untuk 100k tokens), Domain (opsional)
- **Total**: ~$5-10/month untuk 50-100 active users