import * as dotenv from 'dotenv';
import { logger } from './utils/logger';
import { db } from './db/client';
import { bot } from './bot';
import { sql } from 'drizzle-orm';
dotenv.config();
async function main() {
    try {
        logger.info('Starting Money Assistant Bot...');
        // Database check
        // The previous 'db.execute(sql`SELECT 1`)' might need specific driver support
        // Neon serverless driver usually works fine, but let's wrap in try-catch specific
        try {
            await db.execute(sql `SELECT 1`);
            logger.info('Database connection initialized successfully');
        }
        catch (dbError) {
            logger.error('Database connection failed', { error: dbError });
            // Don't exit process strictly if DB is optional for bot startup (though it is needed for user config)
            // For now we continue or exit depending on strictness. Let's exit.
            process.exit(1);
        }
        // Launch Bot
        bot.launch(() => {
            logger.info('Bot is online and polling updates');
        });
    }
    catch (error) {
        logger.error('Failed to start application', { error });
        process.exit(1);
    }
}
main();
