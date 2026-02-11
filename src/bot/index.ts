
import { Telegraf, session, Scenes } from 'telegraf';
import * as dotenv from 'dotenv';
import { BotContext } from '../types';
import { rateLimiter } from './middleware/rateLimit';
import { logger } from '../utils/logger';
import { transactionScene, SCENE_ID } from './scenes/transaction';
import { addPaymentScene } from './scenes/payment';
import { balanceScene } from './scenes/balance';
import { incomeScene } from './scenes/income';
import { transferScene } from './scenes/transfer';
import { hutangScene, bayarScene } from './scenes/paylater';
import { reportScene } from './scenes/report';
import { registerCommands } from './commands';

dotenv.config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN must be provided!');
}

// Use 'any' for the generic to avoid strict type constraints during build
export const bot = new Telegraf<any>(process.env.TELEGRAM_BOT_TOKEN);

// Setup Scenes
// Cast to any to avoid "Type 'BotContext' does not satisfy constraint 'SceneContext<SceneSessionData>'"
// Setup Scenes
// Cast to any to avoid "Type 'BotContext' does not satisfy constraint 'SceneContext<SceneSessionData>'"
const stage = new Scenes.Stage<any>([
  transactionScene,
  addPaymentScene,
  balanceScene,
  incomeScene,
  transferScene,
  hutangScene,
  bayarScene,
  reportScene
]);

// Global Cancel Command (Works inside scenes)
stage.command('cancel', async (ctx) => {
  await ctx.scene.leave();
  await ctx.reply('⛔ Transaksi dibatalkan.');
});

// Middleware Setup
bot.use(rateLimiter);
bot.use(session());
bot.use(stage.middleware());

// Register all commands
registerCommands(bot as any);

// Set bot command menu
bot.telegram.setMyCommands([
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

// Basic Error Handling
bot.catch(async (err, ctx) => {
  logger.error('Telegraf Error', { error: err, userId: ctx.from?.id });
  try {
    await ctx.reply('Terjadi kesalahan sistem. Silakan coba lagi nanti.');
  } catch (e) {
    // Ignore
  }
});

// Logging
bot.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info('Message processed', {
    userId: ctx.from?.id,
    username: ctx.from?.username,
    text: ctx.message && 'text' in ctx.message ? ctx.message.text : 'non-text',
    duration: ms
  });
});

// Default Handler
bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;
  await (ctx as any).scene.enter(SCENE_ID);
});

// Graceful Stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
