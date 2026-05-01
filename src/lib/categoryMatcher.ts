import { db } from '../db/schema';

export interface CategoryMatch {
  categoryId: string;
  confidence: number;
}

const KEYWORD_RULES: Array<{ keywords: string[]; categoryName: string }> = [
  { keywords: ['carrefour', 'lulu', 'spinneys', 'waitrose', 'choithrams'], categoryName: 'Groceries' },
  {
    keywords: [
      'talabat',
      'deliveroo',
      'careem now',
      'zomato',
      'noon food',
      'mcdonalds',
      'kfc',
      'starbucks',
    ],
    categoryName: 'Eating Out',
  },
  { keywords: ['uber', 'careem', 'rta', 'taxi', 'metro'], categoryName: 'Transport' },
  { keywords: ['adnoc', 'enoc', 'eppco', 'fuel', 'petrol'], categoryName: 'Fuel' },
  { keywords: ['salary', 'payroll', 'wages'], categoryName: 'Salary' },
  { keywords: ['rent', 'ejari'], categoryName: 'Rent' },
  { keywords: ['dewa', 'sewa', 'addc'], categoryName: 'Utilities' },
  { keywords: ['etisalat', 'du ', 'virgin mobile'], categoryName: 'Telecom' },
  {
    keywords: ['netflix', 'spotify', 'apple.com', 'icloud', 'amazon prime', 'disney'],
    categoryName: 'Subscriptions',
  },
  { keywords: ['noon.com', 'amazon.ae', 'namshi', 'sharaf dg'], categoryName: 'Shopping' },
  {
    keywords: ['emirates', 'fly dubai', 'flydubai', 'etihad', 'qatar airways'],
    categoryName: 'Travel',
  },
  { keywords: ['atm', 'cash withdrawal'], categoryName: 'Cash' },
  { keywords: ['transfer', 'fab transfer'], categoryName: 'Transfer' },
  { keywords: ['interest', 'profit'], categoryName: 'Interest Income' },
];

export async function matchCategory(description: string): Promise<CategoryMatch | null> {
  const lower = description.toLowerCase();
  const categories = await db.categories.toArray();

  // 1) Keyword rules
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      const cat = categories.find(c => c.name.toLowerCase() === rule.categoryName.toLowerCase());
      if (cat) return { categoryId: cat.id, confidence: 0.9 };
    }
  }

  // 2) Prior transaction history fallback (exact description match)
  const priorMatch = await db.transactions
    .filter(t => t.description.toLowerCase() === lower && !!t.categoryId)
    .first();
  if (priorMatch?.categoryId) {
    return { categoryId: priorMatch.categoryId, confidence: 1.0 };
  }

  return null;
}

export async function batchMatch(
  txs: { description: string }[],
): Promise<(CategoryMatch | null)[]> {
  return Promise.all(txs.map(t => matchCategory(t.description)));
}
