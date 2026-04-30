import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface GoalGaugeProps { progress: number; size?: number; color?: string; }

export function GoalGauge({ progress, size = 80, color = 'var(--color-accent)' }: GoalGaugeProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const data = [{ value: clamped * 100, fill: color }];
  return (
    <ResponsiveContainer width={size} height={size}>
      <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={data} barSize={8}>
        <RadialBar dataKey="value" background={{ fill: 'var(--color-surface-raised)' }} cornerRadius={4} isAnimationActive />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}
