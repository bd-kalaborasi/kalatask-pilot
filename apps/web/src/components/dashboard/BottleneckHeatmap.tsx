/**
 * BottleneckHeatmap — grid status × age_bucket × count.
 * F13 PRD §13 line 649-651. Visual: cell background intensity by count.
 */
import { cn } from '@/lib/utils';
import type { BottleneckAgeBucket, BottleneckRow } from '@/lib/dashboardMetrics';

interface Props {
  data: BottleneckRow[];
}

const STATUS_ORDER = ['todo', 'in_progress', 'review'] as const;
const AGE_ORDER: BottleneckAgeBucket[] = ['<=3d', '4-7d', '>7d'];

const STATUS_LABEL: Record<string, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
};

function intensityClass(count: number): string {
  if (count === 0) return 'bg-zinc-50 text-zinc-400';
  if (count <= 2) return 'bg-amber-50 text-amber-700';
  if (count <= 5) return 'bg-amber-200 text-amber-900';
  return 'bg-red-200 text-red-900';
}

export function BottleneckHeatmap({ data }: Props) {
  // Build lookup: { [status][age_bucket]: count }
  const lookup = new Map<string, Map<string, number>>();
  for (const row of data) {
    const inner = lookup.get(row.status) ?? new Map<string, number>();
    inner.set(row.age_bucket, row.count);
    lookup.set(row.status, inner);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left font-medium text-xs uppercase tracking-wide text-muted-foreground py-2 pr-4">
              Status
            </th>
            {AGE_ORDER.map((age) => (
              <th
                key={age}
                className="text-center font-medium text-xs uppercase tracking-wide text-muted-foreground py-2 px-2"
              >
                {age}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STATUS_ORDER.map((status) => (
            <tr key={status} className="border-t">
              <td className="py-2 pr-4 font-medium">{STATUS_LABEL[status]}</td>
              {AGE_ORDER.map((age) => {
                const count = lookup.get(status)?.get(age) ?? 0;
                return (
                  <td key={age} className="px-1 py-1">
                    <div
                      className={cn(
                        'rounded-md px-3 py-2 text-center font-mono text-sm',
                        intensityClass(count),
                      )}
                    >
                      {count}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground mt-2">
        Cell color: zinc=0, amber=1-5, red=&gt;5 task. &gt;7d bucket = task stuck di status non-final.
      </p>
    </div>
  );
}
