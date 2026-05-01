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
    title: 'Idle cash earning below top UAE rates',
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
      // UAE-realistic top easy-access savings rate (Wio, Mashreq Neo, ADIB Smart Saver)
      const benchmarkRate = 0.04;
      const annualValue = Math.round(totalIdle * (benchmarkRate - avgRate));
      return {
        title: 'Idle cash earning below top UAE rates',
        body: `AED ${totalIdle.toLocaleString()} in savings is earning just ${(avgRate * 100).toFixed(1)}% — below the top UAE easy-access rate of ~4.0% (Wio, Mashreq Neo, ADIB Smart Saver). Moving to a higher-rate account could earn an extra ~AED ${annualValue.toLocaleString()} per year.`,
        estimatedAnnualValue: annualValue,
        priority: 'high',
      };
    },
  },
  {
    id: 'fx_concentration',
    title: 'High AED concentration in liquid assets',
    priority: 'medium',
    evaluate({ accounts }) {
      const liquidAccounts = accounts.filter(
        a => a.isActive && ['current', 'savings', 'cash'].includes(a.type),
      );
      const totalLiquid = liquidAccounts.reduce((s, a) => s + a.balance, 0);
      if (totalLiquid <= 100000) return null;
      const aedLiquid = liquidAccounts
        .filter(a => (a.currency ?? 'AED') === 'AED')
        .reduce((s, a) => s + a.balance, 0);
      const aedShare = aedLiquid / totalLiquid;
      if (aedShare <= 0.7) return null;
      const targetUSD = Math.round(totalLiquid * 0.25);
      return {
        title: 'High AED concentration in liquid assets',
        body: `${(aedShare * 100).toFixed(0)}% of your liquid AED ${Math.round(totalLiquid).toLocaleString()} is held in AED. The dirham is pegged to the USD, but holding everything in one currency leaves you exposed to imported inflation and limits flexibility if you ever leave the UAE. Consider diversifying ~AED ${targetUSD.toLocaleString()} into USD or EUR multi-currency accounts.`,
        priority: 'medium',
      };
    },
  },
  {
    id: 'gratuity_planning',
    title: 'Supplement end-of-service gratuity',
    priority: 'medium',
    evaluate({ accounts, settings }) {
      // If primary income exists but there's no DC pension/retirement vehicle,
      // gratuity alone is unlikely to fund retirement.
      if (!settings.primaryIncome || settings.primaryIncome <= 0) return null;
      const hasPension = accounts.some(
        a => a.isActive && (a.type === 'pension_dc' || a.type === 'pension_db'),
      );
      const hasInvestment = accounts.some(a => a.isActive && a.type === 'investment');
      if (hasPension && hasInvestment) return null;
      const monthlyTarget = Math.round((settings.primaryIncome * 0.10) / 12);
      return {
        title: 'Supplement end-of-service gratuity',
        body: `UAE end-of-service gratuity caps at ~2 years of basic salary regardless of tenure — far below what you need for retirement. ${hasPension ? 'Consider adding a private investment account' : 'You currently have no dedicated retirement vehicle'}. Aim to contribute ~AED ${monthlyTarget.toLocaleString()}/month (≈10% of gross income) into an offshore brokerage or DIFC pension scheme.`,
        priority: 'medium',
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
        body: `Overpaying AED ${Math.round(monthlyOverpay).toLocaleString()}/month could save ~AED ${interestSaved.toLocaleString()} in total interest and cut years off your mortgage term.`,
        estimatedAnnualValue: Math.round(monthlyOverpay * mortgage.interestRate),
        priority: 'medium',
      };
    },
  },
  {
    id: 'emergency_fund_low',
    title: 'Emergency fund below 6 months',
    priority: 'high',
    evaluate({ goals, monthlyExpenses }) {
      const efGoal = goals.find(g => g.type === 'emergency_fund');
      if (!efGoal) return null;
      const coverage = efGoal.currentAmount / Math.max(monthlyExpenses, 1);
      if (coverage >= 6) return null;
      const gap = monthlyExpenses * 6 - efGoal.currentAmount;
      return {
        title: 'Emergency fund below 6 months',
        body: `Your emergency fund covers ${coverage.toFixed(1)} months of expenses. The UAE has no unemployment benefit or welfare safety net, so 6 months of expenses is a more prudent buffer than the typical 3. Top up by AED ${Math.round(gap).toLocaleString()} to reach this target.`,
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
        body: `Your pension contribution rate (${(contrib * 100).toFixed(0)}%) is below your employer match rate (${(match * 100).toFixed(0)}%). Increasing contributions to ${(match * 100).toFixed(0)}% would unlock an extra AED ${Math.round(gap).toLocaleString()}/year in free employer contributions.`,
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
        body: `"${goal.name}" needs AED ${needed.toLocaleString()}/month but only AED ${goal.monthlyContribution.toLocaleString()}/month is allocated. Consider increasing contributions or extending the deadline.`,
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
        body: `You have AED ${highRate.reduce((s, l) => s + l.outstandingBalance, 0).toLocaleString()} in high-rate debt (above 8%). This costs ~AED ${Math.round(totalCost).toLocaleString()}/year in interest. Paying this down first maximises net worth.`,
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
