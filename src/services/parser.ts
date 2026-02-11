import { Transaction, PartialTransaction } from '../schemas/transaction';
import { extractTransaction } from './ai';
import { parseCurrency } from '../utils/currency';
import { logger } from '../utils/logger';

/**
 * Parse a message using AI only (regex removed as per request)
 * Returns an array of transactions to support multiple items.
 */
export async function parseMessage(message: string, paymentMethods?: string[]): Promise<PartialTransaction[]> {
  // AI Parsing (Fallback for complex/natural language)
  try {
    const aiResults = await extractTransaction(message, paymentMethods);

    logger.info('AI parsing result', { result: aiResults });

    // Map results to PartialTransaction
    const transactions: PartialTransaction[] = aiResults.map(res => ({
      items: res.items || undefined,
      harga: res.harga || undefined,
      namaToko: res.namaToko || undefined,
      metodePembayaran: res.metodePembayaran as any || undefined,
      kategori: res.kategori || undefined,
      tanggal: undefined
    }));

    return transactions.map(removeNulls);

  } catch (error) {
    logger.warn('AI parsing failed', { error });
    // Return empty array or throw? 
    // Throwing allows the bot to say "Please try again or use format..."
    throw error;
  }
}

function removeNulls(data: any): any {
  const clean: any = {};
  for (const key in data) {
    if (data[key] !== null && data[key] !== undefined) {
      clean[key] = data[key];
    }
  }
  return clean;
}
