import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatPercentPlain } from '../../lib/format';

interface Slice { name: string; value: number; color?: string; }
interface AllocationPieProps { data: Slice[]; height?: number; }

const COLORS = ['var(--color-chart-1)','var(--color-chart-2)','var(--color-chart-3)','var(--color-chart-4)','var(--color-chart-5)','var(--color-chart-6)'];

export function AllocationPie({ data, height = 200 }: AllocationPieProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={2} dataKey="value" isAnimationActive>
          {data.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number, n: string) => [formatPercentPlain(v / total), n]} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }} />
        <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--color-text-secondary)' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
