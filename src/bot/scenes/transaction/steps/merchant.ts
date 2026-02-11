import { Markup } from 'telegraf';
import { BotContext } from '../../../../types';
import { PaymentMethods } from '../../../../schemas/transaction';
import { logger } from '../../../../utils/logger';

export const step2_merchant = async (ctx: BotContext) => {
    // Handle "Back" from Edit Menu
    if (ctx.callbackQuery && (ctx.callbackQuery as any).data === 'back_to_edit_menu') {
        await ctx.answerCbQuery();
        ctx.wizard.selectStep(4); // Go to step 5 (Action Handler)
        return (ctx.wizard.steps[4] as any)(ctx);
    }

    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    logger.info('Wizard Step 2: Merchant Input', { text });

    if (/^\d+$/.test(text)) {
      ctx.session.retryCount!.merchant++;
      logger.warn('Wizard Step 2: Invalid merchant name', { text, retry: ctx.session.retryCount!.merchant });
      
      if (ctx.session.retryCount!.merchant >= 2) {
        await ctx.reply('Skip nama toko.');
        if (ctx.session.transaction) ctx.session.transaction.namaToko = 'Unknown';
        if (ctx.session.transactions) ctx.session.transactions.forEach(t => t.namaToko = 'Unknown');
        
        // Check if payment is missing in ANY transaction
        const missingPayment = ctx.session.transactions?.some(t => !t.metodePembayaran);

        if (missingPayment) {
            const { getPaymentMenu } = await import('../../../../utils/keyboard');
            const { getUserPaymentMethods } = await import('../../../../services/payment');
            const userMethods = await getUserPaymentMethods(ctx.from!.id);
            const keyboard = getPaymentMenu('main', userMethods);
            
            await ctx.reply('Pilih Kategori Pembayaran', keyboard);
            ctx.wizard.selectStep(2); // Cursor 2 is step3_payment
            return; // Wait for callback
        }
        
        ctx.wizard.selectStep(3); // Cursor 3 is step4_confirm
        return (ctx.wizard.steps[3] as any)(ctx);
      }
      await ctx.reply('Nama toko tidak valid. Coba lagi:');
      return;
    }
    
    // Apply merchant to ALL transactions
    if (ctx.session.transaction) ctx.session.transaction.namaToko = text;
    if (ctx.session.transactions) ctx.session.transactions.forEach(t => t.namaToko = text);
    
    // Check if payment is missing in ANY transaction
    const missingPayment = ctx.session.transactions?.some(t => !t.metodePembayaran);

    if (missingPayment) {
      logger.info('Wizard Step 2: Asking for payment');
      const { getPaymentMenu } = await import('../../../../utils/keyboard');
      const { getUserPaymentMethods } = await import('../../../../services/payment');
      const userMethods = await getUserPaymentMethods(ctx.from!.id);
      const keyboard = getPaymentMenu('main', userMethods);
      
      await ctx.reply('Pilih Kategori Pembayaran', keyboard);
      ctx.wizard.selectStep(2); // Cursor 2 is step3_payment
      return; // Wait for callback
    }
    ctx.wizard.selectStep(3); // Cursor 3 is step4_confirm
    return (ctx.wizard.steps[3] as any)(ctx);
};
