
import rateLimit from 'telegraf-ratelimit';
import { Context } from 'telegraf';

const limitConfig = {
  window: 1000,
  limit: 1,
  onLimitExceeded: (ctx: Context) => ctx.reply('⚠️ Terlalu cepat! Tunggu sebentar ya.')
};

// @ts-ignore - Library types mismatch with current setup
export const rateLimiter = rateLimit(limitConfig);
