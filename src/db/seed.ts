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

  const khalidId = gid();
  const laraId = gid();
  const adamId = gid();

  const people: Person[] = [
    {
      id: khalidId,
      name: 'Khalid',
      role: 'primary',
      dateOfBirth: '1990-03-15',
      lifeExpectancy: 90,
      retirementAge: 60,
      statePensionAge: 60,
      statePensionWeekly: 0, // UAE has no state pension
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: laraId,
      name: 'Lara',
      role: 'secondary',
      dateOfBirth: '1992-07-22',
      lifeExpectancy: 92,
      retirementAge: 55,
      statePensionAge: 55,
      statePensionWeekly: 0,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: adamId,
      name: 'Adam',
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
  const catEntertainmentId = gid();
  const catSubscriptionsId = gid();
  const catHealthId = gid();
  const catShoppingId = gid();
  const catChildrenId = gid();
  const catSavingsId = gid();
  const catTransfersId = gid();
  const catHolidaysId = gid();
  const catPersonalCareId = gid();

  const categories: Category[] = [
    { id: catIncomeId, name: 'Income', type: 'income', isSystem: true, sortOrder: 0, createdAt: ts, updatedAt: ts },
    { id: catSalaryPrimaryId, name: 'Salary (Khalid)', type: 'income', parentId: catIncomeId, isSystem: false, sortOrder: 1, createdAt: ts, updatedAt: ts },
    { id: catSalarySecondaryId, name: 'Salary (Lara)', type: 'income', parentId: catIncomeId, isSystem: false, sortOrder: 2, createdAt: ts, updatedAt: ts },

    { id: catHousingId, name: 'Housing', type: 'expense', isSystem: false, sortOrder: 10, budgetMonthly: 6000, createdAt: ts, updatedAt: ts },
    { id: catRentId, name: 'Home Finance / Rent', type: 'expense', parentId: catHousingId, isSystem: false, sortOrder: 11, budgetMonthly: 5300, createdAt: ts, updatedAt: ts },
    { id: catUtilitiesId, name: 'Utilities & DEWA', type: 'expense', parentId: catHousingId, isSystem: false, sortOrder: 12, budgetMonthly: 900, createdAt: ts, updatedAt: ts },
    { id: catHomeInsuranceId, name: 'Home Insurance', type: 'expense', parentId: catHousingId, isSystem: false, sortOrder: 13, budgetMonthly: 220, createdAt: ts, updatedAt: ts },

    { id: catFoodId, name: 'Food & Drink', type: 'expense', isSystem: false, sortOrder: 20, budgetMonthly: 3500, createdAt: ts, updatedAt: ts },
    { id: catGroceriesId, name: 'Groceries', type: 'expense', parentId: catFoodId, isSystem: false, sortOrder: 21, budgetMonthly: 2500, createdAt: ts, updatedAt: ts },
    { id: catEatingOutId, name: 'Eating Out', type: 'expense', parentId: catFoodId, isSystem: false, sortOrder: 22, budgetMonthly: 1000, createdAt: ts, updatedAt: ts },

    { id: catTransportId, name: 'Transport', type: 'expense', isSystem: false, sortOrder: 30, budgetMonthly: 1800, createdAt: ts, updatedAt: ts },
    { id: catFuelId, name: 'Fuel', type: 'expense', parentId: catTransportId, isSystem: false, sortOrder: 31, budgetMonthly: 600, createdAt: ts, updatedAt: ts },
    { id: catPublicTransportId, name: 'Taxi / Metro / RTA', type: 'expense', parentId: catTransportId, isSystem: false, sortOrder: 32, budgetMonthly: 400, createdAt: ts, updatedAt: ts },

    { id: catEntertainmentId, name: 'Entertainment', type: 'expense', isSystem: false, sortOrder: 40, budgetMonthly: 600, createdAt: ts, updatedAt: ts },
    { id: catSubscriptionsId, name: 'Subscriptions', type: 'expense', parentId: catEntertainmentId, isSystem: false, sortOrder: 41, budgetMonthly: 220, createdAt: ts, updatedAt: ts },

    { id: catHealthId, name: 'Health & Medical', type: 'expense', isSystem: false, sortOrder: 50, budgetMonthly: 400, createdAt: ts, updatedAt: ts },
    { id: catShoppingId, name: 'Shopping', type: 'expense', isSystem: false, sortOrder: 60, budgetMonthly: 1000, createdAt: ts, updatedAt: ts },
    { id: catChildrenId, name: 'Children & Nursery', type: 'expense', isSystem: false, sortOrder: 65, budgetMonthly: 1500, createdAt: ts, updatedAt: ts },
    { id: catPersonalCareId, name: 'Personal Care', type: 'expense', isSystem: false, sortOrder: 70, budgetMonthly: 400, createdAt: ts, updatedAt: ts },
    { id: catHolidaysId, name: 'Holidays & Travel', type: 'expense', isSystem: false, sortOrder: 80, budgetMonthly: 700, createdAt: ts, updatedAt: ts },

    { id: catSavingsId, name: 'Savings', type: 'savings', isSystem: true, sortOrder: 90, createdAt: ts, updatedAt: ts },
    { id: catTransfersId, name: 'Transfers', type: 'transfer', isSystem: true, sortOrder: 95, createdAt: ts, updatedAt: ts },
  ];

  await db.categories.bulkAdd(categories);

  // ── Accounts ──────────────────────────────────────────────────────────────

  const endbCurrentId = gid();
  const mashreqCurrentId = gid();
  const adcbSavingsId = gid();
  const ibInvestId = gid();
  const difcPensionId = gid();

  const accounts: Account[] = [
    {
      id: endbCurrentId,
      name: 'Emirates NBD Current',
      type: 'current',
      provider: 'Emirates NBD',
      balance: 16500,
      currency: 'AED',
      isActive: true,
      includeInNetWorth: true,
      sortOrder: 0,
      personId: khalidId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: mashreqCurrentId,
      name: 'Mashreq Current',
      type: 'current',
      provider: 'Mashreq Bank',
      balance: 8800,
      currency: 'AED',
      isActive: true,
      includeInNetWorth: true,
      sortOrder: 1,
      personId: laraId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: adcbSavingsId,
      name: 'ADCB Savings',
      type: 'savings',
      provider: 'Abu Dhabi Commercial Bank',
      balance: 89000,
      currency: 'AED',
      isActive: true,
      includeInNetWorth: true,
      interestRate: 0.045,
      sortOrder: 2,
      personId: khalidId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: ibInvestId,
      name: 'Interactive Brokers Investment',
      type: 'investment',
      provider: 'Interactive Brokers',
      balance: 203000,
      currency: 'AED',
      isActive: true,
      includeInNetWorth: true,
      sortOrder: 3,
      personId: khalidId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: difcPensionId,
      name: 'DIFC Pension Fund',
      type: 'pension_dc',
      provider: 'DIFC Authority',
      balance: 323000,
      currency: 'AED',
      isActive: true,
      includeInNetWorth: true,
      sortOrder: 4,
      personId: khalidId,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.accounts.bulkAdd(accounts);

  // ── Liabilities ───────────────────────────────────────────────────────────

  const homefinanceId = gid();

  const liabilities: Liability[] = [
    {
      id: homefinanceId,
      name: 'ENBD Home Finance',
      type: 'mortgage',
      outstandingBalance: 900000,
      originalBalance: 1425000,
      interestRate: 0.035,
      monthlyPayment: 5300,
      startDate: '2019-06-01',
      endDate: '2049-01-01',
      lender: 'Emirates NBD',
      notes: 'Islamic home finance (Ijara), fixed rate 3.5%',
      personId: khalidId,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.liabilities.bulkAdd(liabilities);

  // ── Assets ─────────────────────────────────────────────────────────────────

  const apartmentId = gid();

  const assets: Asset[] = [
    {
      id: apartmentId,
      name: 'Dubai Marina Apartment',
      type: 'property',
      currentValue: 2330000,
      purchaseValue: 1900000,
      purchaseDate: '2019-06-01',
      currency: 'AED',
      address: 'Marina Promenade, Dubai Marina, Dubai, UAE',
      includeInNetWorth: true,
      personId: khalidId,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.assets.bulkAdd(assets);

  // ── Investments ───────────────────────────────────────────────────────────

  const vwceId = gid();
  const cspxId = gid();
  const ls80Id = gid();

  const investments: Investment[] = [
    {
      id: vwceId,
      accountId: ibInvestId,
      ticker: 'VWCE',
      name: 'Vanguard FTSE All-World UCITS ETF (Acc)',
      assetClass: 'global_equity',
      units: 320,
      costBasisPerUnit: 102,
      currentPricePerUnit: 128,
      currency: 'USD',
      isin: 'IE00BK5BQT80',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: cspxId,
      accountId: ibInvestId,
      ticker: 'CSPX',
      name: 'iShares Core S&P 500 UCITS ETF (Acc)',
      assetClass: 'us_equity',
      units: 150,
      costBasisPerUnit: 380,
      currentPricePerUnit: 445,
      currency: 'USD',
      isin: 'IE00B5BMR087',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: ls80Id,
      accountId: difcPensionId,
      name: 'DIFC Balanced Growth Portfolio',
      assetClass: 'global_equity',
      units: 1200,
      costBasisPerUnit: 240,
      currentPricePerUnit: 268,
      currency: 'AED',
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.investments.bulkAdd(investments);

  // ── Insurance Policies ────────────────────────────────────────────────────

  const khalidLifeId = gid();
  const laraCiId = gid();

  const insurancePolicies: InsurancePolicy[] = [
    {
      id: khalidLifeId,
      name: "Khalid's Life Insurance",
      type: 'life',
      provider: 'MetLife UAE',
      coverAmount: 2450000,
      monthlyPremium: 220,
      startDate: '2019-06-01',
      renewalDate: '2049-06-01',
      isActive: true,
      personId: khalidId,
      notes: 'Level term life cover to match home finance',
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: laraCiId,
      name: "Lara's Critical Illness Cover",
      type: 'critical_illness',
      provider: 'AXA Gulf',
      coverAmount: 980000,
      monthlyPremium: 155,
      startDate: '2021-03-01',
      renewalDate: '2041-03-01',
      isActive: true,
      personId: laraId,
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
      targetAmount: 120000,
      currentAmount: 89000,
      monthlyContribution: 2500,
      targetDate: '2026-06-01',
      linkedAccountId: adcbSavingsId,
      isAchieved: false,
      icon: 'Shield',
      color: '#10b981',
      personId: khalidId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: goalRetId,
      name: 'Retirement Portfolio',
      type: 'retirement',
      priority: 'essential',
      targetAmount: 3850000,
      currentAmount: 323000,
      monthlyContribution: 3500,
      targetDate: '2050-03-15',
      linkedAccountId: difcPensionId,
      isAchieved: false,
      icon: 'Sunset',
      color: '#f59e0b',
      personId: khalidId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: goalEduId,
      name: "Adam's Education Fund",
      type: 'education',
      priority: 'important',
      targetAmount: 290000,
      currentAmount: 0,
      monthlyContribution: 1000,
      targetDate: '2042-09-01',
      isAchieved: false,
      icon: 'GraduationCap',
      color: '#8b5cf6',
      personId: adamId,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: goalHolId,
      name: 'Maldives Holiday 2026',
      type: 'holiday',
      priority: 'nice_to_have',
      targetAmount: 29000,
      currentAmount: 5800,
      monthlyContribution: 2000,
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
      name: 'Adam starts nursery',
      type: 'child_nursery',
      date: '2027-09-01',
      personId: adamId,
      estimatedCost: 2000,
      ongoingMonthlyCostDelta: 1200,
      notes: 'International nursery in Dubai Marina',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'ENBD Home Finance ends',
      type: 'mortgage_end',
      date: '2049-01-01',
      personId: khalidId,
      ongoingMonthlyCostDelta: -5300,
      notes: 'Final payment — AED 5,300/month freed up',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Khalid retires',
      type: 'retirement_primary',
      date: '2050-03-15',
      personId: khalidId,
      notes: 'Target retirement at age 60',
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
      name: 'Early Retirement at 55',
      description: 'Khalid retires 5 years early',
      isBaseline: false,
      color: '#10b981',
      overrides: { retirementAgeOverride: 55 },
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Job Loss — 6 months',
      description: 'Khalid loses primary income for 6 months',
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
      name: 'ENBD Home Finance',
      accountId: endbCurrentId,
      categoryId: catRentId,
      amount: 5300,
      type: 'expense',
      frequency: 'monthly',
      startDate: '2019-06-01',
      endDate: '2049-01-01',
      description: 'Islamic home finance monthly payment',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'DEWA — Electricity & Water',
      accountId: endbCurrentId,
      categoryId: catUtilitiesId,
      amount: 650,
      type: 'expense',
      frequency: 'monthly',
      startDate: '2019-06-01',
      description: 'Dubai Electricity & Water Authority',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'du Telecom',
      accountId: endbCurrentId,
      categoryId: catUtilitiesId,
      amount: 350,
      type: 'expense',
      frequency: 'monthly',
      startDate: '2022-01-01',
      description: 'du broadband + mobile family plan',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Netflix',
      accountId: mashreqCurrentId,
      categoryId: catSubscriptionsId,
      amount: 66,
      type: 'expense',
      frequency: 'monthly',
      startDate: '2021-01-01',
      description: 'Netflix Standard (AED 66/mo)',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Spotify Family',
      accountId: mashreqCurrentId,
      categoryId: catSubscriptionsId,
      amount: 55,
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
      name: 'Khalid Salary',
      accountId: endbCurrentId,
      categoryId: catSalaryPrimaryId,
      amount: 35000,
      type: 'income',
      frequency: 'monthly',
      startDate: '2020-01-01',
      description: 'Net salary — Khalid',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: gid(),
      name: 'Lara Salary',
      accountId: mashreqCurrentId,
      categoryId: catSalarySecondaryId,
      amount: 22000,
      type: 'income',
      frequency: 'monthly',
      startDate: '2020-01-01',
      description: 'Net salary — Lara',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  await db.recurringRules.bulkAdd(recurringRules);

  // ── Transactions (18 months) ──────────────────────────────────────────────

  const transactions: Transaction[] = [];

  for (let m = 0; m < 18; m++) {
    // Salary — Khalid
    transactions.push({
      id: gid(),
      accountId: endbCurrentId,
      date: dateInMonth(17 - m, 28),
      description: 'WPS SALARY EMPLOYER',
      amount: 35000,
      type: 'income',
      categoryId: catSalaryPrimaryId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Salary — Lara
    transactions.push({
      id: gid(),
      accountId: mashreqCurrentId,
      date: dateInMonth(17 - m, 28),
      description: 'WPS SALARY LARA EMPLOYER',
      amount: 22000,
      type: 'income',
      categoryId: catSalarySecondaryId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Home Finance
    transactions.push({
      id: gid(),
      accountId: endbCurrentId,
      date: dateInMonth(17 - m, 1),
      description: 'ENBD HOME FINANCE DD',
      amount: 5300,
      type: 'expense',
      categoryId: catRentId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // DEWA
    transactions.push({
      id: gid(),
      accountId: endbCurrentId,
      date: dateInMonth(17 - m, 5),
      description: 'DEWA ELECTRICITY & WATER',
      amount: 600 + Math.round(Math.random() * 200),
      type: 'expense',
      categoryId: catUtilitiesId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // du Telecom
    transactions.push({
      id: gid(),
      accountId: endbCurrentId,
      date: dateInMonth(17 - m, 10),
      description: 'DU TELECOM DD',
      amount: 350,
      type: 'expense',
      categoryId: catUtilitiesId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Home insurance
    transactions.push({
      id: gid(),
      accountId: endbCurrentId,
      date: dateInMonth(17 - m, 15),
      description: 'AXA HOME INSURANCE DD',
      amount: 210,
      type: 'expense',
      categoryId: catHomeInsuranceId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Life insurance
    transactions.push({
      id: gid(),
      accountId: endbCurrentId,
      date: dateInMonth(17 - m, 16),
      description: 'METLIFE INSURANCE DD',
      amount: 220,
      type: 'expense',
      categoryId: catHealthId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Critical illness
    transactions.push({
      id: gid(),
      accountId: mashreqCurrentId,
      date: dateInMonth(17 - m, 16),
      description: 'AXA GULF CRITICAL ILLNESS DD',
      amount: 155,
      type: 'expense',
      categoryId: catHealthId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Groceries — weekly x4
    for (let w = 0; w < 4; w++) {
      const groceryAmount = 480 + Math.round(Math.random() * 280);
      transactions.push({
        id: gid(),
        accountId: w % 2 === 0 ? endbCurrentId : mashreqCurrentId,
        date: dateInMonth(17 - m, 4 + w * 7),
        description: w % 3 === 0 ? 'CARREFOUR DUBAI MARINA' : w % 3 === 1 ? 'WAITROSE JBR' : 'SPINNEYS MARINA',
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
        accountId: mashreqCurrentId,
        date: dateInMonth(17 - m, 8 + e * 5),
        description: e % 3 === 0 ? 'ZUMA DIFC' : e % 3 === 1 ? 'COYA RESTAURANT' : 'CAESARS PALACE',
        amount: 180 + Math.round(Math.random() * 280),
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
      accountId: endbCurrentId,
      date: dateInMonth(17 - m, 9),
      description: 'ENOC PETROL STATION',
      amount: 290 + Math.round(Math.random() * 140),
      type: 'expense',
      categoryId: catFuelId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Taxi/RTA
    if (m % 2 === 0) {
      transactions.push({
        id: gid(),
        accountId: mashreqCurrentId,
        date: dateInMonth(17 - m, 14),
        description: 'CAREEM / RTA METRO',
        amount: 160 + Math.round(Math.random() * 120),
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
      accountId: mashreqCurrentId,
      date: dateInMonth(17 - m, 20),
      description: 'NETFLIX.COM',
      amount: 66,
      type: 'expense',
      categoryId: catSubscriptionsId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Spotify
    transactions.push({
      id: gid(),
      accountId: mashreqCurrentId,
      date: dateInMonth(17 - m, 21),
      description: 'SPOTIFY AB',
      amount: 55,
      type: 'expense',
      categoryId: catSubscriptionsId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Shopping
    if (m % 3 === 0 || Math.random() > 0.4) {
      transactions.push({
        id: gid(),
        accountId: m % 2 === 0 ? endbCurrentId : mashreqCurrentId,
        date: dateInMonth(17 - m, 13),
        description: m % 4 === 0 ? 'MALL OF THE EMIRATES' : m % 4 === 1 ? 'DUBAI MALL H&M' : m % 4 === 2 ? 'MARKS & SPENCER UAE' : 'NOON.COM',
        amount: 190 + Math.round(Math.random() * 480),
        type: 'expense',
        categoryId: catShoppingId,
        isReviewed: m < 6,
        createdAt: ts,
        updatedAt: ts,
      });
    }

    // Nursery
    transactions.push({
      id: gid(),
      accountId: endbCurrentId,
      date: dateInMonth(17 - m, 2),
      description: 'BRIGHT STARS NURSERY DUBAI',
      amount: 4600,
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
        accountId: mashreqCurrentId,
        date: dateInMonth(17 - m, 18),
        description: m % 8 === 0 ? 'LIFE PHARMACY JBR' : 'MEDICLINIC MARINA',
        amount: 75 + Math.round(Math.random() * 280),
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
      accountId: mashreqCurrentId,
      date: dateInMonth(17 - m, 17),
      description: m % 2 === 0 ? 'CHARLES WORTHINGTON SALON' : 'TIPS & TOES SPA',
      amount: 120 + Math.round(Math.random() * 140),
      type: 'expense',
      categoryId: catPersonalCareId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Savings transfer to ADCB
    transactions.push({
      id: gid(),
      accountId: endbCurrentId,
      date: dateInMonth(17 - m, 29),
      description: 'TRANSFER TO ADCB SAVINGS',
      amount: 2500,
      type: 'transfer',
      categoryId: catSavingsId,
      transferToAccountId: adcbSavingsId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Investment contribution (monthly)
    transactions.push({
      id: gid(),
      accountId: endbCurrentId,
      date: dateInMonth(17 - m, 29),
      description: 'IB INVESTMENT CONTRIBUTION',
      amount: 2900,
      type: 'investment',
      categoryId: catSavingsId,
      transferToAccountId: ibInvestId,
      isReviewed: true,
      createdAt: ts,
      updatedAt: ts,
    });

    // Holiday savings (some months)
    if (m >= 6 && m <= 12) {
      transactions.push({
        id: gid(),
        accountId: endbCurrentId,
        date: dateInMonth(17 - m, 29),
        description: 'HOLIDAY FUND TRANSFER',
        amount: 2000,
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
    accountId: endbCurrentId,
    date: subtractMonths(14),
    description: 'EMIRATES AIRLINES FLIGHTS',
    amount: 2950,
    type: 'expense',
    categoryId: catHolidaysId,
    isReviewed: true,
    notes: 'Maldives flights - summer 2025',
    createdAt: ts,
    updatedAt: ts,
  });

  transactions.push({
    id: gid(),
    accountId: endbCurrentId,
    date: subtractMonths(13),
    description: 'JUMEIRAH MALDIVES RESORT',
    amount: 4300,
    type: 'expense',
    categoryId: catHolidaysId,
    isReviewed: true,
    notes: 'Resort booking Maldives',
    createdAt: ts,
    updatedAt: ts,
  });

  // Eid spending
  transactions.push({
    id: gid(),
    accountId: endbCurrentId,
    date: subtractMonths(4),
    description: 'EID GIFTS & GIFTS - NOON.COM',
    amount: 1650,
    type: 'expense',
    categoryId: catShoppingId,
    isReviewed: true,
    notes: 'Eid al-Adha gifts',
    createdAt: ts,
    updatedAt: ts,
  });

  // Car service
  transactions.push({
    id: gid(),
    accountId: endbCurrentId,
    date: subtractMonths(8),
    description: 'AL TAYER MOTORS SERVICE',
    amount: 1380,
    type: 'expense',
    categoryId: catTransportId,
    isReviewed: true,
    createdAt: ts,
    updatedAt: ts,
  });

  // Tax refund equivalent (EOSG gratuity received)
  transactions.push({
    id: gid(),
    accountId: endbCurrentId,
    date: subtractMonths(9),
    description: 'EMPLOYER GRATUITY PAYMENT',
    amount: 8400,
    type: 'income',
    categoryId: catIncomeId,
    isReviewed: true,
    notes: 'End-of-service gratuity',
    createdAt: ts,
    updatedAt: ts,
  });

  // AC maintenance
  transactions.push({
    id: gid(),
    accountId: endbCurrentId,
    date: subtractMonths(11),
    description: 'EMPOWER DISTRICT COOLING',
    amount: 950,
    type: 'expense',
    categoryId: catHousingId,
    isReviewed: true,
    notes: 'District cooling annual service',
    createdAt: ts,
    updatedAt: ts,
  });

  // Anniversary dinner
  transactions.push({
    id: gid(),
    accountId: mashreqCurrentId,
    date: subtractMonths(10),
    description: 'NOBU ATLANTIS PALM',
    amount: 720,
    type: 'expense',
    categoryId: catEatingOutId,
    isReviewed: true,
    notes: 'Anniversary dinner',
    createdAt: ts,
    updatedAt: ts,
  });

  await db.transactions.bulkAdd(transactions);

  // ── App Settings ──────────────────────────────────────────────────────────

  const settings: AppSettings = {
    id: 'singleton',
    currency: 'AED',
    locale: 'en-AE',
    theme: 'system',
    density: 'comfortable',
    householdName: 'Al-Rashid Household',
    onboardingComplete: true,
    primaryIncome: 35000,
    secondaryIncome: 22000,
    primaryPersonId: khalidId,
    secondaryPersonId: laraId,
    projection: {
      lifeExpectancyPrimary: 90,
      retirementAgePrimary: 60,
      retirementAgeSecondary: 55,
      statePensionAgePrimary: 60,
      statePensionAgeSecondary: 55,
      statePensionWeeklyPrimary: 0,
      statePensionWeeklySecondary: 0,
      inflationRate: 0.025,
      investmentReturnNominalAnnual: 0.07,
      investmentReturnRealAnnual: 0.045,
      pensionContributionRate: 0.05,
      employerMatchRate: 0.05,
      pensionGrowthRate: 0.07,
      effectiveTaxRate: 0.0, // UAE has no income tax
      safeWithdrawalRate: 0.04,
      propertyGrowthRate: 0.04,
      stateRetirementIncome: 0, // UAE has no state pension
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
