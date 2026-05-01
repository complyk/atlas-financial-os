// Runtime importer for Kayne's monthly budget workbook.
// The user updates their spreadsheet each month, then drops it into Atlas
// to absorb the latest balances, comments, and retirement target.

import * as XLSX from 'xlsx';
import { db } from '../db/schema';
import type { AuditEntry, MonthlySnapshot } from '../db/schema';
import { generateId } from './utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface XLSXSyncReport {
  monthsAdded: number;
  monthsUpdated: number;
  goalsUpdated: number;
  retirementTargetAED?: number;
  notes: string[];
}

export interface DetectedWorkbook {
  kind: 'kayne_budget' | 'generic';
  sheets: {
    monthlyReviews?: string;
    budget?: string;
    retirement?: string;
  };
}

export interface ParsedMonthlyReview {
  yearMonth: string;
  sylSave: number | null;
  kayneSave: number | null;
  total: number;
  ccTotal: number;
  comment: string | null;
}

export interface ParsedRetirement {
  target4pct: number;
  target3pct: number;
  annualExpenses: number;
}

// ─── Workbook helpers ────────────────────────────────────────────────────────

export async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: 'array', cellDates: true });
}

export function detectWorkbookKind(wb: XLSX.WorkBook): DetectedWorkbook {
  const sheets = wb.SheetNames;
  const findSheet = (re: RegExp) => sheets.find(s => re.test(s));

  const monthlyReviews = findSheet(/monthly\s*review/i);
  const budget = findSheet(/^budget$/i) ?? findSheet(/budget/i);
  const retirement = findSheet(/retirement/i);

  if (monthlyReviews && budget) {
    return {
      kind: 'kayne_budget',
      sheets: { monthlyReviews, budget, retirement },
    };
  }
  return { kind: 'generic', sheets: {} };
}

// ─── Monthly Reviews parser ──────────────────────────────────────────────────
// Layout:
//   Row 0 (Excel row 1):   month headers (Date cells)
//   Row 1 (Excel row 2):   Savings Syl
//   Row 2 (Excel row 3):   Savings Kayne
//   Row 3 (Excel row 4):   Total
//   Row 6 (Excel row 7):   CC total
//   Row 7 (Excel row 8):   Comment / notes

