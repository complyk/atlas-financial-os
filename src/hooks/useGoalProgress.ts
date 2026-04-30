import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';

export function useGoalProgress(goalId?: string) {
  return useLiveQuery(async () => {
    const goals = goalId
      ? await db.goals.where('id').equals(goalId).toArray()
      : await db.goals.toArray();
    return goals.map(g => {
      const progress = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
      const monthsLeft = Math.max(1, (new Date(g.targetDate).getTime() - Date.now()) / (30 * 86400000));
      const neededMonthly = (g.targetAmount - g.currentAmount) / monthsLeft;
      const onTrack = g.monthlyContribution >= neededMonthly * 0.9;
      return { ...g, progress, monthsLeft, neededMonthly, onTrack };
    });
  }, [goalId]);
}
