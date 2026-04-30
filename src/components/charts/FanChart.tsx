import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { BandDataPoint } from '../../lib/projections';
import { formatCurrency, formatCompact } from '../../lib/format';
import { useAppStore } from '../../stores/useAppStore';

interface FanChartProps { data: BandDataPoint[]; height?: number; }

export function FanChart({ data, height = 340 }: FanChartProps) {
  const { currency, locale } = useAppStore();
  if (!data.length) return null;
  const chartData = data.map(d => ({
    date: d.date,
    p5: d.p5,
    p5_25: d.p25 - d.p5,
    p25_50: d.p50 - d.p25,
    p50_75: d.p75 - d.p50,
    p75_95: d.p95 - d.p75,
    p50: d.p50,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {['outer','mid-outer','mid','mid-inner'].map((id, i) => (
            <linearGradient key={id} id={`fan-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.08 + i * 0.06} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.04 + i * 0.03} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={d => { try { return format(parseISO(d + '-01'), 'yyyy'); } catch { return d; } }} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} interval={23} />
        <YAxis tickFormatter={v => formatCompact(v)} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={64} />
        <Tooltip
          formatter={(v: number, name: string) => {
            const labels: Record<string,string> = { p5: 'P5', p5_25: 'P5–P25', p25_50: 'P25–P50', p50_75: 'P50–P75', p75_95: 'P75–P95', p50: 'Median' };
            return [formatCurrency(v, currency, locale, true), labels[name] || name];
          }}
          labelFormatter={l => { try { return format(parseISO(l + '-01'), 'MMMM yyyy'); } catch { return l; } }}
          contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }}
        />
        <Area type="monotone" dataKey="p5" stackId="fan" stroke="none" fill="transparent" dot={false} legendType="none" />
        <Area type="monotone" dataKey="p5_25" stackId="fan" stroke="none" fill="url(#fan-outer)" dot={false} legendType="none" />
        <Area type="monotone" dataKey="p25_50" stackId="fan" stroke="none" fill="url(#fan-mid-outer)" dot={false} legendType="none" />
        <Area type="monotone" dataKey="p50_75" stackId="fan" stroke="none" fill="url(#fan-mid)" dot={false} legendType="none" />
        <Area type="monotone" dataKey="p75_95" stackId="fan" stroke="none" fill="url(#fan-mid-inner)" dot={false} legendType="none" />
        <Area type="monotone" dataKey="p50" stroke="var(--color-accent)" strokeWidth={2} fill="transparent" dot={false} name="Median" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
