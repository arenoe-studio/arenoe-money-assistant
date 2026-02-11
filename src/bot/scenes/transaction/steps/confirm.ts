import { Markup } from 'telegraf';
import { BotContext } from '../../../../types';
import { formatCurrency } from '../../../../utils/currency';
import { autoCategory, formatDate, titleCase } from '../../../../utils/format';
import { logger } from '../../../../utils/logger';
import { saveAndFormatTransaction } from './save';

export const step4_confirm = async (ctx: BotContext) => {
    const transactions = ctx.session.transactions || (ctx.session.transaction ? [ctx.session.transaction] : []);

    if (transactions.length === 0) return ctx.scene.leave();

    const first = transactions[0];
    const now = new Date();
    const purchaseDate = first.tanggal || now;

    const purchaseDateStr = formatDate(purchaseDate, true);
    const recordDateStr = formatDate(now, true);

    const isDateMentioned = (first as any)._tanggalSpecified || purchaseDateStr !== recordDateStr;

    let dateDisplay = `📅 Tanggal: ${purchaseDateStr}`;
    if (isDateMentioned) {
        dateDisplay = `📅 Tanggal Beli: ${purchaseDateStr}\n🕒 Tanggal Catat: ${recordDateStr}`;
    }

    // Calculate Total
    const total = transactions.reduce((sum, t) => sum + (t.harga || 0), 0);
    const priceStr = formatCurrency(total);

    // Format Items List
    const itemsList = transactions.map(t => {
        const cat = t.kategori || autoCategory(t.items);
        const name = titleCase(t.items);
        const price = formatCurrency(t.harga || 0);
        return `• ${name} — ${price} (${cat})`;
    }).join('\n');

    const message = `🧾 Konfirmasi Akhir:

${dateDisplay}
🏪 Toko: ${titleCase(first.namaToko) || "-"}
💳 Metode Pembayaran: ${titleCase(first.metodePembayaran) || "-"}
💰 Total Belanja: ${priceStr}

Items:
${itemsList}

Benar? ketik YA / TIDAK`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ YA', 'confirm_yes'), Markup.button.callback('❌ TIDAK', 'confirm_no')],
        [Markup.button.callback('🗑 Batal', 'cancel_transaction')]
    ]);

    let sentMessage;
    try {
        if (ctx.callbackQuery) {
            // If editing, we return the edited message
            // Note: ctx.editMessageText returns Message | boolean. We need Message.
            sentMessage = await ctx.editMessageText(message, keyboard);
        } else {
            sentMessage = await ctx.reply(message, keyboard);
        }
    } catch (error) {
        logger.warn('Failed to edit message in confirm step, falling back to reply', { error });
        sentMessage = await ctx.reply(message, keyboard);
    }

    // Capture message details for auto-update
    if (sentMessage && typeof sentMessage === 'object' && 'message_id' in sentMessage) {
        (ctx.scene.state as any).confirmMessageId = sentMessage.message_id;
        (ctx.scene.state as any).confirmChatId = sentMessage.chat.id;
    }

    // Auto-confirmation Timer (5 seconds)
    // Clear any existing timer just in case
    if ((ctx.scene.state as any).confirmTimer) {
        clearTimeout((ctx.scene.state as any).confirmTimer);
    }

    // Set new timer
    (ctx.scene.state as any).confirmTimer = setTimeout(async () => {
        try {
            // Check if scene is still active (crudely check state flag)
            if ((ctx.scene.state as any).autoConfirmed) return;
            (ctx.scene.state as any).autoConfirmed = true;

            // Perform Save
            const successMessage = await saveAndFormatTransaction(ctx);

            // Edit the specific message if we tracked it
            const { confirmMessageId, confirmChatId } = (ctx.scene.state as any);

            if (confirmMessageId && confirmChatId) {
                try {
                    await ctx.telegram.editMessageText(confirmChatId, confirmMessageId, undefined, successMessage);
                } catch (e) {
                    // If edit fails (e.g. message deleted), send new
                    await ctx.telegram.sendMessage(confirmChatId, successMessage);
                }
            } else {
                await ctx.reply(successMessage);
            }

            // Leave scene
            // We need to use ctx.scene.leave() but ensure it still works
            // Since we are in a timeout, context functions might be tricky if socket closed, 
            // but for local polling it should be fine.
            // However, safe practice: manually clear session scene
            if (ctx.scene) {
                await ctx.scene.leave();
            }

        } catch (error) {
            logger.error('Auto-confirm failed', { error });
            // Cannot rely on reply here easily if things failed hard
        }
    }, 5000);

    ctx.wizard.next();
    return;
};
