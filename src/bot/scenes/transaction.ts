
import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../types';
import { parseMessage } from '../../services/parser';
import { Transaction, PartialTransaction, PaymentMethods } from '../../schemas/transaction';
import { writeTransaction } from '../../services/sheets';
import { formatCurrency } from '../../utils/currency';
import { logger } from '../../utils/logger';

export const SCENE_ID = 'transaction_wizard';

function getMissingFields(data: PartialTransaction): string[] {
  const missing: string[] = [];
  if (!data.items) missing.push('items');
  if (!data.harga) missing.push('harga');
  if (!data.namaToko) missing.push('namaToko');
  if (!data.metodePembayaran) missing.push('metodePembayaran');
  return missing;
}

export const transactionScene = new Scenes.WizardScene<BotContext>(
  SCENE_ID,
  
  // Step 1
  async (ctx) => {
    if (!ctx.session) ctx.session = {} as any;
    ctx.session.retryCount = { merchant: 0, payment: 0 };
    
    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    
    if (!messageText) {
      await ctx.reply('Mohon kirim pesan teks.');
      return ctx.scene.leave();
    }

    try {
      await ctx.reply('⏳ Memproses...');
      const parsed = await parseMessage(messageText);
      ctx.session.transaction = parsed;
      
      const missing = getMissingFields(parsed);
      
      if (missing.includes('items') || missing.includes('harga')) {
        await ctx.reply('Maaf, saya tidak menangkap nama item atau harga. Format: "Item 10k"');
        return ctx.scene.leave();
      }

      if (missing.includes('namaToko')) {
        await ctx.reply('Beli di mana?');
        ctx.wizard.selectStep(1);
        return;
      }

      if (missing.includes('metodePembayaran')) {
         ctx.wizard.selectStep(2);
         return;
      }

      ctx.wizard.selectStep(3);
      return;

    } catch (error) {
      logger.error('Scene Start Error', { error });
      await ctx.reply('Error memproses pesan.');
      return ctx.scene.leave();
    }
  },

  // Step 2 (Merchant)
  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (/^\d+$/.test(text)) {
      ctx.session.retryCount!.merchant++;
      if (ctx.session.retryCount!.merchant >= 2) {
        await ctx.reply('Skip nama toko.');
        if (ctx.session.transaction) ctx.session.transaction.namaToko = 'Unknown';
        if (!ctx.session.transaction?.metodePembayaran) {
            ctx.wizard.selectStep(2);
            return;
        }
        ctx.wizard.selectStep(3);
        return;
      }
      await ctx.reply('Nama toko tidak valid. Coba lagi:');
      return;
    }
    if (ctx.session.transaction) ctx.session.transaction.namaToko = text;
    if (!ctx.session.transaction?.metodePembayaran) {
      await ctx.reply('Bayar pakai apa?');
      ctx.wizard.selectStep(2);
      return;
    }
    ctx.wizard.selectStep(3);
    return;
  },

  // Step 3 (Payment)
  async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    // Use the values from schema/constant to be single source of truth
    const validMethods = [...PaymentMethods]; 
    
    const matched = validMethods.find(m => m.toLowerCase() === text.toLowerCase());

    if (!matched) {
       ctx.session.retryCount!.payment++;
       if (ctx.session.retryCount!.payment >= 2) {
         await ctx.reply('Skip pembayaran (Default: Cash).');
         if (ctx.session.transaction) ctx.session.transaction.metodePembayaran = 'Cash';
         ctx.wizard.selectStep(3);
         return;
       }
       await ctx.reply(`Metode tidak valid. Pilih: ${validMethods.join(', ')}`);
       return;
    }

    if (ctx.session.transaction) {
        // Cast matched to expected type since validation passed
        ctx.session.transaction.metodePembayaran = matched as any; 
    }
    ctx.wizard.selectStep(3);
    return;
  },

  // Step 4 (Confirm)
  async (ctx) => {
    const data = ctx.session.transaction;
    if (!data) return ctx.scene.leave();

    const message = `Konfirmasi:\n` +
      `📦 ${data.items}\n` +
      `💰 ${formatCurrency(data.harga || 0)}\n` +
      `🏪 ${data.namaToko}\n` +
      `💳 ${data.metodePembayaran}\n\n` +
      `Simpan?`;

    await ctx.reply(message, Markup.inlineKeyboard([
      [Markup.button.callback('✅ YA', 'confirm_yes'), Markup.button.callback('❌ TIDAK', 'confirm_no')],
      [Markup.button.callback('🗑 Batal', 'cancel_transaction')]
    ]));

    ctx.wizard.next();
    return;
  },

  // Step 5 (Action)
  async (ctx) => {
    if (!ctx.callbackQuery) {
        await ctx.reply('Gunakan tombol.');
        return; 
    }
    const action = (ctx.callbackQuery as any).data;
    const { transaction } = ctx.session;

    if (action === 'confirm_yes') {
        try {
            await ctx.answerCbQuery('Menyimpan...');
            await writeTransaction(ctx.from!.id, transaction as Transaction);
            await ctx.reply('✅ Tercatat!');
        } catch (error) {
            await ctx.reply('Gagal simpan.');
            logger.error('Save failed', { error });
        }
    } else if (action === 'confirm_no') {
        await ctx.answerCbQuery();
        await ctx.reply('Dibatalkan.');
    } else if (action === 'cancel_transaction') {
        await ctx.answerCbQuery();
        await ctx.reply('Dibatalkan.');
    }
    return ctx.scene.leave();
  }
);
