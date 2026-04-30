import type { Scenario, ScenarioOverrides } from '../db/schema';
import type { ProjectionInput, ProjectionResult } from './projections';
import { runProjection } from './projections';

export interface StressTestDefinition {
  id: string;
  label: string;
  description: string;
  icon: string; // lucide icon name
  overrides: Partial<ScenarioOverrides>;
}

export interface StressTestResult {
  testId: string;
  label: string;
  netWorthAtYear5: number;
  netWorthAtYear10: number;
  deltaYear5: number;
  deltaYear10: number;
  monthsRunwayImpact: number;
  failedGoals: string[];
  minimumFix: string;
}

export const BUILT_IN_STRESS_TESTS: StressTestDefinition[] = [
  {
    id: 'job_loss_primary_3m',
    label: 'Primary income lost — 3 months',
    description: 'Complete loss of primary income for 3 months',
    icon: 'BriefcaseOff',
    overrides: {
      primaryIncomeShock: { startDate: '', durationMonths: 3, multiplier: 0 },
    },
  },
  {
    id: 'job_loss_primary_6m',
    label: 'Primary income lost — 6 months',
    description: 'Complete loss of primary income for 6 months',
    icon: 'BriefcaseOff',
    overrides: {
      primaryIncomeShock: { startDate: '', durationMonths: 6, multiplier: 0 },
    },
  },
  {
    id: 'job_loss_primary_12m',
    label: 'Primary income lost — 12 months',
    description: 'Complete loss of primary income for a year',
    icon: 'BriefcaseOff',
    overrides: {
      primaryIncomeShock: { startDate: '', durationMonths: 12, multiplier: 0 },
    },
  },
  {
    id: 'job_loss_primary_24m',
    label: 'Primary income lost — 24 months',
    description: 'Extended career break or redundancy',
    icon: 'BriefcaseOff',
    overrides: {
      primaryIncomeShock: { startDate: '', durationMonths: 24, multiplier: 0 },
    },
  },
  {
    id: 'job_loss_secondary_6m',
    label: 'Secondary income lost — 6 months',
    description: 'Secondary earner out of work for 6 months',
    icon: 'UserMinus',
    overrides: {
      secondaryIncomeShock: { startDate: '', durationMonths: 6, multiplier: 0 },
    },
  },
  {
    id: 'job_loss_both_3m',
    label: 'Both incomes lost — 3 months',
    description: 'Both earners lose income simultaneously',
    icon: 'Users',
    overrides: {
      primaryIncomeShock: { startDate: '', durationMonths: 3, multiplier: 0 },
      secondaryIncomeShock: { startDate: '', durationMonths: 3, multiplier: 0 },
    },
  },
  {
    id: 'market_crash_20',
    label: 'Markets down 20%',
    description: '20% market decline, 3-year recovery',
    icon: 'TrendingDown',
    overrides: { investmentReturnOverride: -0.20 },
  },
  {
    id: 'market_crash_40',
    label: 'Markets down 40%',
    description: '40% market decline, 5-year recovery',
    icon: 'TrendingDown',
    overrides: { investmentReturnOverride: -0.40 },
  },
  {
    id: 'inflation_spike',
    label: 'Inflation spike +3pp',
    description: 'Higher inflation for 5 years increases all costs',
    icon: 'Flame',
    overrides: { globalSpendingMultiplier: 1.15 },
  },
  {
    id: 'rate_rise_2pp',
    label: 'Rates +2pp (mortgage)',
    description: 'Interest rate rise adds to mortgage costs',
    icon: 'Percent',
    overrides: { globalSpendingMultiplier: 1.05 },
  },
  {
    id: 'medical_20k',
    label: 'Major medical cost — £20k',
    description: 'Unexpected medical or dental expense',
    icon: 'HeartPulse',
    overrides: {
      oneOffItems: [
        { id: 'med20k', date: '', amount: -20000, description: 'Medical expense' },
      ],
    },
  },
  {
    id: 'medical_100k',
    label: 'Major medical cost — £100k',
    description: 'Serious illness or private care cost',
    icon: 'HeartPulse',
    overrides: {
      oneOffItems: [
        { id: 'med100k', date: '', amount: -100000, description: 'Major medical expense' },
      ],
    },
  },
];

export function runStressTest(
  testDef: StressTestDefinition,
  baselineInput: ProjectionInput,
  baselineResult: ProjectionResult,
): StressTestResult {
  const today = new Date().toISOString().slice(0, 10);
  const overrides: ScenarioOverrides = { ...testDef.overrides };

  if (overrides.primaryIncomeShock) {
    overrides.primaryIncomeShock = { ...overrides.primaryIncomeShock, startDate: today };
  }
  if (overrides.secondaryIncomeShock) {
    overrides.secondaryIncomeShock = { ...overrides.secondaryIncomeShock, startDate: today };
  }
  if (overrides.oneOffItems) {
    overrides.oneOffItems = overrides.oneOffItems.map(item => ({ ...item, date: today }));
  }

  const stressScenario: Scenario = {
    ...baselineInput.scenario,
    id: 'stress_' + testDef.id,
    overrides,
  };

  const stressInput: ProjectionInput = { ...baselineInput, scenario: stressScenario };
  const stressResult = runProjection(stressInput);

  const y5Base =
    baselineResult.monthlyPath[Math.min(59, baselineResult.monthlyPath.length - 1)]?.netWorth ?? 0;
  const y10Base =
    baselineResult.monthlyPath[Math.min(119, baselineResult.monthlyPath.length - 1)]?.netWorth ?? 0;
  const y5Stress =
    stressResult.monthlyPath[Math.min(59, stressResult.monthlyPath.length - 1)]?.netWorth ?? 0;
  const y10Stress =
    stressResult.monthlyPath[Math.min(119, stressResult.monthlyPath.length - 1)]?.netWorth ?? 0;

  // Find months until runway hits zero
  let runwayMonths = stressResult.monthlyPath.length;
  for (let i = 0; i < stressResult.monthlyPath.length; i++) {
    if (stressResult.monthlyPath[i].netWorth < 0) {
      runwayMonths = i;
      break;
    }
  }
  const baseRunwayMonths = baselineResult.monthlyPath.length;
  const runwayImpact = baseRunwayMonths - runwayMonths;

  // Failed goals
  const failedGoals: string[] = [];
  for (const [goalId, prob] of Object.entries(stressResult.probabilityOfGoalMet)) {
    const baseProb = baselineResult.probabilityOfGoalMet[goalId] ?? 1;
    if (prob < 0.5 && baseProb >= 0.5) failedGoals.push(goalId);
  }

  // Minimum fix calculation
  const deficit = y5Base - y5Stress;
  const monthlyFix = deficit > 0 ? Math.ceil(deficit / 60) : 0;
  const minimumFix =
    monthlyFix > 0
      ? `Save an extra £${monthlyFix.toLocaleString()}/month for 5 years to restore baseline`
      : 'No significant impact on 5-year trajectory';

  return {
    testId: testDef.id,
    label: testDef.label,
    netWorthAtYear5: y5Stress,
    netWorthAtYear10: y10Stress,
    deltaYear5: y5Stress - y5Base,
    deltaYear10: y10Stress - y10Base,
    monthsRunwayImpact: Math.max(0, runwayImpact),
    failedGoals,
    minimumFix,
  };
}
