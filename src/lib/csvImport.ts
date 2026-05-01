// CSV parsing and column mapping utilities for bank statement imports.
// Vanilla — no external CSV library.

export interface CSVRow {
  [key: string]: string;
}

export interface ParsedCSV {
  headers: string[];
  rows: CSVRow[];
  rawRows: string[][];
}

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  credit?: string;
  debit?: string;
  category?: string;
  balance?: string;
}

export type AmountSign = 'signed' | 'split';

export interface DetectedFormat {
  mapping: Partial<ColumnMapping>;
  dateFormat: string;
  decimalSeparator: '.' | ',';
  amountSign: AmountSign;
  bank?: string;
}

export interface ImportableTx {
  date: string; // ISO yyyy-MM-dd
  description: string;
  amount: number; // always positive
  type: 'income' | 'expense';
  rawRow: CSVRow;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse CSV text into structured rows.
 * Handles:
 *  - BOM at start of file
 *  - quoted fields containing commas, newlines, escaped quotes ("")
 *  - line endings: \r\n, \n, \r
 */
export function parseCSV(text: string): ParsedCSV {
  // Strip BOM if present.
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const rawRows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote?
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (ch === '\r') {
      // \r\n or lone \r
      if (text[i + 1] === '\n') i++;
      row.push(field);
      rawRows.push(row);
      field = '';
      row = [];
      continue;
    }

    if (ch === '\n') {
      row.push(field);
      rawRows.push(row);
      field = '';
      row = [];
      continue;
    }

    field += ch;
  }

  // Flush last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rawRows.push(row);
  }

  // Drop fully-empty trailing rows
  while (rawRows.length > 0) {
    const last = rawRows[rawRows.length - 1];
    if (last.length === 0 || (last.length === 1 && last[0] === '')) {
      rawRows.pop();
    } else {
      break;
    }
  }

  if (rawRows.length === 0) {
    return { headers: [], rows: [], rawRows: [] };
  }

  const headers = rawRows[0].map(h => h.trim());
  const dataRawRows = rawRows.slice(1);
  const rows: CSVRow[] = dataRawRows.map(cells => {
    const obj: CSVRow = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? '').trim();
    });
    return obj;
  });

  return { headers, rows, rawRows: dataRawRows };
}

// ─── Format detection ─────────────────────────────────────────────────────────

interface BankTemplate {
  name: string;
  match: (headers: string[]) => boolean;
  mapping: Partial<ColumnMapping>;
  amountSign: AmountSign;
  dateFormat?: string;
}

const BANK_TEMPLATES: BankTemplate[] = [
  {
    name: 'Mashreq',
    match: (h) =>
      hasAll(h, ['transaction date', 'narration']) &&
      hasAny(h, ['debit']) &&
      hasAny(h, ['credit']),
    mapping: {
      date: pickByContains(['transaction date']),
      description: pickByContains(['narration']),
      debit: pickByContains(['debit']),
      credit: pickByContains(['credit']),
      balance: pickByContains(['balance']),
    },
    amountSign: 'split',
    dateFormat: 'dd/MM/yyyy',
  },
  {
    name: 'Emirates NBD',
    match: (h) =>
      (hasAll(h, ['date', 'description', 'amount']) || hasAll(h, ['date', 'narration', 'amount'])) &&
      hasAny(h, ['balance']),
    mapping: {
      date: pickByContains(['date']),
      description: pickByContains(['description', 'narration']),
      amount: pickByContains(['amount']),
      balance: pickByContains(['balance']),
    },
    amountSign: 'signed',
    dateFormat: 'dd/MM/yyyy',
  },
  {
    name: 'ADCB',
    match: (h) =>
      hasAll(h, ['date', 'description', 'amount']) && hasAny(h, ['reference']),
    mapping: {
      date: pickByContains(['date']),
      description: pickByContains(['description']),
      amount: pickByContains(['amount']),
    },
    amountSign: 'signed',
    dateFormat: 'dd/MM/yyyy',
  },
  {
    name: 'Revolut',
    match: (h) =>
      hasAll(h, ['type', 'started date', 'description', 'amount']) &&
      hasAny(h, ['state']),
    mapping: {
      date: pickByContains(['completed date', 'started date']),
      description: pickByContains(['description']),
      amount: pickByContains(['amount']),
      balance: pickByContains(['balance']),
    },
    amountSign: 'signed',
    dateFormat: 'yyyy-MM-dd',
  },
  {
    name: 'Wise',
    match: (h) =>
      hasAll(h, ['date', 'amount', 'currency', 'description']) && hasAny(h, ['source', 'target', 'transferwise id', 'id']),
    mapping: {
      date: pickByContains(['date']),
      description: pickByContains(['description']),
      amount: pickByContains(['amount']),
    },
    amountSign: 'signed',
    dateFormat: 'dd-MM-yyyy',
  },
];

