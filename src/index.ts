
import * as dotenv from 'dotenv';
import { logger } from './utils/logger';
import { db } from './db/client';
import { bot } from './bot';
import { sql } from 'drizzle-orm';
import * as http from 'http';

dotenv.config();

async function main() {
    try {
        logger.info('Starting Money Assistant Bot...');

        // Database Check
        // Database Check with Retry
        let retries = 5;
        while (retries > 0) {
            try {
                await db.execute(sql`SELECT 1`);
                logger.info('Database connection initialized successfully');
                break;
            } catch (dbError) {
                logger.error(`Database connection failed. Retries left: ${retries - 1}`, { error: dbError });
                retries--;
                if (retries === 0) process.exit(1);
                await new Promise(res => setTimeout(res, 2000));
            }
        }

        // Start HTTP Server for Health Checks
        // MUST bind to 0.0.0.0 for Docker/Koyeb networking
        const port = parseInt(process.env.PORT || '8000', 10);
        const server = http.createServer(async (req, res) => {
            // Log health checks for debugging
            if (req.url === '/') {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Bot is running');
                return;
            }

            // Webhook Endpoint for Google Sheets Sync
            if (req.url === '/webhook/sheets-sync' && req.method === 'POST') {
                try {
                    const buffers = [];
                    for await (const chunk of req) {
                        buffers.push(chunk);
                    }
                    const data = Buffer.concat(buffers).toString();
                    const payload = JSON.parse(data);

                    const secret = req.headers['x-webhook-secret'] as string;

                    // Dynamic import to avoid circular dependency issues at startup if any
                    const { processSyncFromSheets } = await import('./services/sync');

                    await processSyncFromSheets(secret, payload);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error: any) {
                    logger.error('Webhook Error', { error: error.message });
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
                return;
            }

            // OAuth2 Callback Endpoint for Google Sheets Authorization
            if (req.url?.startsWith('/oauth2callback') && req.method === 'GET') {
                try {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const code = url.searchParams.get('code');
                    const state = url.searchParams.get('state'); // Telegram ID

                    if (!code || !state) {
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end('<h1>Error: Missing authorization code or state</h1>');
                        return;
                    }

                    const { handleOAuthCallback } = await import('./services/oauth');
                    await handleOAuthCallback(code, parseInt(state));

                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                        <body style="font-family: Arial; text-align: center; padding: 50px;">
                            <h1>✅ Berhasil!</h1>
                            <p>Akun Google Anda telah terhubung.</p>
                            <p>Silakan kembali ke Telegram untuk melanjutkan.</p>
                        </body>
                        </html>
                    `);
                } catch (error: any) {
                    logger.error('OAuth Callback Error', { error: error.message });
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end(`<h1>Error: ${error.message}</h1>`);
                }
                return;
            }

            // Telegram Webhook Endpoint
            if (req.url === '/webhook/telegram' && req.method === 'POST') {
                try {
                    const buffers = [];
                    for await (const chunk of req) {
                        buffers.push(chunk);
                    }
                    const data = Buffer.concat(buffers).toString();
                    logger.info('Received update from Telegram', { length: data.length });

                    const update = JSON.parse(data);

                    // Respond OK immediately to Telegram to prevent timeouts
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true }));

                    // Pass update to bot background processing
                    bot.handleUpdate(update).catch((err: any) => {
                        logger.error('Error processing update', { error: err.message });
                    });
                } catch (error: any) {
                    logger.error('Telegram Webhook Error', { error: error.message });
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
                return;
            }

            res.writeHead(404);
            res.end();
        });

        server.listen(port, '0.0.0.0', () => {
            logger.info(`Health check server listening on 0.0.0.0:${port}`);
        });

        // Launch Bot (Webhook Mode for Production)
        const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN; // e.g. https://your-app.koyeb.app
        const WEBHOOK_PATH = '/webhook/telegram';

        // 1. Set Bot Profile (Best Effort - Don't block startup if rate limited)
        try {
            await bot.telegram.setMyCommands([
                { command: 'start', description: 'Mulai menggunakan bot' },
                { command: 'income', description: 'Catat pemasukan' },
                { command: 'paylater', description: 'Menu Hutang (Catat/Bayar)' },
                { command: 'cek', description: 'Lihat saldo & hutang' },
                { command: 'laporan', description: 'Laporan keuangan' },
                { command: 'setting', description: 'Menu pengaturan' },
                { command: 'connectsheets', description: 'Hubungkan Google Sheets' },
                { command: 'help', description: 'Panduan penggunaan' },
                { command: 'cancel', description: 'Batalkan transaksi' }
            ]);
            await bot.telegram.setMyShortDescription('Asisten Keuangan Pribadi 💰\nCatat pengeluaran & pemasukan dengan mudah.');
            logger.info('Bot profile updated successfully');
        } catch (e: any) {
            logger.warn('Failed to update bot profile (likely rate limited), continuing startup...', { error: e.message });
        }

        // 2. Setup Webhook or Polling
        let botRetries = 5;
        while (botRetries > 0) {
            try {
                if (WEBHOOK_DOMAIN) {
                    // Production: Webhook Mode
                    // We handle updates manually via HTTP server, so just set the webhook URL
                    await bot.telegram.setWebhook(`${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`);
                    logger.info(`Bot webhook set to ${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`);
                    logger.info('Bot is online in WEBHOOK mode');
                } else {
                    // Development: Polling Mode
                    await bot.launch();
                    logger.info('Bot is online in POLLING mode (development)');
                }

                break; // Success
            } catch (botError: any) {
                logger.error(`Bot launch failed. Retries left: ${botRetries - 1}`, { error: botError.message });
                botRetries--;
                if (botRetries === 0) {
                    logger.error('Max retries reached. Exiting.');
                    process.exit(1);
                }
                const waitTime = 5000 * (6 - botRetries);
                logger.info(`Waiting ${waitTime}ms before retry...`);
                await new Promise(res => setTimeout(res, waitTime));
            }
        }

        // Graceful Shutdown
        const stop = (signal: string) => {
            logger.info(`Received ${signal}, shutting down...`);
            server.close();
            bot.stop(signal);
            process.exit(0);
        };

        process.once('SIGINT', () => stop('SIGINT'));
        process.once('SIGTERM', () => stop('SIGTERM'));

    } catch (error) {
        logger.error('Failed to start application', { error });
        process.exit(1);
    }
}

main();
