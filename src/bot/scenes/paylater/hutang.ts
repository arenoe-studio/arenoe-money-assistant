import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../../types';
import { logger } from '../../../utils/logger';
import { createDebt } from '../../../services/debt';
import { parseCurrency, formatCurrency } from '../../../utils/currency';
import { titleCase } from '../../../utils/format';

export const HUTANG_SCENE_ID = 'hutang_wizard';

/**
 * Step 0: Ask creditor name (hutang ke siapa)
 */
const step0_askCreditor = async (ctx: BotContext) => {
    await ctx.reply('💳 Hutang ke siapa? (Contoh: "Budi" atau "Toko Elektronik")');
    return ctx.wizard.next();
};

/**
 * Step 1: Process creditor name and ask for description + amount
 */
const step1_processCreditor = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text || text.length < 2) {
        await ctx.reply('⚠️ Nama kreditor terlalu pendek. Coba lagi.');
        return;
    }

    (ctx.wizard.state as any).creditorName = titleCase(text.trim());

    await ctx.reply(
        `✅ Hutang ke: ${titleCase(text)}\n\n` +
        `📝 Masukkan keterangan dan nominal hutang.\n` +
        `Contoh: "beli laptop 5jt" atau "pinjam uang 500rb untuk modal usaha"`
    );

    return ctx.wizard.next();
};

/**
 * Step 2: Process description and amount using parser
 */
const step2_processDescription = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
        await ctx.reply('⚠️ Format salah. Kirim teks deskripsi dan nominal.');
        return;
    }

    try {
        const amount = parseCurrency(text);

        if (!amount || amount <= 0) {
            await ctx.reply('⚠️ Nominal tidak ditemukan atau tidak valid. Pastikan menulis angka (contoh: 5jt, 50000).');
            return;
        }

        // Extract description by removing currency parts
        let description = text;
        const currencyRegex = /(\d+(?:[.,]\d+)?)\s*(jt|juta|m|mn|rb|ribu|k|kb|ratus|rat|rp|rupiah)?/gi;
        description = description.replace(currencyRegex, '').replace(/\s+/g, ' ').trim();

        if (!description || description.length < 2) {
            (ctx.wizard.state as any).amount = amount;
            await ctx.reply('📝 Masukkan keterangan untuk hutang ini:');
            return ctx.wizard.next();
        }

        (ctx.wizard.state as any).amount = amount;
        (ctx.wizard.state as any).description = titleCase(description);

        // Skip to step 4 (ask merchant)
        return step3_askMerchant(ctx);

    } catch (error) {
        logger.error('Hutang Process Error', { error });
        await ctx.reply('❌ Gagal memproses input.');
        return ctx.scene.leave();
    }
};

/**
 * Step 3: Get description if not extracted
 */
const step3_getDescription = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
        await ctx.reply('⚠️ Harap kirim teks keterangan.');
        return;
    }

    (ctx.wizard.state as any).description = titleCase(text.trim());

    return step3_askMerchant(ctx);
};

/**
 * Ask merchant/toko
 */
const step3_askMerchant = async (ctx: BotContext) => {
    await ctx.reply('🏪 Di mana/untuk apa hutang ini? (Contoh: "Toko Komputer" atau "Untuk Modal Usaha")');
    return ctx.wizard.selectStep(4);
};

/**
 * Step 4: Process merchant and show confirmation
 */
const step4_processMerchant = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
        await ctx.reply('⚠️ Harap kirim toko/tempat.');
        return;
    }

    (ctx.wizard.state as any).merchant = titleCase(text.trim());

    const state = ctx.wizard.state as any;
    const { creditorName, description, amount, merchant } = state;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Simpan', 'hutang_confirm')],
        [Markup.button.callback('❌ Batalkan', 'hutang_cancel')]
    ]);

    await ctx.reply(
        `📋 Konfirmasi Hutang\n\n` +
        `💳 Hutang ke: ${creditorName}\n` +
        `📝 Keterangan: ${description}\n` +
        `💰 Nominal: ${formatCurrency(amount)}\n` +
        `🏪 Toko/Tempat: ${merchant}\n\n` +
        `Apakah informasi sudah benar?`,
        keyboard
    );

    return ctx.wizard.next();
};

/**
 * Step 5: Handle confirmation
 */
const step5_handleConfirmation = async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = (ctx.callbackQuery as any).data;

        if (action === 'hutang_cancel') {
            await ctx.answerCbQuery();
            await ctx.editMessageText('❌ Pencatatan hutang dibatalkan.');
            return ctx.scene.leave();
        }

        if (action === 'hutang_confirm') {
            await ctx.answerCbQuery();

            const state = ctx.wizard.state as any;
            const { creditorName, description, amount, merchant } = state;

            try {
                await ctx.editMessageText('⏳ Menyimpan hutang...');

                const result = await createDebt(
                    ctx.from!.id,
                    creditorName,
                    description,
                    amount,
                    merchant
                );

                await ctx.reply(
                    `✅ Hutang Tercatat!\n\n` +
                    `💳 Hutang ke: ${creditorName}\n` +
                    `📝 Keterangan: ${description}\n` +
                    `💰 Nominal: ${formatCurrency(amount)}\n` +
                    `🏪 Toko/Tempat: ${merchant}\n\n` +
                    `💡 Gunakan /paylater untuk melunasinya nanti.`
                );

                return ctx.scene.leave();
            } catch (error) {
                logger.error('Save Debt Error', { error });
                await ctx.reply('❌ Gagal menyimpan hutang.');
                return ctx.scene.leave();
            }
        }
    }
};

export const hutangScene = new Scenes.WizardScene<BotContext>(
    HUTANG_SCENE_ID,
    step0_askCreditor,
    step1_processCreditor,
    step2_processDescription,
    step3_getDescription,
    step4_processMerchant,
    step5_handleConfirmation
);
