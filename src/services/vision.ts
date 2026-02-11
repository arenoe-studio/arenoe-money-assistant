
import { ExtractionResult } from '../schemas/transaction';
import { openRouterChatCompletion } from './ai';
import { logger } from '../utils/logger';
import { ApplicationError } from '../utils/error';

const RECEIPT_PROMPT = `Analyze this image as a shopping receipt.
Extract visible text and categorize items intelligently.

RULES:
1. **OUTPUT**: Return RAW JSON only. NO MARKDOWN (no \`\`\`json). NO PROLOGUE/EPILOGUE.
2. **ITEMS**: Extract main line items. Ignore tax, subtotal, change, cashback.
3. **PRICE**: Use exact numbers visible.
4. **DATE**: Extract date/time if printed. Format: YYYY-MM-DD HH:mm (or null).
5. **MERCHANT**: Extract merchant name from header/logo.
6. **PAYMENT**: Detect payment method (Cash/Card/QRIS) if shown.
7. **CATEGORY**: Infer category based on item name.
   - Use: "Food", "Drink", "Snack", "Transport", "Shopping", "Health", "Other".
   - Example: "Cokelat Hangat" -> "Drink", "Nasi Goreng" -> "Food".
8. **ANTI-HALLUCINATION**: If an item name is blurry, output "Item Unknown" or skip. Do not invent names.

Output Schema:
{
  "transactions": [
    {
      "items": "Name",
      "harga": 1000,
      "namaToko": "Store",
      "metodePembayaran": "Cash",
      "tanggal": "2024-01-01 12:00",
      "kategori": "Food"
    }
  ]
}`;

/**
 * Extracts transaction details from a receipt image URL.
 * @param imageUrl Public URL of the image
 * @param paymentMethods List of valid payment methods to guide extraction
 * @returns Parsed transaction list
 */
export async function analyzeReceipt(imageUrl: string, paymentMethods?: string[]): Promise<ExtractionResult[]> {
    logger.info('Vision Service: Starting receipt analysis', { imageUrl });
    const startTime = Date.now();
    const methodsText = paymentMethods ? `\nContext: Valid Payment Methods are ${paymentMethods.join(', ')}` : '';
    try {
        const messages = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: RECEIPT_PROMPT + methodsText },
                    { type: 'image_url', image_url: { url: imageUrl } }
                ]
            }
        ];

        // Use standard GPT 5 mini
        const parsedResponse = await openRouterChatCompletion(messages, 'google/gemini-2.5-flash');

        const content = (parsedResponse as any).choices?.[0]?.message?.content;

        if (!content) {
            logger.error('Vision Service: Empty response from provider', { response: JSON.stringify(parsedResponse) });
            throw new ApplicationError('Empty response from AI vision provider');
        }

        try {
            // Cleanup potential markdown backticks
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanContent);

            let result: ExtractionResult[] = [];
            if (parsed.transactions && Array.isArray(parsed.transactions)) {
                result = parsed.transactions;
            } else if (parsed.items) {
                result = [parsed];
            } else if (Array.isArray(parsed)) {
                result = parsed;
            } else {
                throw new Error('Invalid JSON structure from Vision AI');
            }

            const duration = Date.now() - startTime;
            logger.info('Vision Service: Analysis complete', {
                duration,
                itemCount: result.length,
                totalAmount: result.reduce((sum, item) => sum + (item.harga || 0), 0)
            });
            return result;

        } catch (parseError) {
            logger.error('Vision Service: JSON Parse Error', { content, error: parseError });
            throw new ApplicationError('Gagal membaca data struk. Pastikan foto jelas.');
        }

    } catch (error) {
        if (error instanceof ApplicationError) throw error;
        logger.error('Vision API Error', {
            error: error instanceof Error ? error.message : JSON.stringify(error),
            stack: error instanceof Error ? error.stack : undefined,
            duration: Date.now() - startTime
        });
        throw new ApplicationError('Fitur baca struk sedang gangguan.', false);
    }
}
