import { db } from './schema';
import type {
  Person,
  Account,
  Category,
  Transaction,
  RecurringRule,
  Liability,
  InsurancePolicy,
  Investment,
  Goal,
  LifeEvent,
  Scenario,
  AppSettings,
  MonthlySnapshot,
  AuditEntry,
} from './schema';

// ─── ID helper ────────────────────────────────────────────────────────────────

let _idCounter = 0;
function gid(): string {
  _idCounter++;
  return Math.random().toString(36).slice(2) + Date.now().toString(36) + _idCounter.toString(36);
}

function now(): string {
  return new Date().toISOString();
}

// ─── Real history (Feb 2024 → May 2026) ───────────────────────────────────────
// Pulled directly from Kayne's "💰 2026 Budget 💸.xlsx" — Monthly Reviews tab.
// Numbers in AED. Comments come from spreadsheet annotations.

interface RealMonth {
  month: string; // YYYY-MM
  sylSave: number;
  kayneSave: number;
  total: number;
  ccTotal: number;
  comment: string | null;
}

const REAL_HISTORY: RealMonth[] = [
  { month: '2024-02', sylSave: 14000, kayneSave: 13058, total: 27058, ccTotal: 36423, comment: null },
  { month: '2024-03', sylSave: 14000, kayneSave: 13058, total: 27058, ccTotal: 0, comment: 'Bangkok' },
  { month: '2024-04', sylSave: 29539, kayneSave: 36792, total: 66331, ccTotal: 25603, comment: null },
  { month: '2024-05', sylSave: 38039, kayneSave: 56034.12, total: 94073.12, ccTotal: 47384.44, comment: null },
  { month: '2024-06', sylSave: 52157, kayneSave: 67012.59, total: 119169.59, ccTotal: 48602.89, comment: 'UK/USA' },
  { month: '2024-07', sylSave: 62157, kayneSave: 77373.59, total: 139530.59, ccTotal: 61043, comment: 'Zambia' },
  { month: '2024-08', sylSave: 76157, kayneSave: 89581.1, total: 165738.1, ccTotal: 62278, comment: null },
  { month: '2024-09', sylSave: 84157, kayneSave: 109671.29, total: 193828.29, ccTotal: 63710.09, comment: 'Diligent Partners LLC' },
  { month: '2024-10', sylSave: 94157, kayneSave: 120841.51, total: 214998.51, ccTotal: 64701, comment: null },
  { month: '2024-11', sylSave: 94157, kayneSave: 141903.87, total: 236060.87, ccTotal: 62150, comment: 'Thai/Laos' },
  { month: '2024-12', sylSave: 98472, kayneSave: 141922.82, total: 240394.82, ccTotal: 43912, comment: null },
  { month: '2025-01', sylSave: 109822, kayneSave: 157437.82, total: 267259.82, ccTotal: 38608.99, comment: null },
  { month: '2025-02', sylSave: 121822, kayneSave: 169437.82, total: 291259.82, ccTotal: 28871, comment: null },
  { month: '2025-03', sylSave: 121822, kayneSave: 98060.2, total: 219882.2, ccTotal: 34000, comment: 'Villa move-in: T2 deposit + insurance + loan fee, apt 2-month penalty, villa deposit/broker/rent/DEWA connection/movers/AC fix, MG5 scratch, new mattress, balloons + flowers' },
  { month: '2025-04', sylSave: 123414, kayneSave: 115560.2, total: 238974.2, ccTotal: 29704, comment: 'Baby things 7,900 + 11,000; table 1,499' },
  { month: '2025-05', sylSave: 123414, kayneSave: 120560.2, total: 243974.2, ccTotal: 28922, comment: 'Dining chairs 6,500; Kyoto hotel 9,310' },
  { month: '2025-06', sylSave: 130064, kayneSave: 171057, total: 301121, ccTotal: 26436, comment: null },
  { month: '2025-07', sylSave: 137318, kayneSave: 184791.28, total: 322109.28, ccTotal: 4123, comment: null },
  { month: '2025-08', sylSave: 147318, kayneSave: 202282.39, total: 349600.39, ccTotal: 24778.59, comment: 'Sana born — baby gear, bike, nanny' },
  { month: '2025-09', sylSave: 147318, kayneSave: 200866, total: 348184, ccTotal: 0, comment: 'Sylvia visa, nanny visa, Sana visa, garden landscaping' },
  { month: '2025-10', sylSave: 147318, kayneSave: 220366, total: 367684, ccTotal: 0, comment: 'Vancouver' },
  { month: '2025-11', sylSave: 147318, kayneSave: 236671.59, total: 383989.59, ccTotal: 0, comment: null },
  { month: '2025-12', sylSave: 147318, kayneSave: 252767.04, total: 400085.04, ccTotal: 0, comment: null },
  { month: '2026-01', sylSave: 144618, kayneSave: 248780, total: 393398, ccTotal: 0, comment: null },
  { month: '2026-02', sylSave: 144618, kayneSave: 233365.95, total: 377983.95, ccTotal: 14800, comment: 'Survival stuff, car license, insurance renewal, Sylvia course' },
  { month: '2026-03', sylSave: 183618, kayneSave: 240261.95, total: 423879.95, ccTotal: 0, comment: null },
  { month: '2026-04', sylSave: 183618, kayneSave: 253125.62, total: 436743.62, ccTotal: 0, comment: null },
  { month: '2026-05', sylSave: 183618, kayneSave: 273121.29, total: 456739.29, ccTotal: 0, comment: null },
];

