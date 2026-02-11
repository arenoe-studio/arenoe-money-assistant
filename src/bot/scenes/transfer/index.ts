
import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../../types';
import { logger } from '../../../utils/logger';
import { transferBalance } from '../../../services/balance';
import { getUserPaymentMethods } from '../../../services/payment';
import { getPaymentMenu } from '../../../utils/keyboard';
import { parseCurrency, formatCurrency } from '../../../utils/currency';

export const TRANSFER_SCENE_ID = 'transfer_wizard';

/**
 * Helper to handle payment selection (Source or Dest).
 * Returns 'SELECTED' if a payment method was chosen (and sets state).
 * Returns 'NAVIGATING' if user navigated categories.
 * Returns 'INVALID' if input was ignored/wrong.
 */
const handlePaymentSelection = async (ctx: BotContext, stateKey: 'source' | 'dest') => {
    // 1. Handle Callback Query
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = (ctx.callbackQuery as any).data;

        // Cancel
        if (action === 'cancel') {
            await ctx.answerCbQuery();
            await ctx.reply('❌ Transfer dibatalkan.');
            await ctx.scene.leave();
            return 'CANCEL';
        }

        // Category Navigation
        if (action.startsWith('cat_')) {
            const category = action.replace('cat_', '');

            // Allow back to main
            const type = category === 'main' ? 'main' : category;


            const userMethods = await getUserPaymentMethods(ctx.from!.id);
            const keyboard = getPaymentMenu(type as any, userMethods);

            let message = stateKey === 'source' ? '📤 Mau transfer dari mana?' : '📥 Mau transfer ke mana?';
            if (type === 'bank') message = stateKey === 'source' ? '📤 Pilih Bank Pengirim:' : '📥 Pilih Bank Tujuan:';
            if (type === 'ewallet') message = stateKey === 'source' ? '📤 Pilih E-Wallet Pengirim:' : '📥 Pilih E-Wallet Tujuan:';
            if (type === 'others') message = '🔹 Pilih Metode Lain:';

            try {
                await ctx.editMessageText(message, keyboard);
            } catch (e) {
                // Ignore if message content is same
            }
            await ctx.answerCbQuery();
            return 'NAVIGATING';
        }

        // Payment Method Selected
        if (action.startsWith('pay_')) {
            const method = action.replace('pay_', '');
            (ctx.wizard.state as any)[stateKey] = method;
            await ctx.answerCbQuery();
            return 'SELECTED';
        }
    }

    // Ignore text input during selection
    if (ctx.message) {
        await ctx.reply('⚠️ Mohon pilih metode menggunakan tombol.');
        return 'INVALID';
    }

    return 'INVALID';
};

const step1_askSource = async (ctx: BotContext) => {
    const userMethods = await getUserPaymentMethods(ctx.from!.id);
    const keyboard = getPaymentMenu('main', userMethods);

    await ctx.reply('📤 Mau transfer dari mana?', keyboard);
    return ctx.wizard.next();
};

const step2_handleSource_askDest = async (ctx: BotContext) => {
    const result = await handlePaymentSelection(ctx, 'source');

    if (result === 'CANCEL') return; // Scene left
    if (result === 'NAVIGATING' || result === 'INVALID') return; // Stay in step

    // Source Selected
    const source = (ctx.wizard.state as any).source;

    // Now ask Destination
    const userMethods = await getUserPaymentMethods(ctx.from!.id);
    const keyboard = getPaymentMenu('main', userMethods);

    await ctx.reply(`✅ Dari: ${source}\n\n📥 Mau transfer ke mana?`, keyboard);
    return ctx.wizard.next();
};

const step3_handleDest_askAmount = async (ctx: BotContext) => {
    const result = await handlePaymentSelection(ctx, 'dest');

    if (result === 'CANCEL') return;
    if (result === 'NAVIGATING' || result === 'INVALID') return;

    // Dest Selected
    const dest = (ctx.wizard.state as any).dest;
    const source = (ctx.wizard.state as any).source;

    if (source === dest) {
        await ctx.reply('⚠️ Sumber dan Tujuan tidak boleh sama! Silakan pilih tujuan lain.');
        return; // Stay in step
    }

    await ctx.reply(`✅ Ke: ${dest}\n\n💰 Berapa nominal bersih yang akan ditransfer? (Contoh: 50000)`);
    return ctx.wizard.next();
};

const step4_handleAmount_askAdmin = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (!text) {
        await ctx.reply('⚠️ Harap kirim angka nominal.');
        return;
    }

    const amount = parseCurrency(text);
    if (!amount || amount <= 0) {
        await ctx.reply('⚠️ Nominal tidak valid. Masukkan angka (contoh: 10000).');
        return;
    }

    (ctx.wizard.state as any).amount = amount;

    await ctx.reply(`💸 Berapa biaya adminnya? (Ketik 0 jika gratis)`);
    return ctx.wizard.next();
};

const step5_execute = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    // Allow empty text to mean 0? No, explicit 0 better.
    if (!text) {
        await ctx.reply('⚠️ Harap kirim angka biaya admin (atau 0).');
        return;
    }

    const adminFee = parseCurrency(text);

    // Explicitly check for undefined or null
    if (adminFee === undefined || adminFee === null || adminFee < 0) {
        await ctx.reply('⚠️ Biaya admin tidak valid. Ketik 0 jika gratis.');
        return;
    }

    const state = ctx.wizard.state as any;
    const { source, dest, amount } = state;

    // Safety check for amount from previous step
    if (!amount || typeof amount !== 'number') {
        await ctx.reply('❌ Terjadi kesalahan data nominal. Silakan ulangi /transfer.');
        return ctx.scene.leave();
    }

    try {
        await ctx.reply('⏳ Memproses transfer...');

        const result = await transferBalance(ctx.from!.id, source, dest, amount, adminFee);

        await ctx.reply(
            `✅ *Transfer Berhasil!*\n\n` +
            `📤 Dari: ${source}\n` +
            `📥 Ke: ${dest}\n` +
            `💰 Nominal: ${formatCurrency(amount)}\n` +
            `💸 Admin: ${formatCurrency(adminFee)}\n` +
            `------------------------\n` +
            `Sisa ${source}: ${formatCurrency(result.sourceBalance)}\n` +
            `Saldo ${dest}: ${formatCurrency(result.destBalance)}`,
            { parse_mode: 'Markdown' }
        );

    } catch (error) {
        logger.error('Transfer Error', { error });
        await ctx.reply('❌ Gagal melakukan transfer.');
    }

    return ctx.scene.leave();
};

export const transferScene = new Scenes.WizardScene<BotContext>(
    TRANSFER_SCENE_ID,
    step1_askSource,
    step2_handleSource_askDest,
    step3_handleDest_askAmount,
    step4_handleAmount_askAdmin,
    step5_execute
);
