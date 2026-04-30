import type { Account, Transaction, Goal, Liability, RecurringRule, AppSettings } from '../db/schema';

export interface RecommendationRule {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  evaluate: (data: RecommendationData) => RecommendationOutput | null;
}

export interface RecommendationData {
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  liabilities: Liability[];
  recurringRules: RecurringRule[];
  settings: AppSettings;
  monthlyExpenses: number;
}

export interface RecommendationOutput {
  title: string;
  body: string;
  estimatedAnnualValue?: number;
  priority: 'high' | 'medium' | 'low';
}

export const RECOMMENDATION_RULES: RecommendationRule[] = [
  {
    id: 'idle_cash',
    title: 'Idle cash earning below inflation',
    priority: 'high',
    evaluate({ accounts, monthlyExpenses }) {
      const savingsAccounts = accounts.filter(a => a.type === 'savings' && a.isActive);
      const lowRateAccounts = savingsAccounts.filter(a => {
        const rate = a.interestRate ?? 0;
        const threeMonthsExpenses = monthlyExpenses * 3;
        return a.balance > threeMonthsExpenses && rate < 0.03;
      });
      if (!lowRateAccounts.length) return null;
      const totalIdle = lowRateAccounts.reduce((s, a) => s + a.balance, 0);
      const avgRate =
        lowRateAccounts.reduce((s, a) => s + (a.interestRate ?? 0), 0) / lowRateAccounts.length;
      const annualValue = Math.round(totalIdle * (0.045 - avgRate));
      return {
        title: 'Idle cash earning below inflation',
        body: `£${totalIdle.toLocaleString()} in savings is earning just ${(avgRate * 100).toFixed(1)}% — below the current best easy-access rate of ~4.5%. Moving to a higher-rate account could earn an extra ~£${annualValue.toLocaleString()} per year.`,
        estimatedAnnualValue: annualValue,
        priority: 'high',
      };
    },
  },
  {
    id: 'isa_allowance',
    title: 'ISA allowance not fully used',
    priority: 'high',
    evaluate({ accounts, settings }) {
      const isaAccounts = accounts.filter(
        a => (a.type === 'isa_cash' || a.type === 'isa_stocks') && a.isActive,
      );
      const totalISA = isaAccounts.reduce((s, a) => s + a.balance, 0);
      const annualAllowance = 20000;
      const taxYearStart = new Date();
      taxYearStart.setMonth(3);
      taxYearStart.setDate(6); // April 6
      if (taxYearStart > new Date()) taxYearStart.setFullYear(taxYearStart.getFullYear() - 1);
      const today = new Date();
      const yearEnd = new Date(taxYearStart.getFullYear() + 1, 3, 5);
      const daysLeft = Math.ceil((yearEnd.getTime() - today.getTime()) / 86400000);
      const headroom = Math.max(0, annualAllowance - (totalISA > annualAllowance ? annualAllowance : 0));
      if (headroom < 1000 || daysLeft < 30) return null;
      const annualValue = Math.round(
        headroom *
          settings.projection.effectiveTaxRate *
          settings.projection.investmentReturnRealAnnual,
      );
      return {
        title: 'ISA allowance not fully used',
        body: `You have £${headroom.toLocaleString()} of ISA allowance remaining with ${daysLeft} days left in the tax year. Contributing now shelters future gains from tax.`,
        estimatedAnnualValue: annualValue,
        priority: 'high',
      };
    },
  },
  {
    id: 'mortgage_overpayment',
    title: 'Overpay mortgage to save interest',
    priority: 'medium',
    evaluate({ liabilities, accounts, monthlyExpenses }) {
      const mortgage = liabilities.find(l => l.type === 'mortgage');
      if (!mortgage) return null;
      const liquidCash = accounts
        .filter(a => ['current', 'savings'].includes(a.type))
        .reduce((s, a) => s + a.balance, 0);
      const surplus = liquidCash - monthlyExpenses * 3;
      if (surplus < 200) return null;
      const monthlyOverpay = Math.min(
        surplus * 0.3,
        (mortgage.outstandingBalance * 0.1) / 12,
      );
      const interestSaved = Math.round(
        monthlyOverpay * 12 * (mortgage.outstandingBalance / (mortgage.monthlyPayment * 12)),
      );
      return {
        title: 'Overpay mortgage to save interest',
        body: `Overpaying £${Math.round(monthlyOverpay).toLocaleString()}/month could save ~£${interestSaved.toLocaleString()} in total interest and cut years off your mortgage term.`,
        estimatedAnnualValue: Math.round(monthlyOverpay * mortgage.interestRate),
        priority: 'medium',
      };
    },
  },
  {
    id: 'emergency_fund_low',
    title: 'Emergency fund below 3 months',
    priority: 'high',
    evaluate({ goals, monthlyExpenses }) {
      const efGoal = goals.find(g => g.type === 'emergency_fund');
      if (!efGoal) return null;
      const coverage = efGoal.currentAmount / Math.max(monthlyExpenses, 1);
      if (coverage >= 3) return null;
      const gap = monthlyExpenses * 3 - efGoal.currentAmount;
      return {
        title: 'Emergency fund below 3 months',
        body: `Your emergency fund covers ${coverage.toFixed(1)} months of expenses. Financial advisors recommend at least 3 months. Top up by £${Math.round(gap).toLocaleString()} to reach this target.`,
        priority: 'high',
      };
    },
  },
  {
    id: 'pension_undercontrib',
    title: 'Leaving employer match on table',
    priority: 'high',
    evaluate({ settings }) {
      const contrib = settings.projection.pensionContributionRate;
      const match = settings.projection.employerMatchRate;
      if (contrib >= match) return null;
      const gap = (match - contrib) * settings.primaryIncome * 12;
      return {
        title: 'Leaving employer match on table',
        body: `Your pension contribution rate (${(contrib * 100).toFixed(0)}%) is below your employer match rate (${(match * 100).toFixed(0)}%). Increasing contributions to ${(match * 100).toFixed(0)}% would unlock an extra £${Math.round(gap).toLocaleString()}/year in free employer contributions.`,
        estimatedAnnualValue: gap,
        priority: 'high',
      };
    },
  },
  {
    id: 'goal_off_track',
    title: 'Goal off track',
    priority: 'medium',
    evaluate({ goals }) {
      const offTrack = goals.filter(g => {
        if (g.isAchieved) return false;
        const monthsLeft = Math.max(
          1,
          (new Date(g.targetDate).getTime() - Date.now()) / (30 * 86400000),
        );
        const neededMonthly = (g.targetAmount - g.currentAmount) / monthsLeft;
        return neededMonthly > g.monthlyContribution * 1.15;
      });
      if (!offTrack.length) return null;
      const goal = offTrack[0];
      const monthsLeft = Math.max(
        1,
        (new Date(goal.targetDate).getTime() - Date.now()) / (30 * 86400000),
      );
      const needed = Math.ceil((goal.targetAmount - goal.currentAmount) / monthsLeft);
      return {
        title: `Goal off track: ${goal.name}`,
        body: `"${goal.name}" needs £${needed.toLocaleString()}/month but only £${goal.monthlyContribution.toLocaleString()}/month is allocated. Consider increasing contributions or extending the deadline.`,
        priority: 'medium',
      };
    },
  },
  {
    id: 'debt_high_rate',
    title: 'High-interest debt detected',
    priority: 'high',
    evaluate({ liabilities }) {
      const highRate = liabilities.filter(l => l.type !== 'mortgage' && l.interestRate > 0.08);
      if (!highRate.length) return null;
      const totalCost = highRate.reduce(
        (s, l) => s + l.outstandingBalance * l.interestRate,
        0,
      );
      return {
        title: 'High-interest debt detected',
        body: `You have £${highRate.reduce((s, l) => s + l.outstandingBalance, 0).toLocaleString()} in high-rate debt (above 8%). This costs ~£${Math.round(totalCost).toLocaleString()}/year in interest. Paying this down first maximises net worth.`,
        estimatedAnnualValue: Math.round(totalCost),
        priority: 'high',
      };
    },
  },
];

export function generateRecommendations(data: RecommendationData): RecommendationOutput[] {
  return RECOMMENDATION_RULES.map(rule => rule.evaluate(data))
    .filter((r): r is RecommendationOutput => r !== null)
    .sort((a, b) => {
      const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      return (b.estimatedAnnualValue ?? 0) - (a.estimatedAnnualValue ?? 0);
    });
}