export function parseMonthlyReviews(
  wb: XLSX.WorkBook,
  sheetName: string,
): ParsedMonthlyReview[] {
  const ws = wb.Sheets[sheetName];
  if (!ws || !ws['!ref']) return [];
  const range = XLSX.utils.decode_range(ws['!ref']);
  const results: ParsedMonthlyReview[] = [];

  for (let c = range.s.c + 1; c <= range.e.c; c++) {
    const monthCell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (!monthCell || monthCell.v == null) continue;

    let yearMonth: string | null = null;
    if (monthCell.v instanceof Date) {
      const d = monthCell.v;
      yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (typeof monthCell.v === 'string') {
      // Try to parse a string like "2026-05" or "May 2026"
      const s = monthCell.v.trim();
      const isoMatch = s.match(/^(\d{4})-(\d{1,2})/);
      if (isoMatch) {
        yearMonth = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}`;
      } else {
        const dt = new Date(s);
        if (!Number.isNaN(dt.getTime())) {
          yearMonth = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        }
      }
    }
    if (!yearMonth) continue;

    const num = (r: number): number | null => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      return typeof cell?.v === 'number' ? (cell.v as number) : null;
    };
    const str = (r: number): string | null => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      return cell?.v ? String(cell.v).trim() : null;
    };

    const syl = num(1);
    const kayne = num(2);
    const total = num(3) ?? (syl ?? 0) + (kayne ?? 0);
    const cc = num(6) ?? 0;
    const comment = str(7);

    // Skip empty/future columns where there is no signal at all.
    if (total === 0 && syl == null && kayne == null && !comment) continue;

    results.push({
      yearMonth,
      sylSave: syl,
      kayneSave: kayne,
      total,
      ccTotal: cc,
      comment,
    });
  }

  return results;
}

// ─── Retirement parser ───────────────────────────────────────────────────────
// Workbook layout:
//   Row 2 (B3): annual expenses
//   Row 7 (B8): 4% withdrawal target
//   Row 8 (B9): 3% withdrawal target

export function parseRetirement(
  wb: XLSX.WorkBook,
  sheetName: string,
): ParsedRetirement | null {
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;

  const cellNum = (r: number, c: number): number | null => {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    return typeof cell?.v === 'number' ? (cell.v as number) : null;
  };

  const annual = cellNum(2, 1);
  const t4 = cellNum(7, 1);
  const t3 = cellNum(8, 1);

  if (typeof t4 !== 'number') return null;
  return {
    target4pct: t4,
    target3pct: t3 ?? t4 * (4 / 3),
    annualExpenses: annual ?? 0,
  };
}

// ─── Sync to Dexie ───────────────────────────────────────────────────────────

export async function syncMonthlyReviews(
  parsed: ParsedMonthlyReview[],
): Promise<XLSXSyncReport> {
  const report: XLSXSyncReport = {
    monthsAdded: 0,
    monthsUpdated: 0,
    goalsUpdated: 0,
    notes: [],
  };

  if (parsed.length === 0) return report;

  const todayYM = new Date().toISOString().slice(0, 7);
  const existing = await db.monthlySnapshots.toArray();
  const existingByMonth = new Map(existing.map(s => [s.yearMonth, s]));

  // Only sync months that are at-or-before the current month and have data.
  const real = parsed
    .filter(p => p.yearMonth <= todayYM && (p.total > 0 || p.comment))
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

  const monthlyIncome = 55000;

  for (let i = 0; i < real.length; i++) {
    const p = real[i];
    const prev = i > 0 ? real[i - 1] : null;
    const savingsAmount = prev ? p.total - prev.total : 0;
    const totalExpenses = Math.max(0, monthlyIncome - savingsAmount);
    const savingsRate = monthlyIncome > 0
      ? Math.max(-1, Math.min(1, savingsAmount / monthlyIncome))
      : 0;

    const existingRow = existingByMonth.get(p.yearMonth);
    const id = existingRow?.id ?? generateId();

    const snapshot: MonthlySnapshot = {
      id,
      yearMonth: p.yearMonth,
      netWorth: Math.round(p.total - p.ccTotal),
      liquidSavings: Math.round(p.total * 0.4),
      investments: Math.round(p.total * 0.6),
      pension: 0,
      totalLiabilities: Math.round(p.ccTotal),
      totalAssets: Math.round(p.total),
      totalIncome: monthlyIncome,
      totalExpenses: Math.round(totalExpenses),
      savingsRate,
      createdAt: existingRow?.createdAt ?? new Date().toISOString(),
    };

    if (existingRow) {
      await db.monthlySnapshots.put(snapshot);
      report.monthsUpdated++;
    } else {
      await db.monthlySnapshots.add(snapshot);
      report.monthsAdded++;
    }

    if (p.comment) {
      const auditEntry: AuditEntry = {
        id: generateId(),
        table: 'monthlySnapshots',
        recordId: id,
        action: existingRow ? 'update' : 'create',
        after: { yearMonth: p.yearMonth, note: p.comment },
        timestamp: new Date().toISOString(),
      };
      await db.auditLog.add(auditEntry);
      report.notes.push(`${p.yearMonth}: ${p.comment.slice(0, 80)}`);
    }
  }

  return report;
}

export async function syncRetirementGoal(
  parsed: ParsedRetirement,
): Promise<boolean> {
  const goal = await db.goals.where('type').equals('retirement').first();
  if (!goal) return false;

  await db.goals.update(goal.id, {
    targetAmount: Math.round(parsed.target4pct),
    updatedAt: new Date().toISOString(),
  });
  return true;
}

// ─── End-to-end: detect + sync ───────────────────────────────────────────────

export async function syncWorkbook(file: File): Promise<XLSXSyncReport> {
  const wb = await readWorkbook(file);
  const detected = detectWorkbookKind(wb);

  if (detected.kind !== 'kayne_budget' || !detected.sheets.monthlyReviews) {
    return {
      monthsAdded: 0,
      monthsUpdated: 0,
      goalsUpdated: 0,
      notes: [
        'XLSX support is currently optimised for the Kayne budget workbook (with Monthly Reviews + Budget tabs). CSV transactions still work.',
      ],
    };
  }

  const reviews = parseMonthlyReviews(wb, detected.sheets.monthlyReviews);
  const report = await syncMonthlyReviews(reviews);

  if (detected.sheets.retirement) {
    const retire = parseRetirement(wb, detected.sheets.retirement);
    if (retire) {
      const updated = await syncRetirementGoal(retire);
      if (updated) {
        report.goalsUpdated++;
        report.retirementTargetAED = Math.round(retire.target4pct);
      }
    }
  }

  return report;
}