function hasAll(headers: string[], needles: string[]): boolean {
  const lower = headers.map(h => h.toLowerCase());
  return needles.every(n => lower.some(h => h.includes(n)));
}

function hasAny(headers: string[], needles: string[]): boolean {
  const lower = headers.map(h => h.toLowerCase());
  return needles.some(n => lower.some(h => h.includes(n)));
}

function pickByContains(needles: string[]) {
  // Returns a placeholder marker — resolved later with actual headers.
  return `__pick:${needles.join('|')}__`;
}

function resolvePicks(mapping: Partial<ColumnMapping>, headers: string[]): Partial<ColumnMapping> {
  const lower = headers.map(h => h.toLowerCase());
  const out: Partial<ColumnMapping> = {};
  (Object.keys(mapping) as Array<keyof ColumnMapping>).forEach(key => {
    const val = mapping[key];
    if (typeof val !== 'string') return;
    if (val.startsWith('__pick:')) {
      const needles = val.slice(7, -2).split('|');
      for (const needle of needles) {
        const idx = lower.findIndex(h => h.includes(needle));
        if (idx >= 0) {
          out[key] = headers[idx];
          return;
        }
      }
    } else {
      out[key] = val;
    }
  });
  return out;
}

/**
 * Inspect headers + a few sample rows and guess a sensible mapping.
 */
export function detectFormat(parsed: ParsedCSV): DetectedFormat {
  const headers = parsed.headers;

  // Try bank templates first.
  let template: BankTemplate | undefined;
  for (const t of BANK_TEMPLATES) {
    if (t.match(headers)) {
      template = t;
      break;
    }
  }

  let mapping: Partial<ColumnMapping>;
  let amountSign: AmountSign;
  let bank: string | undefined;
  let dateFormat: string;

  if (template) {
    mapping = resolvePicks(template.mapping, headers);
    amountSign = template.amountSign;
    bank = template.name;
    dateFormat = template.dateFormat ?? 'yyyy-MM-dd';
  } else {
    // Generic fallback — best-effort guesses.
    mapping = {};
    const lower = headers.map(h => h.toLowerCase());

    const findHeader = (...needles: string[]): string | undefined => {
      for (const n of needles) {
        const idx = lower.findIndex(h => h.includes(n));
        if (idx >= 0) return headers[idx];
      }
      return undefined;
    };

    mapping.date = findHeader('date', 'posted', 'transaction');
    mapping.description = findHeader('description', 'narration', 'memo', 'details', 'particulars');
    const debit = findHeader('debit', 'withdrawal');
    const credit = findHeader('credit', 'deposit');
    const amount = findHeader('amount', 'value');
    if (debit && credit) {
      mapping.debit = debit;
      mapping.credit = credit;
      amountSign = 'split';
    } else {
      mapping.amount = amount;
      amountSign = 'signed';
    }
    mapping.balance = findHeader('balance');
    mapping.category = findHeader('category');
    dateFormat = 'yyyy-MM-dd';
  }

  // Sample first row to refine date format and decimal separator.
  const sample = parsed.rows[0];
  if (sample && mapping.date) {
    const detected = inferDateFormat(parsed.rows.slice(0, 10).map(r => r[mapping.date!]).filter(Boolean));
    if (detected) dateFormat = detected;
  }

  let decimalSeparator: '.' | ',' = '.';
  if (sample) {
    const sampleAmount =
      mapping.amount ? sample[mapping.amount] :
      mapping.debit ? (sample[mapping.debit] || (mapping.credit ? sample[mapping.credit] : '')) :
      '';
    if (sampleAmount && /,\d{1,2}\b/.test(sampleAmount) && !/\.\d{1,2}\b/.test(sampleAmount)) {
      decimalSeparator = ',';
    }
  }

  return { mapping, dateFormat, decimalSeparator, amountSign, bank };
}

