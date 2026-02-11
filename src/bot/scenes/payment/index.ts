
import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../../types';
import { addCustomPaymentMethod } from '../../../services/payment';
import { logger } from '../../../utils/logger';

export const SCENE_ID = 'add_payment_wizard';

const step1_askCategory = async (ctx: BotContext) => {
    await ctx.reply('Pilih kategori pembayaran:', Markup.inlineKeyboard([
        [Markup.button.callback('🏦 Bank', 'cat_Bank'), Markup.button.callback('📱 E-Wallet', 'cat_E-Wallet')],
        // [Markup.button.callback('🔹 Lainnya', 'cat_Other')], // Removed per request
        [Markup.button.callback('❌ Batal', 'cancel')]
    ]));
    return ctx.wizard.next();
};

const step2_processCategory = async (ctx: BotContext) => {
    // Handle Category Selection via Callback
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = (ctx.callbackQuery as any).data;
        
        if (action === 'cancel') {
            await ctx.answerCbQuery();
            await ctx.reply('❌ Batal tambah metode.');
            return ctx.scene.leave();
        }

        if (action.startsWith('cat_')) {
            const category = action.replace('cat_', '');
            (ctx.wizard.state as any).category = category;

            await ctx.answerCbQuery();
            await ctx.reply(`Masukkan nama untuk kategori ${category}:`);
            return ctx.wizard.next();
        }
    }
    
    // Fallback if user sends text
    await ctx.reply('⚠️ Mohon pilih kategori dari tombol di atas.');
    return;
};

const step3_processName = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    
    if (!text) {
         await ctx.reply('⚠️ Mohon kirim teks nama pembayaran.');
         return;
    }
    
    const category = (ctx.wizard.state as any).category;
    const name = text.trim();

    try {
        const result = await addCustomPaymentMethod(ctx.from!.id, name, category);
        if (result.success) {
            await ctx.reply(`✅ ${result.message}`);
        } else {
            await ctx.reply(`ℹ️ ${result.message}`);
        }
    } catch (error) {
        logger.error('Error adding payment method', { error, userId: ctx.from!.id });
        await ctx.reply('❌ Terjadi kesalahan sistem.');
    }
    
    return ctx.scene.leave();
};

export const addPaymentScene = new Scenes.WizardScene<BotContext>(
    SCENE_ID,
    step1_askCategory,
    step2_processCategory,
    step3_processName
);
