import Dexie, { type Table } from 'dexie';

// ─── Enum / Union Types ────────────────────────────────────────────────────────

export type AccountType =
  | 'current'
  | 'savings'
  | 'isa_cash'
  | 'isa_stocks'
  | 'investment'
  | 'pension_dc'
  | 'pension_db'
  | 'mortgage'
  | 'loan'
  | 'credit_card'
  | 'cash'
  | 'crypto'
  | 'other';

export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';

export type CategoryType = 'income' | 'expense' | 'savings' | 'transfer';

export type AssetType =
  | 'property'
  | 'vehicle'
  | 'valuable'
  | 'business_equity'
  | 'other';

export type LiabilityType =
  | 'mortgage'
  | 'personal_loan'
  | 'car_loan'
  | 'student_loan'
  | 'credit_card'
  | 'family_loan'
  | 'other';

export type InsuranceType =
  | 'life'
  | 'critical_illness'
  | 'income_protection'
  | 'home_buildings'
  | 'home_contents'
  | 'travel'
  | 'car'
  | 'private_medical'
  | 'pet'
  | 'other';

export type AssetClass =
  | 'global_equity'
  | 'us_equity'
  | 'uk_equity'
  | 'eu_equity'
  | 'emerging_equity'
  | 'bonds_global'
  | 'bonds_uk'
  | 'bonds_corp'
  | 'property_reit'
  | 'commodities'
  | 'cash_equiv'
  | 'crypto'
  | 'alternatives'
  | 'other';

export type GoalType =
  | 'emergency_fund'
  | 'retirement'
  | 'house_deposit'
  | 'education'
  | 'holiday'
  | 'car'
  | 'home_improvement'
  | 'debt_payoff'
  | 'other';

export type GoalPriority = 'essential' | 'important' | 'nice_to_have';

export type Frequency =
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual';

export type LifeEventType =
  | 'child_nursery'
  | 'child_school_state'
  | 'child_school_private'
  | 'child_university'
  | 'child_leave_home'
  | 'retirement_primary'
  | 'retirement_secondary'
  | 'mortgage_end'
  | 'house_move'
  | 'new_child'
  | 'career_change'
  | 'sabbatical'
  | 'inheritance'
  | 'large_purchase'
  | 'custom';

