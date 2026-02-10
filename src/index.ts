
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
    try {
        await db.execute(sql`SELECT 1`); 
        logger.info('Database connection initialized successfully');
    } catch (dbError) {
        logger.error('Database connection failed', { error: dbError });
        process.exit(1);
    }

    // Start HTTP Server for Health Checks
    // MUST bind to 0.0.0.0 for Docker/Koyeb networking
    const port = parseInt(process.env.PORT || '8000', 10);
    const server = http.createServer((req, res) => {
        // Log health checks for debugging
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Bot is running');
            return;
        }
        res.writeHead(404);
        res.end();
    });

    server.listen(port, '0.0.0.0', () => {
        logger.info(`Health check server listening on 0.0.0.0:${port}`);
    });

    // Launch Bot (Polling Mode)
    await bot.launch(() => {
        logger.info('Bot is online and polling updates');
    });

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
