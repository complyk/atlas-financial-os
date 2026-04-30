import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatCurrency, formatCompact } from '../../lib/format';
import { useAppStore } from '../../stores/useAppStore';

interface DataPoint { date: string; netWorth: number; }
interface NetWorthChartProps { data: DataPoint[]; height?: number; sparkline?: boolean; }

export function NetWorthChart({ data, height = 200, sparkline }: NetWorthChartProps) {
  const { currency, locale } = useAppStore();
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: sparkline ? -40 : 0, bottom: 0 }}>
        <defs>
          <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {!sparkline && <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />}
        {!sparkline && <XAxis dataKey="date" tickFormatter={d => { try { return format(parseISO(d + '-01'), 'MMM yy'); } catch { return d; } }} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />}
        {!sparkline && <YAxis tickFormatter={v => formatCompact(v)} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={60} />}
        {!sparkline && <Tooltip formatter={(v: number) => [formatCurrency(v, currency, locale), 'Net Worth']} labelFormatter={l => { try { return format(parseISO(l + '-01'), 'MMMM yyyy'); } catch { return l; } }} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />}
        <Area type="monotone" dataKey="netWorth" stroke="var(--color-accent)" strokeWidth={sparkline ? 1.5 : 2} fill="url(#nwGrad)" dot={false} isAnimationActive />
      </AreaChart>
    </ResponsiveContainer>
  );
}
