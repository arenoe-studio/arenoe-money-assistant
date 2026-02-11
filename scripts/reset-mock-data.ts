import * as dotenv from 'dotenv';
import { db } from '../src/db/client';
import { transactions, paymentBalances, paymentMethods } from '../src/db/schema';

dotenv.config();

/**
 * Reset Mock Data Script
 * 
 * This script resets all mock data in the database to defaults:
 * - Deletes all transactions
 * - Resets all payment balances to 0
 * - Deletes all custom payment methods
 * 
 * Users will be left with:
 * - Zero balances on all payment methods
 * - Only default payment methods (Cash, Banks, E-Wallets)
 */
async function resetMockData() {
    console.log('🔄 Starting mock data reset...\n');
    
    try {
        // 1. Delete all transactions
        console.log('📝 Deleting all transactions...');
        const deletedTransactions = await db.delete(transactions);
        console.log('✅ All transactions deleted');
        
        // 2. Reset all balances to 0
        console.log('\n💰 Resetting all payment balances to 0...');
        const updatedBalances = await db.update(paymentBalances)
            .set({ amount: 0, updatedAt: new Date() })
            .returning();
        console.log(`✅ Reset ${updatedBalances.length} payment balances to 0`);
        
        // 3. Delete all custom payment methods
        console.log('\n💳 Deleting all custom payment methods...');
        const deletedMethods = await db.delete(paymentMethods);
        console.log('✅ All custom payment methods deleted');
        
        // Display summary
        console.log('\n' + '='.repeat(60));
        console.log('✨ Mock Data Reset Complete!');
        console.log('='.repeat(60));
        console.log('\n📊 Summary:');
        console.log(`   • Transactions cleared: All`);
        console.log(`   • Balances reset to 0: ${updatedBalances.length} payment methods`);
        console.log(`   • Custom payment methods removed: All`);
        
        console.log('\n💡 Users now have:');
        console.log('   • Zero balance on all payment methods');
        console.log('   • Only default payment methods:');
        console.log('     - Cash');
        console.log('     - Banks: BCA, BNI, BRI, Blu');
        console.log('     - E-Wallets: GoPay, OVO, DANA, ShopeePay');
        
        console.log('\n✅ Verification:');
        console.log('   Use /cek command on Telegram to verify all balances show Rp 0');
        console.log('');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error resetting mock data:', error);
        console.error('\nPlease check:');
        console.error('  1. Database connection is working');
        console.error('  2. .env file has correct DATABASE_URL');
        console.error('  3. You have proper database permissions');
        console.error('');
        process.exit(1);
    }
}

// Run the reset
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║        Money Assistant - Mock Data Reset Script         ║');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('');

resetMockData();
