/**
 * GanttView — read-only Gantt chart via frappe-gantt v1.2.2.
 *
 * F3 AC-3 (PRD line 205):
 * - Task punya deadline + estimated_hours → bar di timeline
 * - Task tanpa estimated_hours (deadline only) → milestone (zero-duration)
 * - Task tanpa deadline → tidak di-render di Gantt (skip)
 *
 * Read-only: per ADR-003 + PRD F3 — drag-resize ditunda Phase 2.
 * Dependencies tidak di-render (out of scope pilot per PRD §3.3 line 179).
 *
 * CSS scoping (ADR-003 mitigation R4): wrapper class `.kt-gantt-wrapper`
 * isolate frappe styles dari Tailwind utilities. frappe-gantt CSS
 * di-import lazy via dynamic import untuk tidak bloat initial bundle.
 */
import { useEffect, useMemo, useRef } from 'react';
import Gantt, {
  type GanttTaskInput,
  type GanttViewMode,
} from 'frappe-gantt';
// CSS di-vendor di src/styles/ — frappe-gantt v1.2.2 exports field
// tidak expose `./dist/frappe-gantt.css` sebagai valid specifier (strict
// Node ESM resolver). Workaround per ADR-003 mitigation: copy CSS file
// dan import dari local path. Re-validate saat upgrade frappe-gantt.
import '@/styles/frappe-gantt.css';
import { EmptyState } from '@/components/ui/empty-state';
import type { TaskWithAssignee } from '@/lib/tasks';

interface GanttViewProps {
  tasks: TaskWithAssignee[];
  viewMode?: GanttViewMode;
}

export function GanttView({ tasks, viewMode = 'Day' }: GanttViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttInstanceRef = useRef<Gantt | null>(null);

  const ganttTasks = useMemo(() => buildGanttTasks(tasks), [tasks]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (ganttTasks.length === 0) {
      // No renderable tasks — clear container, skip Gantt instantiation
      containerRef.current.innerHTML = '';
      ganttInstanceRef.current = null;
      return;
    }

    if (!ganttInstanceRef.current) {
      ganttInstanceRef.current = new Gantt(containerRef.current, ganttTasks, {
        view_mode: viewMode,
        readonly: true,
        bar_height: 24,
        bar_corner_radius: 4,
      });
    } else {
      ganttInstanceRef.current.refresh(ganttTasks);
    }

    return () => {
      // frappe-gantt tidak expose destroy() — clear container manual
      if (containerRef.current) containerRef.current.innerHTML = '';
      ganttInstanceRef.current = null;
    };
  }, [ganttTasks, viewMode]);

  if (tasks.length === 0) {
    return (
      <div className="border rounded-md bg-surface">
        <EmptyState
          icon="📅"
          title="Timeline-nya masih kosong"
          body="Buat task dengan deadline dulu, baru bar Gantt muncul di sini."
        />
      </div>
    );
  }

  if (ganttTasks.length === 0) {
    return (
      <div className="border rounded-md bg-surface">
        <EmptyState
          icon="🗓️"
          title="Belum ada task dengan deadline"
          body="Gantt butuh deadline (untuk milestone) atau deadline + estimated_hours (untuk bar). Buka detail task → set deadline."
        />
      </div>
    );
  }

  return (
    <div className="border rounded-md bg-surface p-4 overflow-x-auto kt-gantt-wrapper">
      <div ref={containerRef} />
    </div>
  );
}

/**
 * Convert KalaTask tasks ke frappe-gantt input shape.
 *
 * - Dengan estimated_hours: bar dari (deadline - durationDays) ke deadline.
 *   Asumsi 8 jam = 1 working day. Kalau ada start_date, pakai itu over
 *   estimated_hours calc.
 * - Tanpa estimated_hours: milestone (start = end = deadline).
 * - Tanpa deadline: skip (tidak di-render).
 */
export function buildGanttTasks(
  tasks: TaskWithAssignee[],
): GanttTaskInput[] {
  const result: GanttTaskInput[] = [];
  for (const t of tasks) {
    if (!t.deadline) continue;
    const isMilestone = t.estimated_hours == null;
    const end = t.deadline;
    let start = end;
    if (!isMilestone) {
      start = t.start_date ?? deriveStartFromHours(t.deadline, t.estimated_hours!);
    }
    result.push({
      id: t.id,
      name: t.title,
      start,
      end,
      progress: t.status === 'done' ? 100 : computeProgress(t.status),
      custom_class: isMilestone ? 'bar-milestone' : undefined,
    });
  }
  return result;
}

function deriveStartFromHours(deadlineISO: string, hours: number): string {
  const HOURS_PER_DAY = 8; // simple assumption; configurable di app_settings Sprint 3+
  const days = Math.max(1, Math.ceil(hours / HOURS_PER_DAY));
  const end = new Date(deadlineISO);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  // ISO YYYY-MM-DD
  return formatYYYYMMDD(start);
}

function formatYYYYMMDD(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function computeProgress(status: string): number {
  switch (status) {
    case 'todo':
      return 0;
    case 'in_progress':
      return 40;
    case 'review':
      return 80;
    case 'done':
      return 100;
    case 'blocked':
      return 0;
    default:
      return 0;
  }
}
