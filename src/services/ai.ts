
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { ExtractionSchema, ExtractionResult } from '../schemas/transaction';
import { logger } from '../utils/logger';
import { ApplicationError } from '../utils/error';

dotenv.config();

// OpenRouter client configuration
const apiKey = process.env.OPENROUTER_API_KEY;
console.log("DEBUG: AI Service Config:", {
    apiKeyPresent: !!apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3-haiku'
});

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: apiKey, // Explicitly pass it to be sure
  // Explicitly disable organization and project to avoid issues with OpenRouter
  organization: null as any, 
  project: null as any,
  defaultHeaders: {
    'HTTP-Referer': 'https://arenoe-money-assistant.com', // Optional
    'X-Title': 'Arenoe Money Assistant', // Optional
  }
});

const SYSTEM_PROMPT = `Kamu adalah asisten ekstraksi data transaksi keuangan.
Tugasmu: ekstrak 4 komponen dari pesan user:
1. items (nama barang/jasa)
2. harga (dalam rupiah, konversi k/rb/ribu ke angka penuh)
3. namaToko (nama merchant/toko)
4. metodePembayaran (Cash, OVO, GoPay, DANA, ShopeePay, BCA, Mandiri)

Jika ada komponen yang tidak disebutkan, set ke null.

Return HANYA JSON tanpa penjelasan:
{
  "items": "string | null",
  "harga": number | null,
  "namaToko": "string | null",
  "metodePembayaran": "string | null"
}`;

/**
 * Extracts transaction details from a natural language message using Claude 3 Haiku via OpenRouter.
 * @param message The user's input message
 * @returns Parsed transaction data or throws error
 */
export async function extractTransaction(message: string): Promise<ExtractionResult> {
  try {
    const response = await client.chat.completions.create({
      model: 'anthropic/claude-3-haiku',
      max_tokens: 1024,
      temperature: 0.1, // Low temperature for deterministic output
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Pesan: "${message}"` }
      ]
    });
    console.log("DEBUG: OpenRouter Response Status:", response.choices ? "OK" : "Empty");
    
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new ApplicationError('Empty response from AI provider');
    }
    
    // Attempt to parse JSON
    try {
      const parsed = JSON.parse(content);
      return ExtractionSchema.parse(parsed);
    } catch (parseError) {
      logger.error('Failed to parse AI response', { content, error: parseError });
      throw new ApplicationError('Failed to parse AI response format');
    }
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    
    logger.error('OpenRouter API Error', { error });
    throw new ApplicationError('AI Service currently unavailable', false);
  }
}