const DATE_FORMAT_CANDIDATES = [
  'yyyy-MM-dd',
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'dd-MM-yyyy',
  'yyyy/MM/dd',
  'dd MMM yyyy',
  'd MMM yyyy',
  'dd-MMM-yyyy',
];

function inferDateFormat(samples: string[]): string | null {
  for (const fmt of DATE_FORMAT_CANDIDATES) {
    if (samples.every(s => parseDateWithFormat(s, fmt) !== null)) {
      return fmt;
    }
  }
  return null;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Parse a date string given a format. Returns ISO yyyy-MM-dd or null on failure.
 * Supported tokens: yyyy, MM, dd, MMM, d.
 */
export function parseDateWithFormat(input: string, format: string): string | null {
  if (!input) return null;
  const s = input.trim();

  // Extract numeric/text components from input based on format tokens.
  const tokenRegex = /yyyy|MMM|MM|dd|d/g;
  const tokens: string[] = [];
  let formatRegexStr = '';
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(format)) !== null) {
    formatRegexStr += escapeRegex(format.slice(lastIdx, match.index));
    const tok = match[0];
    tokens.push(tok);
    if (tok === 'yyyy') formatRegexStr += '(\\d{4})';
    else if (tok === 'MMM') formatRegexStr += '([A-Za-z]{3,5})';
    else if (tok === 'MM') formatRegexStr += '(\\d{2})';
    else if (tok === 'dd') formatRegexStr += '(\\d{2})';
    else if (tok === 'd') formatRegexStr += '(\\d{1,2})';
    lastIdx = match.index + tok.length;
  }
  formatRegexStr += escapeRegex(format.slice(lastIdx));

  const re = new RegExp('^' + formatRegexStr + '$');
  const m = re.exec(s);
  if (!m) return null;

  let year = 0, month = 0, day = 0;
  for (let i = 0; i < tokens.length; i++) {
    const value = m[i + 1];
    const tok = tokens[i];
    if (tok === 'yyyy') year = Number(value);
    else if (tok === 'MMM') {
      const monthNum = MONTH_MAP[value.toLowerCase().slice(0, 4)] ?? MONTH_MAP[value.toLowerCase().slice(0, 3)];
      if (!monthNum) return null;
      month = monthNum;
    }
    else if (tok === 'MM' || tok === 'M') month = Number(value);
    else if (tok === 'dd' || tok === 'd') day = Number(value);
  }

  if (!year || !month || !day) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const iso = `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
  return iso;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function pad4(n: number): string {
  return n.toString().padStart(4, '0');
}

// ─── Mapping application ──────────────────────────────────────────────────────

function parseAmount(raw: string, decimalSeparator: string): number {
  if (!raw) return 0;
  let s = raw.trim();
  // Strip currency symbols and spaces
  s = s.replace(/[^\d,.\-+()]/g, '');
  // Parentheses → negative
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (decimalSeparator === ',') {
    // Remove thousand-separator dots, swap comma → dot
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // Remove thousand-separator commas
    s = s.replace(/,/g, '');
  }
  const n = Number(s);
  if (Number.isNaN(n)) return 0;
  return negative ? -n : n;
}

export function applyMapping(
  parsed: ParsedCSV,
  mapping: ColumnMapping,
  dateFormat: string,
  decimalSeparator: string,
  amountSign: AmountSign,
): ImportableTx[] {
  const out: ImportableTx[] = [];
  for (const row of parsed.rows) {
    const dateRaw = row[mapping.date] ?? '';
    const description = (row[mapping.description] ?? '').trim();
    const iso = parseDateWithFormat(dateRaw, dateFormat);
    if (!iso) continue;
    if (!description) continue;

    let signed = 0;
    if (amountSign === 'split') {
      const debitRaw = mapping.debit ? row[mapping.debit] : '';
      const creditRaw = mapping.credit ? row[mapping.credit] : '';
      const debit = parseAmount(debitRaw ?? '', decimalSeparator);
      const credit = parseAmount(creditRaw ?? '', decimalSeparator);
      if (credit > 0) signed = credit;
      else if (debit > 0) signed = -debit;
      else continue;
    } else {
      const amt = parseAmount(row[mapping.amount] ?? '', decimalSeparator);
      if (amt === 0) continue;
      signed = amt;
    }

    const amount = Math.abs(signed);
    const type: 'income' | 'expense' = signed > 0 ? 'income' : 'expense';

    out.push({
      date: iso,
      description,
      amount,
      type,
      rawRow: row,
    });
  }
  return out;
}
