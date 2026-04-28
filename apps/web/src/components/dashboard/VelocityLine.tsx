/**
 * VelocityLine — Recharts LineChart 8 minggu trend.
 * F13 AC-6.
 */
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { VelocityRow } from '@/lib/dashboardMetrics';
import { formatDateID } from '@/lib/formatDate';

interface Props {
  data: VelocityRow[];
}

export function VelocityLine({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada data velocity untuk 8 minggu terakhir.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    week: formatDateID(d.week_start),
    completed: d.tasks_completed,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart
        data={chartData}
        margin={{ top: 16, right: 16, bottom: 16, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="week" fontSize={11} />
        <YAxis fontSize={12} allowDecimals={false} />
        <Tooltip
          formatter={(value) => [`${String(value)} task`, 'Completed'] as [string, string]}
        />
        <Line
          type="monotone"
          dataKey="completed"
          name="Tasks Completed"
          stroke="#0060A0"
          strokeWidth={2}
          dot={{ fill: '#0060A0', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
