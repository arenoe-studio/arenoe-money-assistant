
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { ExtractionSchema, ExtractionResult } from '../schemas/transaction';
import { logger } from '../utils/logger';
import { ApplicationError } from '../utils/error';

dotenv.config();

// OpenRouter configuration
const baseURL = 'https://openrouter.ai/api/v1';

// Native fetch implementation to avoid OpenAI SDK header issues
export async function openRouterChatCompletion(messages: any[], model: string = 'openai/gpt-4o-mini') {
  const apiKey = process.env.OPENROUTER_API_KEY; // Read fresh from environment

  if (!apiKey) {
    logger.error("Configuration Error: OPENROUTER_API_KEY is missing in environment variables");
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://arenoe-money-assistant.com',
      'X-Title': 'Arenoe Money Assistant',
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 4096,
      temperature: 0.1,
      messages: messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      errorJson = { message: errorText };
    }
    throw new Error(`OpenRouter API Error: ${response.status} - ${JSON.stringify(errorJson)}`);
  }

  return response.json();
}

const SYSTEM_PROMPT = `Kamu adalah mesin ekstraksi data transaksi yang SANGAT KETAT, PRESISI, dan CERDAS dalam KATEGORISASI.
Tugasmu: dari pesan user, ekstrak daftar transaksi menjadi JSON.

ATURAN UTAMA (ANTI-HALUSINASI):
1. **JANGAN MENGIRA-NGIRA**. Jika data (harga, tanggal, toko) tidak tertulis secara eksplisit, return \`null\`.
2. **Konteks**: Anggap setiap pesan adalah transaksi BARU, kecuali user secara eksplisit menulis "koreksi", "ubah", atau "salah".
3. **Barang**: Hapus kata kerja (beli, makan, bayar). Ambil nama bendanya saja.
   - "Beli pulsa 50k" -> items: "Pulsa"
   - "Makan nasi goreng" -> items: "Nasi goreng"
4. **Harga**:
   - Jika ada "k" (15k) -> 15000.
   - Jika ada "jt" (1.5jt) -> 1500000.
   - Jika ada "rb" (25rb) -> 25000.
   - Jika HANYA angka tanpa konteks uang (misal "nomor 5"), JANGAN anggap harga.
   - Jika tidak ada harga, return \`null\`.
5. **Toko**:
   - Ekstrak jika user menyebut "di [Nama Toko]" atau "via [Merchant]".
   - Jika nama barang menyiratkan toko (misal "Kopi Kenangan"), jadikan items="Kopi Kenangan" dan namaToko="Kopi Kenangan" (atau null jika tidak yakin).
   - JANGAN menebak nama toko dari items umum (e.g. "Ayam Goreng" -> JANGAN tebak "KFC").
6. **Tanggal** (PENTING - DETEKSI LEBIH BAIK):
   - Default: \`null\` (Gunakan hari ini di backend).
   - Ekstrak jika user menyebut tanggal dalam format apapun:
     * "2 februari 2026" -> "2026-02-02"
     * "15 jan 2026" -> "2026-01-15"
     * "kemarin" -> hitung dari CURRENT_DATE
     * "tgl 5" -> tahun/bulan sekarang, tanggal 5
     * "Jumat lalu" -> hitung dari CURRENT_DATE
     * "3 hari yang lalu" -> hitung dari CURRENT_DATE
   - Format output: YYYY-MM-DD
   - **PRIORITAS**: Jika ada tanggal di awal pesan (misal "2 februari 2026 pentol 14k"), PASTI ekstrak tanggalnya.
7. **Metode Pembayaran**:
   - Ekstrak jika user menyebut "pakai OVO", "via BCA", "cash", "gopay", "dana", dll.
   - Jika tidak disebut, return \`null\`.

KATEGORISASI (WAJIB ISI):
Pilih SATU dari kategori berikut berdasarkan items:
- **Food**: Makanan, minuman, snack, jajanan (e.g. Nasi, Ayam, Kopi, Es Teh, Burger, Seblak, Pentol).
- **Transport**: Bensin, parkir, tol, service kendaraan, ojek online, tiket perjalanan.
- **Shopping**: Belanja bulanan, baju, elektronik, skincare, barang rumah tangga, sabun, odol.
- **Bills**: Pulsa, listrik, air, internet, langganan streaming, SPP, asuransi, cicilan.
- **Health**: Obat, dokter, rumah sakit, vitamin.
- **Entertainment**: Nonton bioskop, game, mainan, hobi, rekreasi.
- **Other**: Sedekah, hadiah, dan lain-lain yang tidak masuk kategori di atas.

CONTOH KASUS SUSAH:
- "Pulsa 20k" -> Kategori: **Bills** (Bukan Shopping)
- "Rokok 30k" -> Kategori: **Shopping**
- "Obat batuk" -> Kategori: **Health**
- "Oli motor" -> Kategori: **Transport** (Perawatan kendaraan)
- "Galon air" -> Kategori: **Food** (Kebutuhan pokok minum)
- "2 februari 2026 pentol 14k" -> items: "Pentol", harga: 14000, tanggal: "2026-02-02", kategori: "Food"

OUTPUT FORMAT (JSON ONLY):
{
  "transactions": [
    {
      "items": string,
      "harga": number | null,
      "namaToko": string | null,
      "metodePembayaran": string | null,
      "tanggal": string | null,
      "kategori": "Food" | "Transport" | "Shopping" | "Bills" | "Health" | "Entertainment" | "Other"
    }
  ]
}

CONTOH:
Input: "Nasi padang 25rb"
Output: { "transactions": [{ "items": "Nasi padang", "harga": 25000, "namaToko": null, "metodePembayaran": null, "tanggal": null, "kategori": "Food" }] }

Input: "2 februari 2026 pentol 14k"
Output: { "transactions": [{ "items": "Pentol", "harga": 14000, "namaToko": null, "metodePembayaran": null, "tanggal": "2026-02-02", "kategori": "Food" }] }

Input: "kemarin beli bensin 100rb di pertamina"
Output: { "transactions": [{ "items": "Bensin", "harga": 100000, "namaToko": "Pertamina", "metodePembayaran": null, "tanggal": "[YESTERDAY_DATE]", "kategori": "Transport" }] }
`;

