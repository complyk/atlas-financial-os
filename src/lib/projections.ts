import type {
  AppSettings,
  Account,
  Liability,
  Investment,
  Asset,
  Goal,
  LifeEvent,
  Scenario,
  Person,
} from '../db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectionInput {
  settings: AppSettings;
  accounts: Account[];
  liabilities: Liability[];
  investments: Investment[];
  assets: Asset[];
  goals: Goal[];
  lifeEvents: LifeEvent[];
  scenario: Scenario;
  people: Person[];
}

export interface MonthlyDataPoint {
  date: string; // YYYY-MM
  netWorth: number;
  liquidSavings: number;
  investments: number;
  pension: number;
  totalIncome: number;
  totalExpenses: number;
  cashSurplus: number;
  totalLiabilities: number;
}

export interface BandDataPoint {
  date: string;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface ProjectionResult {
  monthlyPath: MonthlyDataPoint[];
  bands: BandDataPoint[];
  probabilityOfRuin: number;
  probabilityOfGoalMet: Record<string, number>;
  retirementNetWorthMedian: number;
  retirementNetWorthP10: number;
  retirementNetWorthP90: number;
  inflectionPoints: Array<{ date: string; description: string }>;
}

// ─── Box-Muller transform ─────────────────────────────────────────────────────

export function boxMuller(mean: number, stdDev: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAge(dob: string, atDate: Date): number {
  const birth = new Date(dob);
  let age = atDate.getFullYear() - birth.getFullYear();
  const m = atDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && atDate.getDate() < birth.getDate())) age--;
  return age;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

// ─── Deterministic Path ───────────────────────────────────────────────────────

export function runDeterministicPath(
  input: ProjectionInput,
  annualReturnOverride?: number,
): MonthlyDataPoint[] {
  const { settings, accounts, liabilities, investments, assets, lifeEvents, scenario } = input;
  const overrides = scenario.overrides;
  const proj = settings.projection;

  // Find primary person DOB
  const primaryPerson = input.people.find(
    p => p.id === settings.primaryPersonId || p.role === 'primary',
  );
  const primaryDob = primaryPerson?.dateOfBirth ?? '1990-01-01';
  const lifeExpectancyAge = proj.lifeExpectancyPrimary ?? 90;
  const retirementAge = overrides.retirementAgeOverride ?? proj.retirementAgePrimary ?? 67;
  const statePensionAge = proj.statePensionAgePrimary ?? 67;

  const today = new Date();
  const currentAgeYears = getAge(primaryDob, today);
  const monthsToLiveEnd = (lifeExpectancyAge - currentAgeYears) * 12;
  if (monthsToLiveEnd <= 0) return [];

  // Starting balances
  let liquid = accounts
    .filter(a => a.isActive && a.includeInNetWorth && ['current', 'savings', 'isa_cash', 'cash'].includes(a.type))
    .reduce((s, a) => s + a.balance, 0);

  let investmentPot = investments
    .filter(inv => {
      const acc = accounts.find(a => a.id === inv.accountId);
      return acc && ['isa_stocks', 'investment'].includes(acc.type);
    })
    .reduce((s, inv) => s + inv.units * inv.currentPricePerUnit, 0);

  let pensionPot = investments
    .filter(inv => {
      const acc = accounts.find(a => a.id === inv.accountId);
      return acc && ['pension_dc'].includes(acc.type);
    })
    .reduce((s, inv) => s + inv.units * inv.currentPricePerUnit, 0);

  // Also add account balances for pension_dc accounts not tracked via investments
  const pensionAccountsBalance = accounts
    .filter(a => a.isActive && a.type === 'pension_dc')
    .reduce((s, a) => s + a.balance, 0);
  // Avoid double-counting if investments already account for it
  if (pensionPot === 0) pensionPot = pensionAccountsBalance;

  // Liability amortization state
  const liabState = liabilities.map(l => ({
    id: l.id,
    balance: l.outstandingBalance,
    rate: l.interestRate,
    payment: l.monthlyPayment,
    endDate: l.endDate ? new Date(l.endDate) : null,
  }));

  // Asset values
  const assetValues = assets
    .filter(a => a.includeInNetWorth)
    .reduce((s, a) => s + a.currentValue, 0);
  let mutableAssetValues = assetValues;

  // Rates
  const nominalReturn = annualReturnOverride !== undefined
    ? annualReturnOverride
    : (overrides.investmentReturnOverride !== undefined
      ? overrides.investmentReturnOverride
      : proj.investmentReturnNominalAnnual);
  const monthlyReturn = Math.pow(1 + nominalReturn, 1 / 12) - 1;
  const inflation = overrides.inflationOverride ?? proj.inflationRate;
  const monthlyInflation = Math.pow(1 + inflation, 1 / 12) - 1;
  const propertyGrowthMonthly = Math.pow(1 + (proj.propertyGrowthRate ?? 0.03), 1 / 12) - 1;

  // Income
  const primaryIncome = settings.primaryIncome / 12;
  const secondaryIncome = settings.secondaryIncome / 12;

  // Estimate baseline monthly expenses (70% of income if unknown)
  const baseMonthlyExpenses = (primaryIncome + secondaryIncome) * 0.70;

  // Pension contributions
  const pensionContribRate =
    overrides.pensionContributionRateOverride ?? proj.pensionContributionRate ?? 0.05;
  const employerMatchRate = proj.employerMatchRate ?? 0.05;
  const totalPensionRate = pensionContribRate + employerMatchRate;

  // State pension income (monthly)
  const statePensionMonthly =
    (proj.statePensionWeeklyPrimary ?? 221.20) * (52 / 12) +
    ((proj.statePensionWeeklySecondary ?? 0) * 52) / 12;

  const path: MonthlyDataPoint[] = [];
  let currentDate = new Date(today);

  for (let month = 0; month < monthsToLiveEnd; month++) {
    const ageNow = currentAgeYears + month / 12;
    const isRetired = ageNow >= retirementAge;
    const hasStatePension = ageNow >= statePensionAge;
    const yearMonth = toYearMonth(currentDate);

    // ── Income ────────────────────────────────────────────────────────────────
    let totalIncome: number;
    if (!isRetired) {
      // Working years
      let pIncome = primaryIncome;
      let sIncome = secondaryIncome;

      // Apply income shocks
      if (overrides.primaryIncomeShock) {
        const shock = overrides.primaryIncomeShock;
        const shockStart = new Date(shock.startDate);
        const shockEnd = addMonths(shockStart, shock.durationMonths);
        if (currentDate >= shockStart && currentDate < shockEnd) {
          pIncome *= shock.multiplier;
        }
      }
      if (overrides.secondaryIncomeShock) {
        const shock = overrides.secondaryIncomeShock;
        const shockStart = new Date(shock.startDate);
        const shockEnd = addMonths(shockStart, shock.durationMonths);
        if (currentDate >= shockStart && currentDate < shockEnd) {
          sIncome *= shock.multiplier;
        }
      }

      totalIncome = pIncome + sIncome;
    } else {
      // Retirement: state pension + safe withdrawal from pension pot
      const pensionDrawdown = pensionPot > 0 ? (pensionPot * (proj.safeWithdrawalRate ?? 0.04)) / 12 : 0;
      totalIncome = (hasStatePension ? statePensionMonthly : 0) + pensionDrawdown;
    }

    // ── Expenses ──────────────────────────────────────────────────────────────
    // Grow expenses by inflation each month
    const inflationFactor = Math.pow(1 + inflation, month / 12);
    let expenses = baseMonthlyExpenses * inflationFactor;

    // Spending multiplier
    const spendMult = overrides.globalSpendingMultiplier ?? 1;
    expenses *= spendMult;

    // Life event cost deltas
    for (const ev of lifeEvents) {
      if (!ev.isActive) continue;
      const evDate = new Date(ev.date);
      if (ev.ongoingMonthlyCostDelta && currentDate >= evDate) {
        expenses += ev.ongoingMonthlyCostDelta;
      }
    }

    // ── One-off items ─────────────────────────────────────────────────────────
    let oneOffTotal = 0;
    if (overrides.oneOffItems) {
      for (const item of overrides.oneOffItems) {
        const itemDate = new Date(item.date);
        if (
          itemDate.getFullYear() === currentDate.getFullYear() &&
          itemDate.getMonth() === currentDate.getMonth()
        ) {
          oneOffTotal += item.amount;
        }
      }
    }

    // ── Life event one-off costs ──────────────────────────────────────────────
    for (const ev of lifeEvents) {
      if (!ev.isActive || !ev.estimatedCost) continue;
      const evDate = new Date(ev.date);
      if (
        evDate.getFullYear() === currentDate.getFullYear() &&
        evDate.getMonth() === currentDate.getMonth()
      ) {
        oneOffTotal -= ev.estimatedCost;
      }
    }

    // ── Debt service ──────────────────────────────────────────────────────────
    let totalDebtPayments = 0;
    let totalLiabilities = 0;
    for (const liab of liabState) {
      if (liab.balance <= 0) continue;
      if (liab.endDate && currentDate > liab.endDate) {
        liab.balance = 0;
        continue;
      }
      const interestCharge = liab.balance * (liab.rate / 12);
      const principal = Math.min(liab.payment - interestCharge, liab.balance);
      liab.balance = Math.max(0, liab.balance - principal);
      totalDebtPayments += liab.payment;
      totalLiabilities += liab.balance;
    }

    // ── Cash flow ─────────────────────────────────────────────────────────────
    const cashSurplus = totalIncome - expenses - totalDebtPayments + oneOffTotal;

    // ── Pension contributions (pre-retirement) ────────────────────────────────
    let pensionContribMonthly = 0;
    if (!isRetired) {
      pensionContribMonthly = primaryIncome * totalPensionRate;
      pensionPot += pensionContribMonthly;
      // Pension grows at investment rate
      pensionPot *= 1 + monthlyReturn;
    } else {
      // Drawdown already accounted for in income; pot still grows on remainder
      const pensionDrawdown = pensionPot > 0 ? (pensionPot * (proj.safeWithdrawalRate ?? 0.04)) / 12 : 0;
      pensionPot = Math.max(0, pensionPot - pensionDrawdown);
      pensionPot *= 1 + monthlyReturn;
    }

    // ── Savings allocation ────────────────────────────────────────────────────
    if (cashSurplus > 0) {
      const toInvest = cashSurplus * 0.60;
      const toLiquid = cashSurplus * 0.40;
      investmentPot += toInvest;
      liquid += toLiquid;
    } else {
      // Draw from liquid first, then investments
      const deficit = -cashSurplus;
      if (liquid >= deficit) {
        liquid -= deficit;
      } else {
        const remaining = deficit - liquid;
        liquid = 0;
        investmentPot = Math.max(0, investmentPot - remaining);
      }
    }

    // ── Investment growth ─────────────────────────────────────────────────────
    investmentPot *= 1 + monthlyReturn;
    // Liquid savings get a modest rate (e.g., 3% easy access)
    liquid *= 1 + Math.pow(1.03, 1 / 12) - 1;

    // ── Property / asset appreciation ─────────────────────────────────────────
    mutableAssetValues *= 1 + propertyGrowthMonthly;

    // ── Net worth ─────────────────────────────────────────────────────────────
    const netWorth = liquid + investmentPot + pensionPot + mutableAssetValues - totalLiabilities;

    path.push({
      date: yearMonth,
      netWorth,
      liquidSavings: liquid,
      investments: investmentPot,
      pension: pensionPot,
      totalIncome,
      totalExpenses: expenses + totalDebtPayments,
      cashSurplus,
      totalLiabilities,
    });

    currentDate = addMonths(currentDate, 1);
  }

  return path;
}

// ─── Monte Carlo Projection ───────────────────────────────────────────────────

const MONTE_CARLO_RUNS = 1000;
// Annual return assumptions: mean 7%, std dev 15% (equity-like)
const RETURN_MEAN = 0.07;
const RETURN_STD = 0.15;

export function runProjection(input: ProjectionInput): ProjectionResult {
  // Run deterministic baseline
  const basePath = runDeterministicPath(input);

  // Run Monte Carlo
  const allPaths: MonthlyDataPoint[][] = [basePath];
  for (let i = 0; i < MONTE_CARLO_RUNS; i++) {
    const annualReturn = boxMuller(RETURN_MEAN, RETURN_STD);
    const path = runDeterministicPath(input, annualReturn);
    allPaths.push(path);
  }

  // Build percentile bands month by month
  const nMonths = basePath.length;
  const bands: BandDataPoint[] = [];

  for (let m = 0; m < nMonths; m++) {
    const netWorths = allPaths
      .map(p => p[m]?.netWorth ?? 0)
      .sort((a, b) => a - b);

    bands.push({
      date: basePath[m].date,
      p5: percentile(netWorths, 5),
      p25: percentile(netWorths, 25),
      p50: percentile(netWorths, 50),
      p75: percentile(netWorths, 75),
      p95: percentile(netWorths, 95),
    });
  }

  // Probability of ruin: % of paths where net worth goes negative
  let ruinCount = 0;
  for (const path of allPaths) {
    if (path.some(p => p.netWorth < 0)) ruinCount++;
  }
  const probabilityOfRuin = ruinCount / allPaths.length;

  // Goal met probabilities
  const probabilityOfGoalMet: Record<string, number> = {};
  for (const goal of input.goals) {
    if (goal.isAchieved) {
      probabilityOfGoalMet[goal.id] = 1;
      continue;
    }
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const monthsToTarget = Math.max(
      0,
      (targetDate.getFullYear() - today.getFullYear()) * 12 +
        (targetDate.getMonth() - today.getMonth()),
    );
    const monthIdx = Math.min(monthsToTarget, nMonths - 1);

    let metCount = 0;
    for (const path of allPaths) {
      const point = path[monthIdx];
      if (point) {
        // For liquid goals compare liquid + investments; for retirement compare net worth
        const available =
          goal.type === 'retirement'
            ? point.netWorth
            : point.liquidSavings + goal.currentAmount + goal.monthlyContribution * monthsToTarget;
        if (available >= goal.targetAmount) metCount++;
      }
    }
    probabilityOfGoalMet[goal.id] = metCount / allPaths.length;
  }

  // Retirement net worth stats
  const { settings, people } = input;
  const primaryPerson = people.find(p => p.id === settings.primaryPersonId || p.role === 'primary');
  const primaryDob = primaryPerson?.dateOfBirth ?? '1990-01-01';
  const retirementAge =
    input.scenario.overrides.retirementAgeOverride ?? settings.projection.retirementAgePrimary ?? 67;
  const currentAge = getAge(primaryDob, new Date());
  const monthsToRetirement = Math.max(0, (retirementAge - currentAge) * 12);
  const retirIdx = Math.min(monthsToRetirement, nMonths - 1);

  const retirementNetWorths = allPaths
    .map(p => p[retirIdx]?.netWorth ?? 0)
    .sort((a, b) => a - b);

  const retirementNetWorthMedian = percentile(retirementNetWorths, 50);
  const retirementNetWorthP10 = percentile(retirementNetWorths, 10);
  const retirementNetWorthP90 = percentile(retirementNetWorths, 90);

  // Inflection points
  const inflectionPoints: Array<{ date: string; description: string }> = [];
  // Retirement
  if (monthsToRetirement < nMonths) {
    inflectionPoints.push({
      date: basePath[retirIdx]?.date ?? '',
      description: `Retirement at age ${retirementAge}`,
    });
  }
  // Debt payoff
  for (const liab of input.liabilities) {
    if (!liab.endDate) continue;
    const liabEnd = new Date(liab.endDate);
    const today2 = new Date();
    const mIdx =
      (liabEnd.getFullYear() - today2.getFullYear()) * 12 +
      (liabEnd.getMonth() - today2.getMonth());
    if (mIdx > 0 && mIdx < nMonths) {
      inflectionPoints.push({
        date: basePath[mIdx]?.date ?? '',
        description: `${liab.name} paid off`,
      });
    }
  }
  // Life events
  for (const ev of input.lifeEvents) {
    if (!ev.isActive) continue;
    const evDate = new Date(ev.date);
    const today3 = new Date();
    const mIdx =
      (evDate.getFullYear() - today3.getFullYear()) * 12 +
      (evDate.getMonth() - today3.getMonth());
    if (mIdx > 0 && mIdx < nMonths) {
      inflectionPoints.push({
        date: basePath[mIdx]?.date ?? '',
        description: ev.name,
      });
    }
  }

  inflectionPoints.sort((a, b) => a.date.localeCompare(b.date));

  return {
    monthlyPath: basePath,
    bands,
    probabilityOfRuin,
    probabilityOfGoalMet,
    retirementNetWorthMedian,
    retirementNetWorthP10,
    retirementNetWorthP90,
    inflectionPoints,
  };
}
