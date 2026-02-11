
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

            res.writeHead(404);
            res.end();
        });

        server.listen(port, '0.0.0.0', () => {
            logger.info(`Health check server listening on 0.0.0.0:${port}`);
        });

        // Launch Bot (Polling Mode)
        // Launch Bot (Polling Mode) with Retry
        let botRetries = 10;
        while (botRetries > 0) {
            try {
                // Set Bot Profile Info (Commands & Description)
                // This runs once on startup to ensure Telegram servers are updated
                await bot.telegram.setMyCommands([
                    { command: 'start', description: 'Mulai menggunakan bot' },
                    { command: 'income', description: 'Catat pemasukan' },
                    { command: 'paylater', description: 'Menu Hutang (Catat/Bayar)' },
                    { command: 'cek', description: 'Lihat saldo & hutang' },
                    { command: 'laporan', description: 'Laporan keuangan' },
                    { command: 'setting', description: 'Menu pengaturan' },
                    { command: 'help', description: 'Panduan penggunaan' },
                    { command: 'cancel', description: 'Batalkan transaksi' }
                ]);

                // Set Short Description (appears in chat list/profile under name)
                // This is likely what the user means by "Status yang terus ada"
                try {
                    await bot.telegram.setMyShortDescription('Asisten Keuangan Pribadi 💰\nCatat pengeluaran & pemasukan dengan mudah.');
                } catch (e) {
                    // Ignore error if description is same or API limits
                    logger.warn('Failed to set short description', { error: e });
                }

                await bot.launch(async () => {
                    logger.info('Bot is online and polling updates');
                    logger.info('Bot profile updated successfully');
                });
                break; // Success
            } catch (botError: any) {
                logger.error(`Bot launch failed. Retries left: ${botRetries - 1}`, { error: botError.message });
                botRetries--;
                if (botRetries === 0) {
                    logger.error('Max retries reached. Exiting.');
                    process.exit(1);
                }
                await new Promise(res => setTimeout(res, 5000)); // Wait 5s before retry
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
