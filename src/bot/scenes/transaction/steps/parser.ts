import { Markup } from 'telegraf';
import { BotContext } from '../../../../types';
import { parseMessage } from '../../../../services/parser';
import { PaymentMethods, PartialTransaction } from '../../../../schemas/transaction';
import { logger } from '../../../../utils/logger';
import { getMissingFields } from '../constants';
import { analyzeReceipt } from '../../../../services/vision';
import { getFileUrl } from '../../../../utils/telegram';
import { parseDateAsWIB } from '../../../../utils/format';

export const step1_parse = async (ctx: BotContext) => {
    if (!ctx.session) ctx.session = {} as any;
    ctx.session.retryCount = { merchant: 0, payment: 0 };
    ctx.session.transactions = []; // Clear previous transactions

    // Handle "Back" from Edit Menu
    if (ctx.callbackQuery && (ctx.callbackQuery as any).data === 'back_to_edit_menu') {
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🏪 Ubah Toko', 'edit_merchant'), Markup.button.callback('💳 Ubah Metode', 'edit_payment')],
            [Markup.button.callback('📝 Ubah Item', 'edit_items')],
            [Markup.button.callback('🔙 Batal', 'cancel_edit')]
        ]);
        await ctx.editMessageText('Bagian mana yang ingin diubah?', keyboard);
        ctx.wizard.selectStep(4); // Go to step 5 (Action Handler)
        return;
    }

    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const isPhoto = ctx.message && 'photo' in ctx.message;

    if (!messageText && !isPhoto) {
        await ctx.reply('Mohon kirim pesan teks atau foto struk.');
        return ctx.scene.leave();
    }

    // Capture existing data removed as we cleared session
    const defaultStore = undefined;
    const defaultPayment = undefined;

    let processingMsg;
    try {
        const { getUserPaymentMethods } = await import('../../../../services/payment');
        const userMethods = await getUserPaymentMethods(ctx.from!.id);
        const methodNames = userMethods.map(m => m.name);

        processingMsg = await ctx.reply('⏳ Memproses...');
        let parsed;

        if (isPhoto) {
            // Handle Photo
            const photo = (ctx.message as any).photo;
            const largestPhoto = photo[photo.length - 1]; // Get highest resolution
            const fileUrl = await getFileUrl(ctx, largestPhoto.file_id);
            parsed = await analyzeReceipt(fileUrl, methodNames);

        } else {
            // Handle Text
            parsed = await parseMessage(messageText, methodNames);
        }


        // Clean up processing message
        if (processingMsg) {
            try {
                await ctx.deleteMessage(processingMsg.message_id);
            } catch (e) { /* ignore */ }
        }

        // Ensure we have an array
        const transactions = Array.isArray(parsed) ? parsed : [parsed];

        // Handle empty result (AI returned [] or similar)
        if (transactions.length === 0) {
            logger.warn('Wizard Step 1: No transactions found in message', { text: messageText, isPhoto });
            await ctx.reply('Maaf, saya tidak dapat memahami detail transaksi.\nMohon tuliskan dengan format: [Nama Item] [Harga].\nContoh: "Nasi goreng 15k"');
            return ctx.scene.leave();
        }

        // Merge defaults if missing (currently empty due to clear session)
        const transactionsWithDate: PartialTransaction[] = transactions.map(t => {
            const base: PartialTransaction = {
                items: t.items,
                harga: t.harga,
                namaToko: t.namaToko,
                // Force ask payment method for Receipts (Vision) as it's unreliable
                // For Text, keep AI prediction if available
                metodePembayaran: isPhoto ? undefined : (t.metodePembayaran as any),
                kategori: t.kategori
            };


            // Parse date or use today
            if (t.tanggal) {
                logger.info('Parser: Date conversion', {
                    rawTanggal: t.tanggal,
                    type: typeof t.tanggal
                });

                // Fix timezone issue: parse as WIB instead of UTC
                if (typeof t.tanggal === 'string') {
                    base.tanggal = parseDateAsWIB(t.tanggal);
                } else {
                    // If already a Date object, use as-is
                    base.tanggal = t.tanggal;
                }

                logger.info('Parser: Date converted', {
                    dateObject: base.tanggal.toISOString(),
                    localString: base.tanggal.toString()
                });
                (base as any)._tanggalSpecified = true;
            } else {
                base.tanggal = new Date();
                (base as any)._tanggalSpecified = false;
            }
            return base;
        });

        ctx.session.transactions = transactionsWithDate;
        // Legacy support/Convenience
        ctx.session.transaction = transactionsWithDate[0];

        logger.info('Wizard Step 1: Parsing message', { text: messageText, count: transactions.length });

        const missing = getMissingFields(transactionsWithDate as any);

        if (missing.includes('items') || missing.includes('harga')) {
            logger.warn('Wizard Step 1: Missing items or price in one or more items', { missing });
            await ctx.reply('Maaf, ada item yang data item/harga tidak lengkap.');
            return ctx.scene.leave();
        }

        if (missing.includes('namaToko')) {
            logger.info('Wizard Step 1: Missing merchant, asking user');
            await ctx.reply('Beli di mana?');
            ctx.wizard.selectStep(1);
            return;
        }

        if (missing.includes('metodePembayaran')) {
            logger.info('Wizard Step 1: Missing payment, asking user');
            const { getPaymentMenu } = await import('../../../../utils/keyboard');
            const { getUserPaymentMethods } = await import('../../../../services/payment');
            const userMethods = await getUserPaymentMethods(ctx.from!.id);
            const keyboard = getPaymentMenu('main', userMethods);

            await ctx.reply('Pilih Kategori Pembayaran', keyboard);
            ctx.wizard.selectStep(2); // Cursor 2 is step3_payment
            return;
        }

        logger.info('Wizard Step 1: Complete, skipping to confirm');
        ctx.wizard.selectStep(3);
        return (ctx.wizard.steps[3] as any)(ctx);

    } catch (error) {
        if (processingMsg) {
            try {
                await ctx.deleteMessage(processingMsg.message_id);
            } catch (e) { /* ignore */ }
        }
        logger.error('Scene Start Error', { error });
        await ctx.reply('Error memproses pesan.');
        return ctx.scene.leave();
    }
};
