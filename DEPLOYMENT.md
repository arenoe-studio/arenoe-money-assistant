# Deployment Guide: Arenoe Money Assistant

Target Platform: **Koyeb** (Docker Runtime)

## 1. Prerequisites

- [ ] GitHub Repository with latest code pushed
- [ ] Koyeb Account
- [ ] Production Database (Neon PostgreSQL) - connection string ready
- [ ] API Keys:
  - Telegram Bot Token
  - OpenRouter API Key
  - Google Cloud Credentials (Client ID, Secret, Redirect URI)

## 2. Repository Preparation

Ensure the following files are in your repository root (Already created):

- `Dockerfile`
- `.dockerignore`
- `package.json` & `pnpm-lock.yaml` (or `package-lock.json`)

## 3. Deploy to Koyeb

1.  **Login** to [Koyeb Dashboard](https://app.koyeb.com/).
2.  Click **Create App**.
3.  Select **GitHub** as the deployment method.
4.  Choose your repository: `arenoe-money-assistant`.
5.  **Builder Configuration**:
    - Choose **Dockerfile**.
    - Dockerfile location: `Dockerfile`.
    - Privilege: Unchecked (default).
6.  **Environment Variables**:
    Add the following variables (Copy from your `.env`, but use Production values):
    - `TELEGRAM_BOT_TOKEN`: _your_production_bot_token_
    - `OPENROUTER_API_KEY`: _your_openrouter_key_
    - `DATABASE_URL`: _your_neon_postgres_url_ (Ensure ?sslmode=require)
    - `GOOGLE_CLIENT_ID`: _your_google_client_id_
    - `GOOGLE_CLIENT_SECRET`: _your_google_client_secret_
    - `GOOGLE_REDIRECT_URI`: _your_callback_url_
    - `NODE_ENV`: `production`
7.  **Instance Size**: Nano or Micro is sufficient.
8.  Click **Deploy**.

## 4. Verification

1.  Wait for the build logs to show "Build successful".
2.  Wait for runtime logs to show:
    ```
    > project--arenoe-money-assistant@1.0.0 start
    > node dist/index.js
    Bot is online...
    ```
3.  Open your bot in Telegram and send `/status`.
    - Should reply with "State: Idle".

## 5. Troubleshooting

- **Build Fails**: Check logs. Usually TypeScript errors (fixed in latest commit).
- **Crash Loop**: Check `DATABASE_URL` connectivity or missing API keys.
- **Bot Not Responding**: Ensure `start: npm run start` command is running in the container.

## 6. Google Sheets Integration

To enable bidirectional sync (Sheets -> Bot):

1. Follow the **[Google Sheets Setup Guide](./GOOGLE_SHEETS_SETUP.md)**.
2. In Google Apps Script, set `WEBHOOK_URL` to your deployed URL:
   `https://[YOUR-APP-NAME].koyeb.app/webhook/sheets-sync`
3. Generate a secure secret and save it in Google Apps Script properties (`WEBHOOK_SECRET`).
   - Run SQL update on your database to match this secret:
     ```sql
     UPDATE users SET webhook_secret = 'YOUR_SECRET' WHERE telegram_id = YOUR_ID;
     ```
