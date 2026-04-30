import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export function useCashFlow(monthsBack = 0) {
  return useLiveQuery(async () => {
    const targetMonth = subMonths(new Date(), monthsBack);
    const start = startOfMonth(targetMonth).toISOString().slice(0, 10);
    const end = endOfMonth(targetMonth).toISOString().slice(0, 10);
    const transactions = await db.transactions.where('date').between(start, end).toArray();
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const surplus = income - expenses;
    const savingsRate = income > 0 ? surplus / income : 0;
    return { income, expenses, surplus, savingsRate, transactionCount: transactions.length };
  }, [monthsBack]);
}
