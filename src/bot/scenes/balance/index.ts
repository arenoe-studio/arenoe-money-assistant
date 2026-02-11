
import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../../types';
import { logger } from '../../../utils/logger';
import { getUserPaymentMethods } from '../../../services/payment';
import { setUserBalance } from '../../../services/balance';
import { parseCurrency } from '../../../utils/currency';
import { getPaymentMenu } from '../../../utils/keyboard';

export const BALANCE_SCENE_ID = 'balance_wizard';

const step0_askMethod = async (ctx: BotContext) => {
    try {
        const methods = await getUserPaymentMethods(ctx.from!.id);
        const keyboard = getPaymentMenu('main', methods);

        await ctx.reply('💰 Pilih metode pembayaran yang ingin diatur saldonya:', keyboard);
        return ctx.wizard.next();
    } catch (error) {
        logger.error('Balance Scene Step 0 Error', { error });
        await ctx.reply('Terjadi kesalahan memuat data.');
        return ctx.scene.leave();
    }
};

/**
 * Helper to handle category navigation in balance scene
 */
const handleBalanceCategoryNav = async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = (ctx.callbackQuery as any).data;

        // Category Navigation
        if (action.startsWith('cat_')) {
            const category = action.replace('cat_', '');
            const type = category === 'main' ? 'main' : category;


            const methods = await getUserPaymentMethods(ctx.from!.id);
            const keyboard = getPaymentMenu(type as any, methods);

            let message = '💰 Pilih metode pembayaran yang ingin diatur saldonya:';
            if (type === 'bank') message = '🏦 Pilih Bank:';
            if (type === 'ewallet') message = '📱 Pilih E-Wallet:';

            try {
                await ctx.editMessageText(message, keyboard);
            } catch (e) {
                // Ignore if message is same
            }
            await ctx.answerCbQuery();
            return 'NAVIGATING';
        }
    }
    return 'NONE';
};

const step1_handleSelection = async (ctx: BotContext) => {
    // First, check if it's category navigation
    const navResult = await handleBalanceCategoryNav(ctx);
    if (navResult === 'NAVIGATING') return; // Stay in step

    // Handle payment selection
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = (ctx.callbackQuery as any).data;

        // Use 'pay_' prefix to match other scenes
        if (action.startsWith('pay_')) {
            const method = action.replace('pay_', '');
            (ctx.wizard.state as any).selectedMethod = method;

            await ctx.answerCbQuery();
            await ctx.editMessageText(
                `💳 Metode: ${method}\n\nSilakan masukkan jumlah saldo saat ini (contoh: 5jt, 500rb, 150000):`
            );

            return ctx.wizard.next();
        }
    }

    // Ignore text input
    if (ctx.message) {
        await ctx.reply('⚠️ Mohon pilih metode menggunakan tombol.');
        return;
    }
};

const step2_handleAmount = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
        await ctx.reply('⚠️ Mohon kirim nominal saldo berupa teks/angka.');
        return;
    }

    const amount = parseCurrency(text);

    if (amount === null || isNaN(amount)) {
        await ctx.reply('⚠️ Format nominal tidak valid. Coba lagi (contoh: 500rb, 1jt, 50000).');
        return;
    }

    const method = (ctx.wizard.state as any).selectedMethod;
    const userId = ctx.from!.id;

    try {
        const result = await setUserBalance(userId, method, amount);
        await ctx.reply(result.message || '✅ Saldo berhasil disimpan.');
    } catch (error) {
        logger.error('Balance Update Error', { error });
        await ctx.reply('❌ Gagal menyimpan saldo.');
    }

    return ctx.scene.leave();
};

export const balanceScene = new Scenes.WizardScene<BotContext>(
    BALANCE_SCENE_ID,
    step0_askMethod,
    step1_handleSelection,
    step2_handleAmount
);
