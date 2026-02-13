import { openRouterChatCompletion } from './ai';
import { logger } from '../utils/logger';
import { ApplicationError } from '../utils/error';

const INCOME_PARSER_PROMPT = `Kamu adalah parser income/pemasukan yang SANGAT PRESISI dan CERDAS.

Tugasmu: dari pesan user tentang PEMASUKAN, ekstrak data menjadi JSON.

ATURAN UTAMA (ANTI-HALUSINASI):
1. **JANGAN MENGIRA-NGIRA**. Jika data tidak eksplisit, return \`null\`.
2. **Keterangan/Description**: Hapus kata kerja (dapat, terima, masuk). Ambil inti keterangannya.
   - "Dapat gaji" -> "Gaji"
   - "Terima bonus" -> "Bonus"
   - "Masuk uang dari freelance" -> "Freelance"
   - "Fee gambar B3 Pak Tommy" -> "Fee Gambar B3 Pak Tommy"
   - "500k gaji" -> description: "Gaji", amount: 500000
3. **Nominal** (PENTING - HARUS PRESISI):
   - "500k" -> 500000 (BUKAN 2500000, BUKAN 5000000)
   - "15k" -> 15000
   - "1.5jt" -> 1500000
   - "2jt" -> 2000000
   - "25rb" -> 25000
   - "1500000" -> 1500000
   - "k" = "ribu" = x1000, "jt" = "juta" = x1000000
   - Jika ada angka dengan suffix "k", kalikan dengan 1000 SAJA.
   - **JANGAN MENAMBAHKAN ANGKA YANG TIDAK ADA**
   - Jika tidak ada nominal, return \`null\`.
4. **Tanggal** (PENTING - DETEKSI LEBIH BAIK):
   - Default: \`null\` (backend akan gunakan hari ini)
   - Ekstrak HANYA jika user menyebut tanggal eksplisit:
     * "2 februari 2026" -> "2026-02-02"
     * "15 jan 2026" -> "2026-01-15"
     * "6 Februari 2026" -> "2026-02-06"
     * "kemarin" -> hitung dari hari ini
     * "tgl 5" -> tahun/bulan sekarang, tanggal 5
     * "Jumat lalu" -> hitung dari hari ini
     * "3 hari yang lalu" -> hitung dari hari ini
   - Format output: **YYYY-MM-DD** (TANPA JAM/WAKTU)
   - **JANGAN** tambahkan jam (HH:mm:ss) kecuali user secara eksplisit menulis jam
   - **PRIORITAS**: Jika ada tanggal di awal pesan, PASTI ekstrak.
5. **Pesan Multi-baris**: User mungkin menulis dalam beberapa baris. Gabungkan semua info:
   - Baris 1: "6 Februari 2026" (tanggal)
   - Baris 2: "500k" (nominal)
   - Baris 3: "Fee gambar B3 Pak Tommy" (keterangan)
   -> { "description": "Fee Gambar B3 Pak Tommy", "amount": 500000, "tanggal": "2026-02-06" }

OUTPUT FORMAT (JSON ONLY, tanpa penjelasan):
{
  "description": string | null,
  "amount": number | null,
  "tanggal": string | null
}

CONTOH:
Input: "Gaji 5jt"
Output: { "description": "Gaji", "amount": 5000000, "tanggal": null }

Input: "Bonus 500rb kemarin"
Output: { "description": "Bonus", "amount": 500000, "tanggal": "[YESTERDAY_DATE]" }

Input: "2 februari 2026 dapat uang freelance 2jt"
Output: { "description": "Freelance", "amount": 2000000, "tanggal": "2026-02-02" }

Input: "500k"
Output: { "description": null, "amount": 500000, "tanggal": null }

Input: "6 Februari 2026\\n500k\\nFee gambar B3 Pak Tommy"
Output: { "description": "Fee Gambar B3 Pak Tommy", "amount": 500000, "tanggal": "2026-02-06" }

Input: "Freelance 500k 6 feb 2026"
Output: { "description": "Freelance", "amount": 500000, "tanggal": "2026-02-06" }

PERINGATAN:
- 500k = 500.000, BUKAN 2.500.000 atau 5.000.000
- 1jt = 1.000.000
- Jangan menambahkan digit yang tidak ada
`;

export interface IncomeParseResult {
    description: string | null;
    amount: number | null;
    tanggal: string | null;
}

/**
 * Parse income message using GPT-4o-mini via OpenRouter
 */
export async function parseIncomeMessage(message: string): Promise<IncomeParseResult> {
    const now = new Date();
    // Use WIB timezone for date context
    const jakartaOffset = 7 * 60; // UTC+7
    const jakartaTime = new Date(now.getTime() + (jakartaOffset + now.getTimezoneOffset()) * 60000);
    const today = jakartaTime.toISOString().split('T')[0];

    // Calculate yesterday
    const yesterday = new Date(jakartaTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    try {
        const response = await openRouterChatCompletion([
            { role: 'system', content: INCOME_PARSER_PROMPT },
            {
                role: 'user',
                content: `Hari ini: ${today}\nKemarin: ${yesterdayStr}\nPesan: "${message}"`
            }
        ]);

        const content = (response as any).choices?.[0]?.message?.content;

        if (!content) {
            logger.error('Empty response from AI provider for income parsing');
            throw new ApplicationError('AI tidak merespons');
        }

        logger.info('Income AI raw response', { content });

        try {
            // Clean potential markdown code blocks
            const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanContent);

            // Validate: at least one field must be present
            if (!parsed.description && !parsed.amount && !parsed.tanggal) {
                throw new Error('All fields are null');
            }

            return {
                description: parsed.description || null,
                amount: parsed.amount || null,
                tanggal: parsed.tanggal || null
            };
        } catch (parseError) {
            logger.error('Failed to parse income AI response', { content, error: parseError });
            throw new ApplicationError('Format respons AI tidak valid');
        }
    } catch (error) {
        if (error instanceof ApplicationError) throw error;
        logger.error('Income Parser Error', { error });
        throw new ApplicationError('Gagal memproses pesan income');
    }
}
