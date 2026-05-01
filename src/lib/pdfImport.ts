import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractPdfText(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: unknown) => (it as { str?: string }).str ?? '').join(' ');
    pages.push(text);
  }
  return pages;
}

export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

// Try to extract transactions from raw text using regex patterns for common UAE bank statement layouts.
// Best-effort: works for many statements with date / description / amount patterns; users can edit
// the result in the import wizard preview step.
export function extractTransactions(pages: string[]): ExtractedTransaction[] {
  const allText = pages.join(' ');
  const txs: ExtractedTransaction[] = [];

  // Pattern: date description amount (positive or negative).
  // e.g. "01/04/2026 CARREFOUR DUBAI MARINA 245.50"
  const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+([A-Za-z][^0-9]+?)\s+(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
  let match: RegExpExecArray | null;
  while ((match = datePattern.exec(allText)) !== null) {
    const [, dateStr, desc, amtStr] = match;
    const parts = dateStr.split(/[/-]/).map((p) => parseInt(p, 10));
    if (parts.length !== 3 || parts.some((n) => isNaN(n))) continue;
    if (parts[2] < 100) parts[2] += 2000;
    let day: number, month: number, year: number;
    // If first segment > 12, it must be a day → US-style MM/dd/yyyy parse fails; treat as dd/MM/yyyy.
    if (parts[0] > 12) {
      day = parts[0];
      month = parts[1];
      year = parts[2];
    } else {
      // Assume dd/MM/yyyy for UAE/UK bank statements.
      day = parts[0];
      month = parts[1];
      year = parts[2];
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const amount = Math.abs(parseFloat(amtStr.replace(/,/g, '')));
    if (isNaN(amount) || amount === 0) continue;
    const type: 'income' | 'expense' = amtStr.startsWith('-') || amtStr.includes('DR') ? 'expense' : 'income';
    txs.push({
      date: iso,
      description: desc.trim().replace(/\s+/g, ' '),
      amount,
      type,
    });
  }
  return txs;
}
