import { PartialTransaction } from '../../../schemas/transaction';

export const SCENE_ID = 'transaction_wizard';

export function getMissingFields(transactions: PartialTransaction[]): string[] {
  const missing: Set<string> = new Set();
  
  for (const t of transactions) {
     if (!t.items) missing.add('items');
     if (!t.harga) missing.add('harga');
     if (!t.namaToko) missing.add('namaToko');
     if (!t.metodePembayaran) missing.add('metodePembayaran');
  }
  
  return Array.from(missing);
}
