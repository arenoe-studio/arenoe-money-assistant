import rateLimit from 'telegraf-ratelimit';
const limitConfig = {
    window: 1000,
    limit: 1,
    onLimitExceeded: (ctx) => ctx.reply('⚠️ Terlalu cepat! Tunggu sebentar ya.')
};
// @ts-ignore - Library types mismatch with current setup
export const rateLimiter = rateLimit(limitConfig);
