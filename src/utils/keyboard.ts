
import { Markup } from 'telegraf';
import { PaymentMethodInfo } from '../services/payment';

type PaymentMenuType = 'main' | 'bank' | 'ewallet';

export function getPaymentMenu(type: PaymentMenuType = 'main', userMethods: PaymentMethodInfo[] = []) {
    const bankPriority = ['BCA', 'BNI', 'BRI', 'Blu'];
    const walletPriority = ['ShopeePay', 'DANA', 'OVO', 'GoPay'];

    // Sort Helper
    const sortByPriority = (arr: string[], priority: string[]) => {
        return [...arr].sort((a, b) => {
            const idxA = priority.findIndex(p => a.toLowerCase().includes(p.toLowerCase()));
            const idxB = priority.findIndex(p => b.toLowerCase().includes(p.toLowerCase()));

            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });
    };

    // Filter by Category
    const bankNames = userMethods.filter(m => m.category === 'Bank').map(m => m.name);
    const walletNames = userMethods.filter(m => m.category === 'E-Wallet').map(m => m.name);
    const otherNames = userMethods.filter(m => m.category === 'Other' && m.name !== 'Cash').map(m => m.name);

    // Sort Names
    const sortedBanks = sortByPriority(bankNames, bankPriority);
    const sortedWallets = sortByPriority(walletNames, walletPriority);
    const sortedOthers = otherNames.sort();

    switch (type) {
        case 'main':
            // Explicit order: Cash, Bank, E-Wallet
            const mainButtons = [
                Markup.button.callback('💵 Cash', 'pay_Cash'),
                Markup.button.callback('🏦 Bank', 'cat_bank'),
                Markup.button.callback('📱 E-Wallet', 'cat_ewallet'),
            ];

            // Removed 'Lainnya' button as per request
            // if (sortedOthers.length > 0) {
            //      mainButtons.push(Markup.button.callback('🔹 Lainnya', 'cat_others'));
            // }

            return Markup.inlineKeyboard(mainButtons, { columns: 1 });

        case 'bank':
            return Markup.inlineKeyboard([
                ...sortedBanks.map(m => Markup.button.callback(m, `pay_${m}`)),
                Markup.button.callback('🔙 Kembali', 'cat_main')
            ], { columns: 2 });

        case 'ewallet':
            return Markup.inlineKeyboard([
                ...sortedWallets.map(m => Markup.button.callback(m, `pay_${m}`)),
                Markup.button.callback('🔙 Kembali', 'cat_main')
            ], { columns: 2 });


        default:
            const otherButtons = sortedOthers.map(m => Markup.button.callback(m, `pay_${m}`));
            return Markup.inlineKeyboard([
                ...otherButtons,
                Markup.button.callback('🔙 Kembali', 'cat_main')
            ], { columns: 2 });
    }
}
