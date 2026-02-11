
import { db } from '../db/client';
import { paymentMethods, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { PaymentMethods as DefaultPayments } from '../schemas/transaction';
import { getOrCreateUser } from './user';

// Define type for Payment Method Info
export interface PaymentMethodInfo {
  name: string;
  category: string; // 'Cash', 'Bank', 'E-Wallet', 'Other', etc.
}

/**
 * Adds a new custom payment method for a specific user.
 */
export async function addCustomPaymentMethod(telegramId: number, name: string, category: string = 'Other') {
  // Find or Create user
  const user = await getOrCreateUser(telegramId);

  // Check if already exists in default
  const isDefault = DefaultPayments.some(p => p.toLowerCase() === name.toLowerCase());
  if (isDefault) return { success: false, message: 'Metode ini sudah ada di daftar standar.' };

  // Check if already exists in custom
  const existingResults = await db.select().from(paymentMethods).where(
    and(
      eq(paymentMethods.userId, user.id),
      eq(paymentMethods.name, name)
    )
  ).limit(1);

  if (existingResults.length > 0) return { success: false, message: 'Metode ini sudah terdaftar.' };

  await db.insert(paymentMethods).values({
    userId: user.id,
    name: name,
    category: category
  });

  return { success: true, message: `Berhasil menambahkan "${name}" (${category}) ke pilihan pembayaran.` };
}

/**
 * Retrieves all payment methods for a user (Default + Custom).
 */
export async function getUserPaymentMethods(telegramId: number): Promise<PaymentMethodInfo[]> {
  const user = await getOrCreateUser(telegramId);

  // Default Categories Mapping
  const defaultCategories: Record<string, string> = {
    'Cash': 'Cash',
    'BCA': 'Bank', 'BNI': 'Bank', 'BRI': 'Bank', 'Blu': 'Bank',
    'GoPay': 'E-Wallet', 'OVO': 'E-Wallet', 'DANA': 'E-Wallet', 'ShopeePay': 'E-Wallet'
  };

  const defaultMethods: PaymentMethodInfo[] = DefaultPayments.map(name => ({
      name,
      category: defaultCategories[name] || 'Other'
  }));

  if (!user) return defaultMethods;

  const custom = await db.select().from(paymentMethods).where(eq(paymentMethods.userId, user.id));
  
  const customMethods: PaymentMethodInfo[] = custom.map(c => ({
      name: c.name,
      category: c.category || 'Other'
  }));

  return [...defaultMethods, ...customMethods];
}

/**
 * Reset User's Payment Methods (Delete all custom methods).
 * User will return to "Default Methods Only".
 */
export async function resetUserMethods(telegramId: number) {
    const user = await getOrCreateUser(telegramId);
    
    await db.delete(paymentMethods).where(eq(paymentMethods.userId, user.id));
    
    return { success: true };
}
