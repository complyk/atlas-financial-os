import { db } from './schema';
import type {
  Person,
  Account,
  Category,
  Transaction,
  RecurringRule,
  Asset,
  Liability,
  InsurancePolicy,
  Investment,
  Goal,
  LifeEvent,
  Scenario,
  AppSettings,
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

// ─── Date helpers ─────────────────────────────────────────────────────────────

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function subtractMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function dateInMonth(monthsAgo: number, day: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(day);
  return d.toISOString().slice(0, 10);
}

// ─── Seed function ────────────────────────────────────────────────────────────

export async function seedDatabase(): Promise<void> {
  const ts = now();

  // ── People ────────────────────────────────────────────────────────────────

  const jamesId = gid();
  const sarahId = gid();
  const lilyId = gid();

  const people: Person[] = [
    {
      id: jamesId,
      name: 'James',
      role: 'primary',
      dateOfBirth: '1990-03-15',
      lifeExpectancy: 90,
      retirementAge: 65,
      statePensionAge: 67,
      statePensionWeekly: 221.20,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: sarahId,
      name: 'Sarah',
      role: 'secondary',
      dateOfBirth: '1992-07-22',
      lifeExpectancy: 92,
      retirementAge: 65,
      statePensionAge: 67,
      statePensionWeekly: 221.20,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: lilyId,
      name: 'Lily',
      role: 'child',
      dateOfBirth: '2024-07-01',
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.people.bulkAdd(people);

  // ── Categories ────────────────────────────────────────────────────────────

  const catHousingId = gid();
  const catRentId = gid();
  const catUtilitiesId = gid();
  const catHomeInsuranceId = gid();
  const catFoodId = gid();
  const catGroceriesId = gid();
  const catEatingOutId = gid();
  const catTransportId = gid();
  const catFuelId = gid();
  const catPublicTransportId = gid();
  const catIncomeId = gid();
  const catSalaryPrimaryId = gid();
  const catSalarySecondaryId = gid();
  const catBenefitsId = gid();
  const catEntertainmentId = gid();
  const catSubscriptionsId = gid();
  const catHealthId = gid();
  const catShoppingId = gid();
  const catChildrenId = gid();
  const catSavingsId = gid();
  const catTransfersId = gid();
  const catPetsId = gid();
  const catHolidaysId = gid();
  const catPersonalCareId = gid();

  const categories: Category[] = [
    // Income top-level
    { id: catIncomeId, name: 'Income', type: 'income', isSystem: true, sortOrder: 0, createdAt: ts, updatedAt: ts },
    { id: catSalaryPrimaryId, name: 'Salary (James)', type: 'income', parentId: catIncomeId, isSystem: false, sortOrder: 1, createdAt: ts, updatedAt: ts },
    { id: catSalarySecondaryId, name: 'Salary (Sarah)', type: 'income', parentId: catIncomeId, isSystem: false, sortOrder: 2, createdAt: ts, updatedAt: ts },
    { id: catBenefitsId, name: 'Child Benefit', type: 'income', parentId: catIncomeId, isSystem: false, sortOrder: 3, createdAt: ts, updatedAt: ts },

    // Housing
    { id: catHousingId, name: 'Housing', type: 'expense', isSystem: false, sortOrder: 10, budgetMonthly: 1200, createdAt: ts, updatedAt: ts },
    { id: catRentId, name: 'Mortgage / Rent', type: 'expense', parentId: catHousingId, isSystem: false, sortOrder: 11, budgetMonthly: 1100, createdAt: ts, updatedAt: ts },
    { id: catUtilitiesId, name: 'Utilities', type: 'expense', parentId: catHousingId, isSystem: false, sortOrder: 12, budgetMonthly: 180, createdAt: ts, updatedAt: ts },
    { id: catHomeInsuranceId, name: 'Home Insurance', type: 'expense', parentId: catHousingId, isSystem: false, sortOrder: 13, budgetMonthly: 45, createdAt: ts, updatedAt: ts },

    // Food
    { id: catFoodId, name: 'Food & Drink', type: 'expense', isSystem: false, sortOrder: 20, budgetMonthly: 700, createdAt: ts, updatedAt: ts },
    { id: catGroceriesId, name: 'Groceries', type: 'expense', parentId: catFoodId, isSystem: false, sortOrder: 21, budgetMonthly: 550, createdAt: ts, updatedAt: ts },
    { id: catEatingOutId, name: 'Eating Out', type: 'expense', parentId: catFoodId, isSystem: false, sortOrder: 22, budgetMonthly: 150, createdAt: ts, updatedAt: ts },

    // Transport
    { id: catTransportId, name: 'Transport', type: 'expense', isSystem: false, sortOrder: 30, budgetMonthly: 350, createdAt: ts, updatedAt: ts },
    { id: catFuelId, name: 'Fuel', type: 'expense', parentId: catTransportId, isSystem: false, sortOrder: 31, budgetMonthly: 120, createdAt: ts, updatedAt: ts },
    { id: catPublicTransportId, name: 'Public Transport', type: 'expense', parentId: catTransportId, isSystem: false, sortOrder: 32, budgetMonthly: 80, createdAt: ts, updatedAt: ts },

    // Entertainment
    { id: catEntertainmentId, name: 'Entertainment', type: 'expense', isSystem: false, sortOrder: 40, budgetMonthly: 120, createdAt: ts, updatedAt: ts },
    { id: catSubscriptionsId, name: 'Subscriptions', type: 'expense', parentId: catEntertainmentId, isSystem: false, sortOrder: 41, budgetMonthly: 45, createdAt: ts, updatedAt: ts },

    // Health
    { id: catHealthId, name: 'Health', type: 'expense', isSystem: false, sortOrder: 50, budgetMonthly: 60, createdAt: ts, updatedAt: ts },

    // Shopping
    { id: catShoppingId, name: 'Shopping', type: 'expense', isSystem: false, sortOrder: 60, budgetMonthly: 200, createdAt: ts, updatedAt: ts },

    // Children
    { id: catChildrenId, name: 'Children', type: 'expense', isSystem: false, sortOrder: 65, budgetMonthly: 300, createdAt: ts, updatedAt: ts },

    // Personal Care
    { id: catPersonalCareId, name: 'Personal Care', type: 'expense', isSystem: false, sortOrder: 70, budgetMonthly: 80, createdAt: ts, updatedAt: ts },

    // Pets
    { id: catPetsId, name: 'Pets', type: 'expense', isSystem: false, sortOrder: 75, budgetMonthly: 60, createdAt: ts, updatedAt: ts },

    // Holidays
    { id: catHolidaysId, name: 'Holidays', type: 'expense', isSystem: false, sortOrder: 80, budgetMonthly: 150, createdAt: ts, updatedAt: ts },

    // Savings/Transfers
    { id: catSavingsId, name: 'Savings', type: 'savings', isSystem: true, sortOrder: 90, createdAt: ts, updatedAt: ts },
    { id: catTransfersId, name: 'Transfers', type: 'transfer', isSystem: true, sortOrder: 95, createdAt: ts, updatedAt: ts },
  ];

  await db.categories.bulkAdd(categories);

  // ── Accounts ──────────────────────────────────────────────────────────────

  const barclaysId = gid();
  const monzoId = gid();
  const marcusId = gid();
  const vanguardIsaId = gid();
  const nutmegSippId = gid();

  const accounts: Account[] = [
    {
      id: barclaysId,
      name: 'Barclays Current',
      type: 'current',
      provider: 'Barclays',
      balance: 3420,
      currency: 'GBP',
      isActive: true,
      includeInNetWorth: true,
      sortOrder: 0,
      personId: jamesId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: monzoId,
      name: 'Monzo Current',
      type: 'current',
      provider: 'Monzo',
      balance: 1840,
      currency: 'GBP',
      isActive: true,
      includeInNetWorth: true,
      sortOrder: 1,
      personId: sarahId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: marcusId,
      name: 'Marcus Savings',
      type: 'savings',
      provider: 'Marcus by Goldman Sachs',
      balance: 18500,
      currency: 'GBP',
      isActive: true,
      includeInNetWorth: true,
      interestRate: 0.049,
      sortOrder: 2,
      personId: jamesId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: vanguardIsaId,
      name: 'Vanguard Stocks ISA',
      type: 'isa_stocks',
      provider: 'Vanguard',
      balance: 42300,
      currency: 'GBP',
      isActive: true,
      includeInNetWorth: true,
      sortOrder: 3,
      personId: jamesId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: nutmegSippId,
      name: 'Nutmeg SIPP',
      type: 'pension_dc',
      provider: 'Nutmeg',
      balance: 67200,
      currency: 'GBP',
      isActive: true,
      includeInNetWorth: true,
      sortOrder: 4,
      personId: jamesId,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.accounts.bulkAdd(accounts);

  // ── Liabilities ───────────────────────────────────────────────────────────

  const mortgageId = gid();

  const liabilities: Liability[] = [
    {
      id: mortgageId,
      name: 'Halifax Mortgage',
      type: 'mortgage',
      outstandingBalance: 187400,
      originalBalance: 280000,
      interestRate: 0.021,
      monthlyPayment: 1100,
      startDate: '2019-06-01',
      endDate: '2049-01-01',
      lender: 'Halifax',
      notes: 'Fixed-rate mortgage, remortgage due 2026',
      personId: jamesId,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.liabilities.bulkAdd(liabilities);

  // ── Assets ─────────────────────────────────────────────────────────────────

  const homeId = gid();

  const assets: Asset[] = [
    {
      id: homeId,
      name: 'Family Home',
      type: 'property',
      currentValue: 485000,
      purchaseValue: 395000,
      purchaseDate: '2019-06-01',
      currency: 'GBP',
      address: '12 Maple Close, Bristol, BS1 4RR',
      includeInNetWorth: true,
      personId: jamesId,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.assets.bulkAdd(assets);

  // ── Investments ───────────────────────────────────────────────────────────

  const vwrlId = gid();
  const vukeId = gid();
  const ls80Id = gid();

  const investments: Investment[] = [
    {
      id: vwrlId,
      accountId: vanguardIsaId,
      ticker: 'VWRL',
      name: 'Vanguard FTSE All-World ETF',
      assetClass: 'global_equity',
      units: 180,
      costBasisPerUnit: 58,
      currentPricePerUnit: 71,
      currency: 'GBP',
      isin: 'IE00B3RBWM25',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: vukeId,
      accountId: vanguardIsaId,
      ticker: 'VUKE',
      name: 'Vanguard FTSE 100 ETF',
      assetClass: 'uk_equity',
      units: 90,
      costBasisPerUnit: 32,
      currentPricePerUnit: 37,
      currency: 'GBP',
      isin: 'IE00B810Q511',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: ls80Id,
      accountId: nutmegSippId,
      name: 'Vanguard LifeStrategy 80% Equity',
      assetClass: 'global_equity',
      units: 250,
      costBasisPerUnit: 240,
      currentPricePerUnit: 268,
      currency: 'GBP',
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.investments.bulkAdd(investments);

  // ── Insurance Policies ────────────────────────────────────────────────────

  const jamesLifeId = gid();
  const sarahCiId = gid();

  const insurancePolicies: InsurancePolicy[] = [
    {
      id: jamesLifeId,
      name: "James's Life Insurance",
      type: 'life',
      provider: 'Legal & General',
      coverAmount: 500000,
      monthlyPremium: 45,
      startDate: '2019-06-01',
      renewalDate: '2049-06-01',
      isActive: true,
      personId: jamesId,
      notes: 'Level term, 30-year policy to cover mortgage',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: sarahCiId,
      name: "Sarah's Critical Illness Cover",
      type: 'critical_illness',
      provider: 'Aviva',
      coverAmount: 200000,
      monthlyPremium: 32,
      startDate: '2021-03-01',
      renewalDate: '2041-03-01',
      isActive: true,
      personId: sarahId,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.insurancePolicies.bulkAdd(insurancePolicies);

  // ── Goals ─────────────────────────────────────────────────────────────────

  const goalEfId = gid();
  const goalRetId = gid();
  const goalEduId = gid();
  const goalHolId = gid();

  const goals: Goal[] = [
    {
      id: goalEfId,
      name: 'Emergency Fund',
      type: 'emergency_fund',
      priority: 'essential',
      targetAmount: 25000,
      currentAmount: 18500,
      monthlyContribution: 500,
      targetDate: '2026-06-01',
      linkedAccountId: marcusId,
      isAchieved: false,
      icon: 'Shield',
      color: '#10b981',
      personId: jamesId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: goalRetId,
      name: 'Retirement',
      type: 'retirement',
      priority: 'essential',
      targetAmount: 800000,
      currentAmount: 67200,
      monthlyContribution: 800,
      targetDate: '2055-03-15',
      linkedAccountId: nutmegSippId,
      isAchieved: false,
      icon: 'Sunset',
      color: '#f59e0b',
      personId: jamesId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: goalEduId,
      name: "Lily's Education Fund",
      type: 'education',
      priority: 'important',
      targetAmount: 60000,
      currentAmount: 0,
      monthlyContribution: 200,
      targetDate: '2042-09-01',
      isAchieved: false,
      icon: 'GraduationCap',
      color: '#8b5cf6',
      personId: lilyId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: goalHolId,
      name: 'Summer Holiday 2026',
      type: 'holiday',
      priority: 'nice_to_have',
      targetAmount: 6000,
      currentAmount: 1200,
      monthlyContribution: 400,
      targetDate: '2026-08-01',
      isAchieved: false,
      icon: 'Plane',
      color: '#06b6d4',
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.goals.bulkAdd(goals);

  // ── Life Events ───────────────────────────────────────────────────────────

  const lifeEvents: LifeEvent[] = [
    {
      id: gid(),
      name: 'Lily starts primary school',
      type: 'child_school_state',
      date: '2030-09-01',
      personId: lilyId,
      estimatedCost: 500,
      ongoingMonthlyCostDelta: -200, // nursery costs end
      notes: 'State primary school — free, but uniform, after-school clubs etc.',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Halifax mortgage ends',
      type: 'mortgage_end',
      date: '2049-01-01',
      personId: jamesId,
      ongoingMonthlyCostDelta: -1100, // mortgage payment freed up
      notes: 'Final mortgage payment — £1,100/month freed up',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'James retires',
      type: 'retirement_primary',
      date: '2055-03-15',
      personId: jamesId,
      notes: 'Target retirement at 65',
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
      name: 'Early Retirement at 60',
      description: 'James retires 5 years early',
      isBaseline: false,
      color: '#10b981',
      overrides: { retirementAgeOverride: 60 },
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Job Loss — 6 months',
      description: 'James loses primary income for 6 months',
      isBaseline: false,
      color: '#ef4444',
      overrides: {
        primaryIncomeShock: {
          startDate: new Date().toISOString().slice(0, 10),
          durationMonths: 6,
          multiplier: 0,
        },
      },
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Market Crash 30%',
      description: 'Investment portfolios fall 30%',
      isBaseline: false,
      color: '#f59e0b',
      overrides: { investmentReturnOverride: -0.30 },
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'High Inflation (6%)',
      description: 'Persistent higher inflation scenario',
      isBaseline: false,
      color: '#8b5cf6',
      overrides: { inflationOverride: 0.06, globalSpendingMultiplier: 1.20 },
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Optimistic Growth',
      description: 'Strong investment returns, income grows',
      isBaseline: false,
      color: '#06b6d4',
      overrides: { investmentReturnOverride: 0.10 },
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.scenarios.bulkAdd(scenarios);

  // ── Recurring Rules ───────────────────────────────────────────────────────

  const recurringRules: RecurringRule[] = [
    {
      id: gid(),
      name: 'Halifax Mortgage',
      accountId: barclaysId,
      categoryId: catRentId,
      amount: -1100,
      type: 'expense',
      frequency: 'monthly',
      startDate: '2019-06-01',
      endDate: '2049-01-01',
      description: 'Halifax mortgage payment',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'British Gas — Gas & Electric',
      accountId: barclaysId,
      categoryId: catUtilitiesId,
      amount: -130,
      type: 'expense',
      frequency: 'monthly',
      startDate: '2022-01-01',
      description: 'British Gas dual fuel DD',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Water Bill',
      accountId: barclaysId,
      categoryId: catUtilitiesId,
      amount: -38,
      type: 'expense',
      frequency: 'monthly',
      startDate: '2022-01-01',
      description: 'Bristol Water',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Council Tax',
      accountId: barclaysId,
      categoryId: catUtilitiesId,
      amount: -185,
      type: 'expense',
      frequency: 'monthly',
      startDate: '2022-04-01',
      description: 'Bristol City Council — Band D',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Netflix',
      accountId: monzoId,
      categoryId: catSubscriptionsId,
      amount: -17.99,
      type: 'expense',
      frequency: 'monthly',
      startDate: '2021-01-01',
      description: 'Netflix Standard with Ads',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Spotify Family',
      accountId: monzoId,
      categoryId: catSubscriptionsId,
      amount: -17.99,
      type: 'expense',
      frequency: 'monthly',
      startDate: '2020-01-01',
      description: 'Spotify Family Plan',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Amazon Prime',
      accountId: monzoId,
      categoryId: catSubscriptionsId,
      amount: -8.99,
      type: 'expense',
      frequency: 'monthly',
      startDate: '2019-01-01',
      description: 'Amazon Prime monthly',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'James Salary',
      accountId: barclaysId,
      categoryId: catSalaryPrimaryId,
      amount: 4583,
      type: 'income',
      frequency: 'monthly',
      startDate: '2020-01-01',
      description: 'Net salary — James (£55k gross)',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Sarah Salary',
      accountId: monzoId,
      categoryId: catSalarySecondaryId,
      amount: 2917,
      type: 'income',
      frequency: 'monthly',
      startDate: '2020-01-01',
      description: 'Net salary — Sarah (£35k gross)',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.recurringRules.bulkAdd(recurringRules);

  // ── Transactions (18 months) ──────────────────────────────────────────────

  const transactions: Transaction[] = [];

  for (let m = 0; m < 18; m++) {
    // Month 0 = 17 months ago, month 17 = current month

    // Salary — James
    transactions.push({
      id: gid(),
      accountId: barclaysId,
      date: dateInMonth(17 - m, 28),
      description: 'BACS CREDIT EMPLOYER LTD',
      amount: 4583,
      type: 'income',
      categoryId: catSalaryPrimaryId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Salary — Sarah
    transactions.push({
      id: gid(),
      accountId: monzoId,
      date: dateInMonth(17 - m, 28),
      description: 'FASTER PAYMENT NHS TRUST',
      amount: 2917,
      type: 'income',
      categoryId: catSalarySecondaryId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Child Benefit (£25.60/week x 4 = ~£102/month for first child)
    transactions.push({
      id: gid(),
      accountId: monzoId,
      date: dateInMonth(17 - m, 7),
      description: 'HMRC CHILD BENEFIT',
      amount: 102.40,
      type: 'income',
      categoryId: catBenefitsId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Mortgage
    transactions.push({
      id: gid(),
      accountId: barclaysId,
      date: dateInMonth(17 - m, 1),
      description: 'HALIFAX MORTGAGE DD',
      amount: -1100,
      type: 'expense',
      categoryId: catRentId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Gas & Electric
    transactions.push({
      id: gid(),
      accountId: barclaysId,
      date: dateInMonth(17 - m, 5),
      description: 'BRITISH GAS DD',
      amount: -(110 + Math.round(Math.random() * 40)),
      type: 'expense',
      categoryId: catUtilitiesId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Water
    transactions.push({
      id: gid(),
      accountId: barclaysId,
      date: dateInMonth(17 - m, 6),
      description: 'BRISTOL WATER DD',
      amount: -38,
      type: 'expense',
      categoryId: catUtilitiesId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Council Tax
    transactions.push({
      id: gid(),
      accountId: barclaysId,
      date: dateInMonth(17 - m, 3),
      description: 'BRISTOL COUNCIL TAX DD',
      amount: -185,
      type: 'expense',
      categoryId: catUtilitiesId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Broadband
    transactions.push({
      id: gid(),
      accountId: barclaysId,
      date: dateInMonth(17 - m, 10),
      description: 'BT BROADBAND DD',
      amount: -42,
      type: 'expense',
      categoryId: catUtilitiesId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Home insurance
    transactions.push({
      id: gid(),
      accountId: barclaysId,
      date: dateInMonth(17 - m, 15),
      description: 'ADMIRAL HOME INS DD',
      amount: -44,
      type: 'expense',
      categoryId: catHomeInsuranceId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Life insurance
    transactions.push({
      id: gid(),
      accountId: barclaysId,
      date: dateInMonth(17 - m, 16),
      description: 'L&G LIFE INSURANCE DD',
      amount: -45,
      type: 'expense',
      categoryId: catHealthId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Critical illness
    transactions.push({
      id: gid(),
      accountId: monzoId,
      date: dateInMonth(17 - m, 16),
      description: 'AVIVA CRITICAL ILLNESS DD',
      amount: -32,
      type: 'expense',
      categoryId: catHealthId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Groceries — weekly x4
    for (let w = 0; w < 4; w++) {
      const groceryAmount = -(100 + Math.round(Math.random() * 60));
      transactions.push({
        id: gid(),
        accountId: w % 2 === 0 ? barclaysId : monzoId,
        date: dateInMonth(17 - m, 4 + w * 7),
        description: w % 3 === 0 ? 'TESCO STORES' : w % 3 === 1 ? 'SAINSBURYS' : 'WAITROSE',
        amount: groceryAmount,
        type: 'expense',
        categoryId: catGroceriesId,
        isReviewed: true,
        createdAt: ts,
        updatedAt: ts,
      });
    }

    // Eating out 2-3 times per month
    const eatOutCount = 2 + (m % 2);
    for (let e = 0; e < eatOutCount; e++) {
      transactions.push({
        id: gid(),
        accountId: monzoId,
        date: dateInMonth(17 - m, 8 + e * 5),
        description: e % 3 === 0 ? 'WAGAMAMA' : e % 3 === 1 ? 'NANDOS' : 'LOCAL RESTAURANT',
        amount: -(25 + Math.round(Math.random() * 35)),
        type: 'expense',
        categoryId: catEatingOutId,
        isReviewed: m < 3,
        createdAt: ts,
        updatedAt: ts,
      });
    }

    // Fuel
    transactions.push({
      id: gid(),
      accountId: barclaysId,
      date: dateInMonth(17 - m, 9),
      description: 'BP PETROL',
      amount: -(60 + Math.round(Math.random() * 30)),
      type: 'expense',
      categoryId: catFuelId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Public transport
    if (m % 2 === 0) {
      transactions.push({
        id: gid(),
        accountId: monzoId,
        date: dateInMonth(17 - m, 14),
        description: 'FIRST BUS / TRAIN',
        amount: -(35 + Math.round(Math.random() * 25)),
        type: 'expense',
        categoryId: catPublicTransportId,
        isReviewed: true,
        createdAt: ts,
        updatedAt: ts,
      });
    }

    // Netflix
    transactions.push({
      id: gid(),
      accountId: monzoId,
      date: dateInMonth(17 - m, 20),
      description: 'NETFLIX.COM',
      amount: -17.99,
      type: 'expense',
      categoryId: catSubscriptionsId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Spotify
    transactions.push({
      id: gid(),
      accountId: monzoId,
      date: dateInMonth(17 - m, 21),
      description: 'SPOTIFY AB',
      amount: -17.99,
      type: 'expense',
      categoryId: catSubscriptionsId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Amazon Prime
    transactions.push({
      id: gid(),
      accountId: monzoId,
      date: dateInMonth(17 - m, 22),
      description: 'AMAZON PRIME',
      amount: -8.99,
      type: 'expense',
      categoryId: catSubscriptionsId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Shopping (clothing, household)
    if (m % 3 === 0 || Math.random() > 0.4) {
      transactions.push({
        id: gid(),
        accountId: m % 2 === 0 ? barclaysId : monzoId,
        date: dateInMonth(17 - m, 13),
        description: m % 4 === 0 ? 'JOHN LEWIS' : m % 4 === 1 ? 'NEXT' : m % 4 === 2 ? 'M&S' : 'AMAZON.CO.UK',
        amount: -(40 + Math.round(Math.random() * 100)),
        type: 'expense',
        categoryId: catShoppingId,
        isReviewed: m < 6,
        createdAt: ts,
        updatedAt: ts,
      });
    }

    // Children — nursery (post-2024)
    transactions.push({
      id: gid(),
      accountId: barclaysId,
      date: dateInMonth(17 - m, 2),
      description: 'LITTLE STARS NURSERY',
      amount: -950,
      type: 'expense',
      categoryId: catChildrenId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Health (pharmacy, dentist occasionally)
    if (m % 4 === 0) {
      transactions.push({
        id: gid(),
        accountId: monzoId,
        date: dateInMonth(17 - m, 18),
        description: m % 8 === 0 ? 'BOOTS PHARMACY' : 'BRISTOL DENTAL PRACTICE',
        amount: -(15 + Math.round(Math.random() * 60)),
        type: 'expense',
        categoryId: catHealthId,
        isReviewed: true,
        createdAt: ts,
        updatedAt: ts,
      });
    }

    // Personal care
    transactions.push({
      id: gid(),
      accountId: monzoId,
      date: dateInMonth(17 - m, 17),
      description: m % 2 === 0 ? 'SUPERCUTS HAIR' : 'HAIR SALON',
      amount: -(25 + Math.round(Math.random() * 30)),
      type: 'expense',
      categoryId: catPersonalCareId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Savings transfer to Marcus
    transactions.push({
      id: gid(),
      accountId: barclaysId,
      date: dateInMonth(17 - m, 29),
      description: 'TRANSFER TO MARCUS SAVINGS',
      amount: -500,
      type: 'transfer',
      categoryId: catSavingsId,
      transferToAccountId: marcusId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // ISA contribution (monthly)
    transactions.push({
      id: gid(),
      accountId: barclaysId,
      date: dateInMonth(17 - m, 29),
      description: 'VANGUARD ISA CONTRIBUTION',
      amount: -600,
      type: 'investment',
      categoryId: catSavingsId,
      transferToAccountId: vanguardIsaId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // SIPP / pension (employer + employee via payroll — recorded as ISA contributions for demo)
    // Pension is handled via payroll deduction so net salary already reduced

    // Holiday savings (some months)
    if (m >= 6 && m <= 12) {
      transactions.push({
        id: gid(),
        accountId: barclaysId,
        date: dateInMonth(17 - m, 29),
        description: 'HOLIDAY FUND TRANSFER',
        amount: -400,
        type: 'transfer',
        categoryId: catHolidaysId,
        isReviewed: true,
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }

  // Add some one-off transactions
  // Holiday booking
  transactions.push({
    id: gid(),
    accountId: barclaysId,
    date: subtractMonths(14),
    description: 'EASYJET FLIGHTS',
    amount: -620,
    type: 'expense',
    categoryId: catHolidaysId,
    isReviewed: true,
    notes: 'Portugal flights summer 2025',
    createdAt: ts,
    updatedAt: ts,
  });

  transactions.push({
    id: gid(),
    accountId: barclaysId,
    date: subtractMonths(13),
    description: 'BOOKING.COM HOTEL',
    amount: -890,
    type: 'expense',
    categoryId: catHolidaysId,
    isReviewed: true,
    notes: 'Hotel in Lisbon',
    createdAt: ts,
    updatedAt: ts,
  });

  // Christmas spending
  transactions.push({
    id: gid(),
    accountId: barclaysId,
    date: subtractMonths(4),
    description: 'AMAZON.CO.UK CHRISTMAS',
    amount: -340,
    type: 'expense',
    categoryId: catShoppingId,
    isReviewed: true,
    notes: 'Christmas presents',
    createdAt: ts,
    updatedAt: ts,
  });

  // Car service
  transactions.push({
    id: gid(),
    accountId: barclaysId,
    date: subtractMonths(8),
    description: 'KWIK FIT SERVICE',
    amount: -285,
    type: 'expense',
    categoryId: catTransportId,
    isReviewed: true,
    createdAt: ts,
    updatedAt: ts,
  });

  // Tax return refund
  transactions.push({
    id: gid(),
    accountId: barclaysId,
    date: subtractMonths(9),
    description: 'HMRC SELF ASSESSMENT REFUND',
    amount: 420,
    type: 'income',
    categoryId: catIncomeId,
    isReviewed: true,
    createdAt: ts,
    updatedAt: ts,
  });

  // Boiler repair
  transactions.push({
    id: gid(),
    accountId: barclaysId,
    date: subtractMonths(11),
    description: 'BRITISH GAS ENGINEER',
    amount: -195,
    type: 'expense',
    categoryId: catHousingId,
    isReviewed: true,
    notes: 'Annual boiler service + repair',
    createdAt: ts,
    updatedAt: ts,
  });

  // Birthday meals out
  transactions.push({
    id: gid(),
    accountId: monzoId,
    date: subtractMonths(10),
    description: 'THE IVY RESTAURANT',
    amount: -148,
    type: 'expense',
    categoryId: catEatingOutId,
    isReviewed: true,
    notes: "Sarah's birthday dinner",
    createdAt: ts,
    updatedAt: ts,
  });

  await db.transactions.bulkAdd(transactions);

  // ── App Settings ──────────────────────────────────────────────────────────

  const settings: AppSettings = {
    id: 'singleton',
    currency: 'GBP',
    locale: 'en-GB',
    theme: 'system',
    density: 'comfortable',
    householdName: 'The Henderson Household',
    onboardingComplete: true,
    primaryIncome: 55000,
    secondaryIncome: 35000,
    primaryPersonId: jamesId,
    secondaryPersonId: sarahId,
    projection: {
      lifeExpectancyPrimary: 90,
      retirementAgePrimary: 65,
      retirementAgeSecondary: 65,
      statePensionAgePrimary: 67,
      statePensionAgeSecondary: 67,
      statePensionWeeklyPrimary: 221.20,
      statePensionWeeklySecondary: 221.20,
      inflationRate: 0.025,
      investmentReturnNominalAnnual: 0.07,
      investmentReturnRealAnnual: 0.045,
      pensionContributionRate: 0.05,
      employerMatchRate: 0.05,
      pensionGrowthRate: 0.07,
      effectiveTaxRate: 0.20,
      safeWithdrawalRate: 0.04,
      propertyGrowthRate: 0.03,
      stateRetirementIncome: (221.20 * 2 * 52) / 12, // both state pensions monthly
    },
  };

  await db.settings.add(settings);
}

// ─── Check and seed ───────────────────────────────────────────────────────────

export async function checkAndSeed(): Promise<void> {
  const existing = await db.settings.get('singleton');
  if (!existing) {
    await seedDatabase();
  }
}