/**
 * Extracts transaction details from a natural language message using Open GPT 4o Mini via OpenRouter.
 * @param message The user's input message
 * @param paymentMethods List of valid payment methods to guide extraction
 * @returns Parsed transaction data or throws error
 */
export async function extractTransaction(message: string, paymentMethods?: string[]): Promise<ExtractionResult[]> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

  const methodsContext = paymentMethods ? `Metode Pembayaran Valid: ${paymentMethods.join(', ')}` : '';

  try {
    // Use native fetch instead of SDK
    const parsedResponse = await openRouterChatCompletion([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Hari ini: ${today} ${currentTime}\n${methodsContext}\nPesan: "${message}"` }
    ]);
    console.log("DEBUG: OpenRouter Response Status:", (parsedResponse as any).choices ? "OK" : "Empty");

    const content = (parsedResponse as any).choices?.[0]?.message?.content;

    if (!content) {
      logger.error('Empty response from AI provider', { response: JSON.stringify(parsedResponse) });
      throw new ApplicationError('Empty response from AI provider');
    }

    // Attempt to parse JSON
    try {
      const parsed = JSON.parse(content);

      if (parsed.transactions && Array.isArray(parsed.transactions)) {
        // Validate each item roughly or just cast
        return parsed.transactions;
      } else if (parsed.items) {
        // Fallback for old single object format
        return [parsed];
      }

      throw new Error('Invalid JSON structure');
    } catch (parseError) {
      logger.error('Failed to parse AI response', { content, error: parseError });
      throw new ApplicationError('Failed to parse AI response format');
    }
  } catch (error) {
    console.error("DEBUG: raw error in extractTransaction:", error);
    if (error instanceof ApplicationError) throw error;
    logger.error('OpenRouter API Error', { error });
    // Don't throw here if we want to fallback to regex entirely in caller? 
    // But caller expects Promise<ExtractionResult[]>.
    throw new ApplicationError('Jasa AI sedang tidak tersedia', false);
  }
}
