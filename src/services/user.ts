
import { db } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Retrieves a user by Telegram ID, or creates one if not exists.
 */
export async function getOrCreateUser(telegramId: number) {
  try {
    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }

    // Create new user
    const newUser = await db.insert(users).values({
      telegramId: telegramId
    }).returning();

    logger.info('New user registered', { telegramId });
    return newUser[0];

  } catch (error) {
    logger.error('Error in getOrCreateUser', { error, telegramId });
    throw error;
  }
}
