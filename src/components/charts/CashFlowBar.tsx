import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatCurrency, formatCompact } from '../../lib/format';
import { useAppStore } from '../../stores/useAppStore';

interface DataPoint { month: string; income: number; expenses: number; }
interface CashFlowBarProps { data: DataPoint[]; height?: number; }

export function CashFlowBar({ data, height = 240 }: CashFlowBarProps) {
  const { currency, locale } = useAppStore();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="month" tickFormatter={m => { try { return format(parseISO(m + '-01'), 'MMM'); } catch { return m; } }} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => formatCompact(v)} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={56} />
        <Tooltip formatter={(v: number, n: string) => [formatCurrency(v, currency, locale, true), n]} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
        <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-secondary)' }} />
        <Bar dataKey="income" name="Income" fill="var(--color-positive)" radius={[4,4,0,0]} maxBarSize={32} />
        <Bar dataKey="expenses" name="Expenses" fill="var(--color-negative)" radius={[4,4,0,0]} maxBarSize={32} opacity={0.8} />
      </BarChart>
    </ResponsiveContainer>
  );
}
