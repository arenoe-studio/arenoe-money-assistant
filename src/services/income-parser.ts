import { openRouterChatCompletion } from './ai';
import { logger } from '../utils/logger';
import { ApplicationError } from '../utils/error';

const INCOME_PARSER_PROMPT = `Kamu adalah parser income/pemasukan yang PRESISI dan CERDAS.

Tugasmu: dari pesan user tentang PEMASUKAN, ekstrak data menjadi JSON.

ATURAN:
1. **JANGAN MENGIRA-NGIRA**. Jika data tidak eksplisit, return \`null\`.
2. **Keterangan/Description**: Hapus kata kerja (dapat, terima, masuk). Ambil inti keterangannya.
   - "Dapat gaji" -> "Gaji"
   - "Terima bonus" -> "Bonus"
   - "Masuk uang dari freelance" -> "Freelance"
3. **Nominal**:
   - "15k" -> 15000
   - "1.5jt" -> 1500000
   - Jika tidak ada nominal, return \`null\`.
4. **Tanggal**:
   - Default: \`null\` (backend akan gunakan hari ini)
   - Ekstrak HANYA jika user menyebut tanggal eksplisit:
     * "2 februari 2026" -> "2026-02-02"
     * "kemarin" -> hitung dari hari ini
     * "tgl 5" -> tahun/bulan sekarang, tanggal 5
     * "Jumat lalu" -> hitung dari hari ini
   - Format output: YYYY-MM-DD

OUTPUT FORMAT (JSON ONLY):
{
  "description": string,
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
`;

export interface IncomeParseResult {
    description: string;
    amount: number | null;
    tanggal: string | null;
}

/**
 * Parse income message using GPT-4o-mini via OpenRouter
 */
export async function parseIncomeMessage(message: string): Promise<IncomeParseResult> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Calculate yesterday for context
    const yesterday = new Date(now);
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

        try {
            const parsed = JSON.parse(content);

            // Validate structure
            if (!parsed.description && !parsed.amount) {
                throw new Error('Invalid income data structure');
            }

            return {
                description: parsed.description || 'Income',
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