export type PersonRole = 'primary' | 'secondary' | 'child' | 'dependent';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Person {
  id: string;
  name: string;
  role: PersonRole;
  dateOfBirth: string; // ISO date YYYY-MM-DD
  lifeExpectancy?: number; // age
  retirementAge?: number;
  statePensionAge?: number;
  statePensionWeekly?: number; // £/week
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  provider?: string;
  balance: number;
  currency: string;
  isActive: boolean;
  includeInNetWorth: boolean;
  interestRate?: number; // decimal e.g. 0.045
  sortOrder: number;
  personId?: string; // owner
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSplit {
  categoryId: string;
  amount: number;
  note?: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // ISO date YYYY-MM-DD
  description: string;
  amount: number; // positive = credit, negative = debit
  type: TransactionType;
  categoryId?: string;
  splits?: TransactionSplit[];
  transferToAccountId?: string;
  recurringRuleId?: string;
  merchantName?: string;
  notes?: string;
  isReviewed: boolean;
  tags?: string[];
  importBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  parentId?: string;
  icon?: string; // lucide icon name
  color?: string; // hex
  isSystem: boolean;
  budgetMonthly?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringRule {
  id: string;
  name: string;
  accountId: string;
  categoryId?: string;
  amount: number;
  type: TransactionType;
  frequency: Frequency;
  startDate: string; // ISO date
  endDate?: string; // ISO date
  description: string;
  isActive: boolean;
  lastGeneratedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  currentValue: number;
  purchaseValue?: number;
  purchaseDate?: string;
  currency: string;
  address?: string;
  notes?: string;
  includeInNetWorth: boolean;
  personId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Liability {
  id: string;
  name: string;
  type: LiabilityType;
  outstandingBalance: number;
  originalBalance: number;
  interestRate: number; // decimal
  monthlyPayment: number;
  startDate: string;
  endDate?: string;
  lender?: string;
  accountId?: string; // linked account if tracked
  notes?: string;
  personId?: string;
  includeInNetWorth?: boolean; // default true; users can hide a liability from NW
  createdAt: string;
  updatedAt: string;
}

export interface InsurancePolicy {
  id: string;
  name: string;
  type: InsuranceType;
  provider: string;
  policyNumber?: string;
  coverAmount: number;
  monthlyPremium: number;
  startDate: string;
  renewalDate?: string;
  expiryDate?: string;
  isActive: boolean;
  personId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Investment {
  id: string;
  accountId: string;
  ticker?: string;
  name: string;
  assetClass: AssetClass;
  units: number;
  costBasisPerUnit: number;
  currentPricePerUnit: number;
  currency: string;
  isin?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentHistory {
  id: string;
  investmentId: string;
  date: string; // ISO date
  pricePerUnit: number;
  units?: number; // snapshot units if changed
  source: 'manual' | 'auto';
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  priority: GoalPriority;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  targetDate: string; // ISO date
  linkedAccountId?: string;
  isAchieved: boolean;
  notes?: string;
  icon?: string;
  color?: string;
  personId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LifeEvent {
  id: string;
  name: string;
  type: LifeEventType;
  date: string; // ISO date
  personId?: string;
  estimatedCost?: number;
  ongoingMonthlyCostDelta?: number; // change to monthly spending (+ or -)
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeShock {
  startDate: string;
  durationMonths: number;
  multiplier: number; // 0 = no income, 0.5 = half income
}

export interface OneOffItem {
  id: string;
  date: string;
  amount: number; // negative = cost, positive = windfall
  description: string;
}

export interface ScenarioOverrides {
  primaryIncomeShock?: IncomeShock;
  secondaryIncomeShock?: IncomeShock;
  investmentReturnOverride?: number; // annual return e.g. -0.20
  globalSpendingMultiplier?: number; // 1.15 = 15% more spending
  inflationOverride?: number;
  propertyValueDelta?: number; // one-off % change
  oneOffItems?: OneOffItem[];
  pensionContributionRateOverride?: number;
  retirementAgeOverride?: number;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  isBaseline: boolean;
  color?: string;
  overrides: ScenarioOverrides;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectionSettings {
  lifeExpectancyPrimary: number; // age
  retirementAgePrimary: number;
  retirementAgeSecondary?: number;
  statePensionAgePrimary: number;
  statePensionAgeSecondary?: number;
  statePensionWeeklyPrimary: number;
  statePensionWeeklySecondary?: number;
  inflationRate: number; // e.g. 0.025
  investmentReturnNominalAnnual: number; // e.g. 0.07
  investmentReturnRealAnnual: number;
  pensionContributionRate: number; // employee %
  employerMatchRate: number; // employer %
  pensionGrowthRate: number;
  effectiveTaxRate: number; // for tax drag calcs
  safeWithdrawalRate: number; // e.g. 0.04
  propertyGrowthRate: number;
  stateRetirementIncome?: number; // monthly
}

export interface MonthlySnapshot {
  id: string;
  yearMonth: string; // YYYY-MM
  netWorth: number;
  liquidSavings: number;
  investments: number;
  pension: number;
  totalLiabilities: number;
  totalAssets: number;
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  ruleId: string;
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
  estimatedAnnualValue?: number;
  isDismissed: boolean;
  generatedAt: string;
  dismissedAt?: string;
}

export interface AppSettings {
  id: 'singleton';
  currency: string;
  locale: string;
  theme: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'compact';
  householdName: string;
  onboardingComplete: boolean;
  projection: ProjectionSettings;
  primaryIncome: number;
  secondaryIncome: number;
  primaryPersonId?: string;
  secondaryPersonId?: string;
}

export interface AuditEntry {
  id: string;
  table: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  before?: unknown;
  after?: unknown;
  timestamp: string;
}

// ─── Database ─────────────────────────────────────────────────────────────────

export class AtlasDB extends Dexie {
  people!: Table<Person, string>;
  accounts!: Table<Account, string>;
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  recurringRules!: Table<RecurringRule, string>;
  assets!: Table<Asset, string>;
  liabilities!: Table<Liability, string>;
  insurancePolicies!: Table<InsurancePolicy, string>;
  investments!: Table<Investment, string>;
  investmentHistory!: Table<InvestmentHistory, string>;
  goals!: Table<Goal, string>;
  lifeEvents!: Table<LifeEvent, string>;
  scenarios!: Table<Scenario, string>;
  monthlySnapshots!: Table<MonthlySnapshot, string>;
  recommendations!: Table<Recommendation, string>;
  settings!: Table<AppSettings, 'singleton'>;
  auditLog!: Table<AuditEntry, string>;

  constructor() {
    super('AtlasDB');

    this.version(1).stores({
      people: 'id, role, dateOfBirth',
      accounts: 'id, type, personId, isActive',
      transactions: 'id, accountId, date, type, categoryId, recurringRuleId',
      categories: 'id, type, parentId, isSystem',
      recurringRules: 'id, accountId, categoryId, isActive',
      assets: 'id, type, personId',
      liabilities: 'id, type, personId, accountId',
      insurancePolicies: 'id, type, personId, isActive',
      investments: 'id, accountId, assetClass, ticker',
      investmentHistory: 'id, investmentId, date',
      goals: 'id, type, priority, isAchieved, personId',
      lifeEvents: 'id, type, date, personId, isActive',
      scenarios: 'id, isBaseline',
      monthlySnapshots: 'id, yearMonth',
      recommendations: 'id, ruleId, isDismissed',
      settings: 'id',
      auditLog: 'id, table, recordId, action, timestamp',
    });
  }
}

export const db = new AtlasDB();