// ─── Seed function ────────────────────────────────────────────────────────────

export async function seedDatabase(): Promise<void> {
  db.seedingActive = true;
  try {
    await seedDatabaseInner();
  } finally {
    db.seedingActive = false;
  }
}

async function seedDatabaseInner(): Promise<void> {
  const ts = now();

  // ── People ────────────────────────────────────────────────────────────────

  const kayneId = gid();
  const sylviaId = gid();
  const sanaId = gid();

  const people: Person[] = [
    {
      id: kayneId,
      name: 'Kayne',
      role: 'primary',
      dateOfBirth: '1990-04-15',
      lifeExpectancy: 90,
      retirementAge: 60,
      statePensionAge: 60,
      statePensionWeekly: 0, // UAE has no state pension
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: sylviaId,
      name: 'Sylvia',
      role: 'secondary',
      dateOfBirth: '1992-06-01',
      lifeExpectancy: 92,
      retirementAge: 60,
      statePensionAge: 60,
      statePensionWeekly: 0,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: sanaId,
      name: 'Sana',
      role: 'child',
      dateOfBirth: '2025-08-15',
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.people.bulkAdd(people);

  // ── Categories ────────────────────────────────────────────────────────────

  const catIncomeId = gid();
  const catSalaryKayneId = gid();
  const catOtherIncomeId = gid();

  const catHousingId = gid();
  const catRentId = gid();
  const catDewaId = gid();
  const catInternetId = gid();
  const catHouseHelpId = gid();
  const catCleanerId = gid();

  const catFoodId = gid();
  const catGroceriesId = gid();
  const catRestaurantsId = gid();
  const catTakeawayId = gid();
  const catCoffeeId = gid();

  const catTransportId = gid();
  const catCarPetrolId = gid();

  const catPersonalId = gid();
  const catSubscriptionsId = gid();
  const catInsuranceId = gid();
  const catLoanId = gid();
  const catSylPersonalId = gid();

  const catTravelId = gid();
  const catTripsAbroadId = gid();
  const catUkStorageId = gid();

  const catSavingsId = gid();
  const catTransfersId = gid();

  const categories: Category[] = [
    { id: catIncomeId, name: 'Income', type: 'income', isSystem: true, sortOrder: 0, createdAt: ts, updatedAt: ts },
    { id: catSalaryKayneId, name: 'Kayne Salary', type: 'income', parentId: catIncomeId, isSystem: false, sortOrder: 1, createdAt: ts, updatedAt: ts },
    { id: catOtherIncomeId, name: 'Other Income', type: 'income', parentId: catIncomeId, isSystem: false, sortOrder: 2, createdAt: ts, updatedAt: ts },

    { id: catHousingId, name: 'Housing', type: 'expense', isSystem: false, sortOrder: 10, budgetMonthly: 18732, createdAt: ts, updatedAt: ts },
    { id: catRentId, name: 'Rent', type: 'expense', parentId: catHousingId, isSystem: false, sortOrder: 11, budgetMonthly: 12500, createdAt: ts, updatedAt: ts },
    { id: catDewaId, name: 'DEWA', type: 'expense', parentId: catHousingId, isSystem: false, sortOrder: 12, budgetMonthly: 1382, createdAt: ts, updatedAt: ts },
    { id: catInternetId, name: 'Internet & TV', type: 'expense', parentId: catHousingId, isSystem: false, sortOrder: 13, budgetMonthly: 450, createdAt: ts, updatedAt: ts },
    { id: catHouseHelpId, name: 'House Help (nanny)', type: 'expense', parentId: catHousingId, isSystem: false, sortOrder: 14, budgetMonthly: 4000, createdAt: ts, updatedAt: ts },
    { id: catCleanerId, name: 'Cleaner', type: 'expense', parentId: catHousingId, isSystem: false, sortOrder: 15, budgetMonthly: 400, createdAt: ts, updatedAt: ts },

    { id: catFoodId, name: 'Food & Drink', type: 'expense', isSystem: false, sortOrder: 20, budgetMonthly: 3900, createdAt: ts, updatedAt: ts },
    { id: catGroceriesId, name: 'Groceries', type: 'expense', parentId: catFoodId, isSystem: false, sortOrder: 21, budgetMonthly: 2500, createdAt: ts, updatedAt: ts },
    { id: catRestaurantsId, name: 'Restaurants', type: 'expense', parentId: catFoodId, isSystem: false, sortOrder: 22, budgetMonthly: 700, createdAt: ts, updatedAt: ts },
    { id: catTakeawayId, name: 'Takeaway', type: 'expense', parentId: catFoodId, isSystem: false, sortOrder: 23, budgetMonthly: 600, createdAt: ts, updatedAt: ts },
    { id: catCoffeeId, name: 'Coffee', type: 'expense', parentId: catFoodId, isSystem: false, sortOrder: 24, budgetMonthly: 100, createdAt: ts, updatedAt: ts },

    { id: catTransportId, name: 'Transport', type: 'expense', isSystem: false, sortOrder: 30, budgetMonthly: 2467, createdAt: ts, updatedAt: ts },
    { id: catCarPetrolId, name: 'Car & Petrol', type: 'expense', parentId: catTransportId, isSystem: false, sortOrder: 31, budgetMonthly: 2467, createdAt: ts, updatedAt: ts },

    { id: catPersonalId, name: 'Personal', type: 'expense', isSystem: false, sortOrder: 40, budgetMonthly: 6605, createdAt: ts, updatedAt: ts },
    { id: catSubscriptionsId, name: 'Subscriptions', type: 'expense', parentId: catPersonalId, isSystem: false, sortOrder: 41, budgetMonthly: 750, createdAt: ts, updatedAt: ts },
    { id: catInsuranceId, name: 'Insurance', type: 'expense', parentId: catPersonalId, isSystem: false, sortOrder: 42, budgetMonthly: 864, createdAt: ts, updatedAt: ts },
    { id: catLoanId, name: 'Loan Repayments', type: 'expense', parentId: catPersonalId, isSystem: false, sortOrder: 43, budgetMonthly: 2491, createdAt: ts, updatedAt: ts },
    { id: catSylPersonalId, name: 'Sylvia Personal', type: 'expense', parentId: catPersonalId, isSystem: false, sortOrder: 44, budgetMonthly: 2500, createdAt: ts, updatedAt: ts },

    { id: catTravelId, name: 'Travel', type: 'expense', isSystem: false, sortOrder: 50, budgetMonthly: 3400, createdAt: ts, updatedAt: ts },
    { id: catTripsAbroadId, name: 'Trips Abroad', type: 'expense', parentId: catTravelId, isSystem: false, sortOrder: 51, budgetMonthly: 3000, createdAt: ts, updatedAt: ts },
    { id: catUkStorageId, name: 'UK Storage', type: 'expense', parentId: catTravelId, isSystem: false, sortOrder: 52, budgetMonthly: 400, createdAt: ts, updatedAt: ts },

    { id: catSavingsId, name: 'Savings', type: 'savings', isSystem: true, sortOrder: 90, createdAt: ts, updatedAt: ts },
    { id: catTransfersId, name: 'Transfers', type: 'transfer', isSystem: true, sortOrder: 95, createdAt: ts, updatedAt: ts },
  ];

  await db.categories.bulkAdd(categories);

  // ── Accounts ──────────────────────────────────────────────────────────────

  const jointCurrentId = gid();
  const sylSavingsId = gid();
  const kayneLiquidId = gid();
  const kayneInvestId = gid();
  const ccId = gid();

  const accounts: Account[] = [
    {
      id: jointCurrentId,
      name: 'Joint Current',
      type: 'current',
      provider: 'Emirates NBD',
      balance: 8000,
      currency: 'AED',
      isActive: true,
      includeInNetWorth: true,
      sortOrder: 0,
      personId: kayneId,
      notes: 'Day-to-day cash flow',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: sylSavingsId,
      name: 'Sylvia Savings',
      type: 'savings',
      provider: 'Wio',
      balance: 183618,
      currency: 'AED',
      isActive: true,
      includeInNetWorth: true,
      interestRate: 0.045,
      sortOrder: 1,
      personId: sylviaId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: kayneLiquidId,
      name: 'Kayne Liquid Savings',
      type: 'savings',
      provider: 'Wio Savings Spaces',
      balance: 100000,
      currency: 'AED',
      isActive: true,
      includeInNetWorth: true,
      interestRate: 0.045,
      sortOrder: 2,
      personId: kayneId,
      notes: 'Emergency fund + sinking funds',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: kayneInvestId,
      name: 'Kayne Investments',
      type: 'investment',
      provider: 'Interactive Brokers',
      balance: 173121.29,
      currency: 'AED',
      isActive: true,
      includeInNetWorth: true,
      sortOrder: 3,
      personId: kayneId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: ccId,
      name: 'ENBD Visa',
      type: 'credit_card',
      provider: 'Emirates NBD',
      balance: 0,
      currency: 'AED',
      isActive: true,
      includeInNetWorth: true,
      sortOrder: 4,
      personId: kayneId,
      notes: 'Paid in full each month',
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.accounts.bulkAdd(accounts);

  // ── Liabilities ───────────────────────────────────────────────────────────

  const barclaysLoanId = gid();

  const liabilities: Liability[] = [
    {
      id: barclaysLoanId,
      name: 'Barclays Loan',
      type: 'personal_loan',
      outstandingBalance: 24240,
      originalBalance: 48480,
      interestRate: 0.07,
      monthlyPayment: 1010,
      startDate: '2024-01-01',
      endDate: '2027-12-01',
      lender: 'Barclays',
      personId: kayneId,
      includeInNetWorth: true,
      notes: '4-year unsecured personal loan',
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.liabilities.bulkAdd(liabilities);

  // ── Investments ───────────────────────────────────────────────────────────

  const vooId = gid();
  const vwrlId = gid();

  const investments: Investment[] = [
    {
      id: vooId,
      accountId: kayneInvestId,
      ticker: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      assetClass: 'us_equity',
      units: 60,
      costBasisPerUnit: 1700,
      currentPricePerUnit: 2000,
      currency: 'AED',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: vwrlId,
      accountId: kayneInvestId,
      ticker: 'VWRL',
      name: 'Vanguard FTSE All-World UCITS ETF',
      assetClass: 'global_equity',
      units: 150,
      costBasisPerUnit: 290,
      currentPricePerUnit: 350,
      currency: 'AED',
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.investments.bulkAdd(investments);

  // ── Insurance ─────────────────────────────────────────────────────────────

  const insurancePolicies: InsurancePolicy[] = [
    {
      id: gid(),
      name: 'Zurich Life Insurance',
      type: 'life',
      provider: 'Zurich',
      coverAmount: 500000,
      monthlyPremium: 864.33,
      startDate: '2023-01-01',
      isActive: true,
      personId: kayneId,
      notes: 'Level term life cover',
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.insurancePolicies.bulkAdd(insurancePolicies);

  // ── Goals ─────────────────────────────────────────────────────────────────

  const goalEmergencyId = gid();
  const goalRetirementId = gid();
  const goalHouseId = gid();
  const goalEduId = gid();

  const goals: Goal[] = [
    {
      id: goalEmergencyId,
      name: 'Emergency Fund',
      type: 'emergency_fund',
      priority: 'essential',
      targetAmount: 210000, // ~6 months of expenses (35k/mo)
      currentAmount: 100000,
      monthlyContribution: 5000,
      targetDate: '2027-06-01',
      linkedAccountId: kayneLiquidId,
      isAchieved: false,
      icon: 'Shield',
      color: '#10b981',
      personId: kayneId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: goalRetirementId,
      name: 'Retirement at 60',
      type: 'retirement',
      priority: 'essential',
      targetAmount: 20478267, // 4% safe withdrawal rate target from spreadsheet
      currentAmount: 456739,
      monthlyContribution: 19996,
      targetDate: '2050-05-01',
      linkedAccountId: kayneInvestId,
      isAchieved: false,
      icon: 'Sunset',
      color: '#f59e0b',
      personId: kayneId,
      notes: 'Based on AED 465,504/yr expenses at 4% SWR',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: goalHouseId,
      name: 'House Deposit',
      type: 'house_deposit',
      priority: 'important',
      targetAmount: 600000, // 20% of AED 3M townhouse
      currentAmount: 200000,
      monthlyContribution: 10000,
      targetDate: '2028-12-01',
      isAchieved: false,
      icon: 'Home',
      color: '#3b82f6',
      personId: kayneId,
      notes: '20% deposit on AED 3M townhouse',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: goalEduId,
      name: "Sana's Education",
      type: 'education',
      priority: 'important',
      targetAmount: 1500000, // Dubai school 9yr + university
      currentAmount: 0,
      monthlyContribution: 3000,
      targetDate: '2043-09-01',
      isAchieved: false,
      icon: 'GraduationCap',
      color: '#8b5cf6',
      personId: sanaId,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.goals.bulkAdd(goals);

  // ── Life Events ───────────────────────────────────────────────────────────

  const lifeEvents: LifeEvent[] = [
    {
      id: gid(),
      name: 'Sana starts nursery',
      type: 'child_nursery',
      date: '2027-09-01',
      personId: sanaId,
      estimatedCost: 0,
      ongoingMonthlyCostDelta: 4000,
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Sana starts school',
      type: 'child_school_private',
      date: '2030-09-01',
      personId: sanaId,
      ongoingMonthlyCostDelta: 6000,
      isActive: true,
      notes: 'Private primary school in Dubai',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Sana university',
      type: 'child_university',
      date: '2043-09-01',
      personId: sanaId,
      estimatedCost: 100000,
      ongoingMonthlyCostDelta: 10000,
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'House purchase',
      type: 'house_move',
      date: '2028-06-01',
      estimatedCost: 600000,
      ongoingMonthlyCostDelta: 5000,
      isActive: true,
      notes: 'Townhouse with mortgage replacing rent',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Kayne retires at 60',
      type: 'retirement_primary',
      date: '2050-04-15',
      personId: kayneId,
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.lifeEvents.bulkAdd(lifeEvents);

  // ── Scenarios ─────────────────────────────────────────────────────────────

  const scenarios: Scenario[] = [
    {
      id: gid(),
      name: 'Baseline',
      description: 'Current plan — no changes',
      isBaseline: true,
      color: '#3b82f6',
      overrides: {},
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Conservative',
      description: 'Lower investment returns and slower income growth',
      isBaseline: false,
      color: '#64748b',
      overrides: {
        investmentReturnOverride: 0.03,
        globalSpendingMultiplier: 1.05,
      },
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Career Break — Sabbatical',
      description: '12-month career break in 2030 — no primary income',
      isBaseline: false,
      color: '#f59e0b',
      overrides: {
        primaryIncomeShock: {
          startDate: '2030-01-01',
          durationMonths: 12,
          multiplier: 0,
        },
      },
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Aggressive Saver',
      description: 'Save AED 25k/mo instead of AED 20k baseline',
      isBaseline: false,
      color: '#10b981',
      overrides: {
        globalSpendingMultiplier: 0.85,
      },
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Market Crash 2027',
      description: 'Equities fall 35% during 2027',
      isBaseline: false,
      color: '#ef4444',
      overrides: {
        investmentReturnOverride: -0.35,
      },
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.scenarios.bulkAdd(scenarios);

  // ── Recurring Rules ───────────────────────────────────────────────────────

  const recurringRules: RecurringRule[] = [
    { id: gid(), name: 'Kayne Salary', accountId: jointCurrentId, categoryId: catSalaryKayneId, amount: 55000, type: 'income', frequency: 'monthly', startDate: '2024-09-01', description: 'Net salary — Diligent Partners', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'Rent', accountId: jointCurrentId, categoryId: catRentId, amount: 12500, type: 'expense', frequency: 'monthly', startDate: '2025-03-01', description: 'Townhouse rent', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'DEWA', accountId: jointCurrentId, categoryId: catDewaId, amount: 1382, type: 'expense', frequency: 'monthly', startDate: '2025-03-01', description: 'Dubai Electricity & Water', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'Internet & TV', accountId: jointCurrentId, categoryId: catInternetId, amount: 450, type: 'expense', frequency: 'monthly', startDate: '2025-03-01', description: 'du / etisalat', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'Groceries', accountId: jointCurrentId, categoryId: catGroceriesId, amount: 2500, type: 'expense', frequency: 'monthly', startDate: '2024-01-01', description: 'Carrefour / Spinneys', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'Takeaway', accountId: jointCurrentId, categoryId: catTakeawayId, amount: 600, type: 'expense', frequency: 'monthly', startDate: '2024-01-01', description: 'Talabat / Deliveroo', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'Restaurants', accountId: jointCurrentId, categoryId: catRestaurantsId, amount: 700, type: 'expense', frequency: 'monthly', startDate: '2024-01-01', description: 'Eating out', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'UK Storage', accountId: jointCurrentId, categoryId: catUkStorageId, amount: 400, type: 'expense', frequency: 'monthly', startDate: '2024-01-01', description: 'UK storage unit', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'Trips Abroad (sinking fund)', accountId: jointCurrentId, categoryId: catTripsAbroadId, amount: 3000, type: 'expense', frequency: 'monthly', startDate: '2024-01-01', description: 'Travel sinking fund', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'Car & Petrol', accountId: jointCurrentId, categoryId: catCarPetrolId, amount: 2467, type: 'expense', frequency: 'monthly', startDate: '2024-01-01', description: 'MG5 finance + ENOC petrol', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'Cleaner', accountId: jointCurrentId, categoryId: catCleanerId, amount: 400, type: 'expense', frequency: 'monthly', startDate: '2024-01-01', description: 'Weekly cleaner', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'House Help (nanny)', accountId: jointCurrentId, categoryId: catHouseHelpId, amount: 4000, type: 'expense', frequency: 'monthly', startDate: '2025-08-01', description: 'Live-in nanny salary + visa', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'Barclays Loan', accountId: jointCurrentId, categoryId: catLoanId, amount: 1010, type: 'expense', frequency: 'monthly', startDate: '2024-01-01', endDate: '2027-12-01', description: 'Barclays personal loan', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'Spotify', accountId: jointCurrentId, categoryId: catSubscriptionsId, amount: 40, type: 'expense', frequency: 'monthly', startDate: '2024-01-01', description: 'Spotify Family', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'Sylvia Personal', accountId: jointCurrentId, categoryId: catSylPersonalId, amount: 2500, type: 'expense', frequency: 'monthly', startDate: '2024-01-01', description: 'Sylvia monthly allowance', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'CISI', accountId: jointCurrentId, categoryId: catSubscriptionsId, amount: 110, type: 'expense', frequency: 'monthly', startDate: '2024-01-01', description: 'CISI membership', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'Claude', accountId: jointCurrentId, categoryId: catSubscriptionsId, amount: 500, type: 'expense', frequency: 'monthly', startDate: '2024-06-01', description: 'Claude Pro / Max', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'Zurich Life Insurance', accountId: jointCurrentId, categoryId: catInsuranceId, amount: 864.33, type: 'expense', frequency: 'monthly', startDate: '2023-01-01', description: 'Zurich life cover', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'ChatGPT', accountId: jointCurrentId, categoryId: catSubscriptionsId, amount: 100, type: 'expense', frequency: 'monthly', startDate: '2024-01-01', description: 'ChatGPT Plus', isActive: true, createdAt: ts, updatedAt: ts },
    { id: gid(), name: 'tabby', accountId: jointCurrentId, categoryId: catLoanId, amount: 1481, type: 'expense', frequency: 'monthly', startDate: '2025-03-01', description: 'tabby BNPL repayments', isActive: true, createdAt: ts, updatedAt: ts },
  ];

  await db.recurringRules.bulkAdd(recurringRules);

  // ── Transactions (last 4 months: Feb 2026 → May 2026) ────────────────────
  // Generates ~25 realistic transactions per month from the budget categories
  // so the cash-flow charts have something to render.

  const txs: Transaction[] = [];
  const txMonths = ['2026-02', '2026-03', '2026-04', '2026-05'];
  const yyyymmTo = (ym: string, day: number) => `${ym}-${String(day).padStart(2, '0')}`;

  function pushTx(t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'isReviewed'> & { isReviewed?: boolean }) {
    txs.push({
      id: gid(),
      isReviewed: t.isReviewed ?? true,
      createdAt: ts,
      updatedAt: ts,
      ...t,
    });
  }

  const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

  for (const ym of txMonths) {
    // Income
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 28), description: 'WPS SALARY DILIGENT PARTNERS', amount: 55000, type: 'income', categoryId: catSalaryKayneId });

    // Housing
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 1), description: 'RENT — TOWNHOUSE', amount: 12500, type: 'expense', categoryId: catRentId });
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 5), description: 'DEWA ELECTRICITY & WATER', amount: rand(1200, 1600), type: 'expense', categoryId: catDewaId });
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 8), description: 'DU INTERNET & TV', amount: 450, type: 'expense', categoryId: catInternetId });
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 1), description: 'NANNY SALARY', amount: 4000, type: 'expense', categoryId: catHouseHelpId });
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 6), description: 'WEEKLY CLEANER', amount: 400, type: 'expense', categoryId: catCleanerId });

    // Groceries weekly
    for (let w = 0; w < 4; w++) {
      pushTx({
        accountId: jointCurrentId,
        date: yyyymmTo(ym, 4 + w * 7),
        description: w % 3 === 0 ? 'CARREFOUR DUBAI HILLS' : w % 3 === 1 ? 'SPINNEYS' : 'WAITROSE DIFC',
        amount: rand(450, 750),
        type: 'expense',
        categoryId: catGroceriesId,
      });
    }

    // Takeaway 3x
    for (let i = 0; i < 3; i++) {
      pushTx({
        accountId: jointCurrentId,
        date: yyyymmTo(ym, 6 + i * 8),
        description: i % 2 === 0 ? 'TALABAT' : 'DELIVEROO',
        amount: rand(120, 240),
        type: 'expense',
        categoryId: catTakeawayId,
      });
    }

    // Restaurants 2x
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 12), description: 'NOBU PALM', amount: rand(280, 480), type: 'expense', categoryId: catRestaurantsId });
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 22), description: 'AVLI BY TASHAS', amount: rand(220, 360), type: 'expense', categoryId: catRestaurantsId });

    // Coffee
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 10), description: 'CIRCLE CAFE', amount: rand(60, 130), type: 'expense', categoryId: catCoffeeId });

    // Transport
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 1), description: 'MG5 CAR FINANCE', amount: 1700, type: 'expense', categoryId: catCarPetrolId });
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 9), description: 'ENOC PETROL', amount: rand(280, 420), type: 'expense', categoryId: catCarPetrolId });
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 23), description: 'ENOC PETROL', amount: rand(220, 380), type: 'expense', categoryId: catCarPetrolId });

    // Subscriptions
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 14), description: 'SPOTIFY', amount: 40, type: 'expense', categoryId: catSubscriptionsId });
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 15), description: 'CHATGPT PLUS', amount: 100, type: 'expense', categoryId: catSubscriptionsId });
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 16), description: 'CLAUDE MAX', amount: 500, type: 'expense', categoryId: catSubscriptionsId });
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 17), description: 'CISI MEMBERSHIP', amount: 110, type: 'expense', categoryId: catSubscriptionsId });

    // Insurance & loans
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 18), description: 'ZURICH LIFE INSURANCE', amount: 864.33, type: 'expense', categoryId: catInsuranceId });
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 1), description: 'BARCLAYS LOAN', amount: 1010, type: 'expense', categoryId: catLoanId });
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 1), description: 'TABBY REPAYMENT', amount: 1481, type: 'expense', categoryId: catLoanId });

    // Sylvia personal
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 2), description: 'SYLVIA ALLOWANCE', amount: 2500, type: 'transfer', categoryId: catSylPersonalId, transferToAccountId: sylSavingsId });

    // Travel
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 25), description: 'UK STORAGE UNIT', amount: 400, type: 'expense', categoryId: catUkStorageId });

    // Savings transfers
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 29), description: 'TRANSFER TO WIO SAVINGS', amount: 5000, type: 'transfer', categoryId: catSavingsId, transferToAccountId: kayneLiquidId });
    pushTx({ accountId: jointCurrentId, date: yyyymmTo(ym, 29), description: 'INVESTMENT CONTRIBUTION', amount: 8000, type: 'investment', categoryId: catSavingsId, transferToAccountId: kayneInvestId });
  }

  await db.transactions.bulkAdd(txs);

  // ── App Settings ──────────────────────────────────────────────────────────

  const settings: AppSettings = {
    id: 'singleton',
    currency: 'AED',
    locale: 'en-AE',
    theme: 'system',
    density: 'comfortable',
    householdName: 'Osbourne Household',
    onboardingComplete: true,
    primaryIncome: 55000,
    secondaryIncome: 0,
    primaryPersonId: kayneId,
    secondaryPersonId: sylviaId,
    projection: {
      lifeExpectancyPrimary: 90,
      retirementAgePrimary: 60,
      retirementAgeSecondary: 60,
      statePensionAgePrimary: 60,
      statePensionAgeSecondary: 60,
      statePensionWeeklyPrimary: 0,
      statePensionWeeklySecondary: 0,
      inflationRate: 0.025,
      investmentReturnNominalAnnual: 0.075,
      investmentReturnRealAnnual: 0.05,
      pensionContributionRate: 0.10, // UAE has no auto-enrol — manual contribution
      employerMatchRate: 0,
      pensionGrowthRate: 0.07,
      effectiveTaxRate: 0.0, // UAE: no income tax
      safeWithdrawalRate: 0.04,
      propertyGrowthRate: 0.04,
      stateRetirementIncome: 0, // UAE: no state pension
    },
  };

  await db.settings.add(settings);

  // ── Monthly Snapshots — backfill from REAL spreadsheet history ────────────

  const monthlySnapshots: MonthlySnapshot[] = [];
  const auditEntries: AuditEntry[] = [];
  const monthlyIncome = 55000;
  const monthlyExpensesEstimate = 35004;

  for (let i = 0; i < REAL_HISTORY.length; i++) {
    const m = REAL_HISTORY[i];
    const prev = i > 0 ? REAL_HISTORY[i - 1] : null;
    const savingsAmount = prev ? m.total - prev.total : 0;
    const totalExpenses = Math.max(0, monthlyIncome - savingsAmount);
    const savingsRate = monthlyIncome > 0 ? Math.max(-1, Math.min(1, savingsAmount / monthlyIncome)) : 0;

    const snapId = gid();
    monthlySnapshots.push({
      id: snapId,
      yearMonth: m.month,
      netWorth: Math.round(m.total - m.ccTotal),
      liquidSavings: Math.round(m.total * 0.4),
      investments: Math.round(m.total * 0.6),
      pension: 0,
      totalLiabilities: Math.round(m.ccTotal),
      totalAssets: Math.round(m.total),
      totalIncome: monthlyIncome,
      totalExpenses: i === 0 ? monthlyExpensesEstimate : Math.round(totalExpenses),
      savingsRate,
      createdAt: ts,
    });

    if (m.comment) {
      auditEntries.push({
        id: gid(),
        table: 'monthlySnapshots',
        recordId: snapId,
        action: 'create',
        after: { yearMonth: m.month, note: m.comment },
        timestamp: new Date(`${m.month}-15T12:00:00.000Z`).toISOString(),
      });
    }
  }

  await db.monthlySnapshots.bulkAdd(monthlySnapshots);
  if (auditEntries.length > 0) {
    await db.auditLog.bulkAdd(auditEntries);
  }
}

// ─── Check and seed ───────────────────────────────────────────────────────────

export async function checkAndSeed(): Promise<void> {
  const existing = await db.settings.get('singleton');
  if (!existing) {
    await seedDatabase();
  }
}
