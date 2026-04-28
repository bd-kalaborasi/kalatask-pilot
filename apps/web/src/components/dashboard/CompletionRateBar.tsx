/**
 * CompletionRateBar — Recharts BarChart per-user completion rate.
 * F13 AC-5.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CompletionRateRow } from '@/lib/dashboardMetrics';

interface Props {
  data: CompletionRateRow[];
}

export function CompletionRateBar({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada data per user untuk periode ini.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    name: d.full_name,
    rate: Math.round(d.rate * 100),
    done: d.done,
    assigned: d.assigned,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        margin={{ top: 16, right: 16, bottom: 16, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" fontSize={12} />
        <YAxis fontSize={12} domain={[0, 100]} unit="%" />
        <Tooltip
          formatter={(value, _name, item) => {
            const payload = (item as { payload?: { done?: number; assigned?: number } }).payload;
            return [
              `${String(value)}% (${payload?.done ?? 0}/${payload?.assigned ?? 0})`,
              'Completion',
            ] as [string, string];
          }}
        />
        <Bar dataKey="rate" name="Completion Rate" radius={[4, 4, 0, 0]}>
          {chartData.map((d, i) => (
            <Cell
              key={i}
              fill={d.rate >= 70 ? '#10b981' : d.rate >= 40 ? '#f59e0b' : '#ef4444'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
