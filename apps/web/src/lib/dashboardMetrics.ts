/**
 * Dashboard metrics — RPC client wrappers + types untuk F5/F8/F13.
 *
 * Per ADR-004: RPC SECURITY INVOKER, RLS auto-scope. Client tinggal
 * call supabase.rpc(); RLS handles permission filtering.
 */
import { supabase } from '@/lib/supabase';

// ============================================================
// Productivity metrics shape (PRD §13 line 636-653)
// ============================================================

export interface CompletionRateRow {
  user_id: string;
  full_name: string;
  assigned: number;
  done: number;
  rate: number;
}

export interface VelocityRow {
  week_start: string; // ISO date
  tasks_completed: number;
}

export type BottleneckAgeBucket = '<=3d' | '4-7d' | '>7d';

export interface BottleneckRow {
  status: string;
  age_bucket: BottleneckAgeBucket;
  count: number;
}

export interface ProductivityMetrics {
  scope: 'all' | 'team';
  team_id: string | null;
  period_days: number;
  completion_rate_per_user: CompletionRateRow[];
  velocity_per_week: VelocityRow[];
  on_time_delivery_rate: number;
  avg_cycle_time_days: number;
  bottleneck_heatmap: BottleneckRow[];
}

export async function fetchProductivityMetrics(
  teamId: string | null = null,
  periodDays = 30,
): Promise<ProductivityMetrics> {
  const { data, error } = await supabase.rpc('get_productivity_metrics', {
    p_team_id: teamId,
    p_period_days: periodDays,
  });
  if (error) throw error;
  return data as ProductivityMetrics;
}

// ============================================================
// Workload summary (PRD §13 line 615-629)
// ============================================================

export type LoadIndicator = 'normal' | 'high' | 'overloaded';

export interface WorkloadMember {
  user_id: string;
  full_name: string;
  open_tasks: number;
  overdue: number;
  high_priority: number;
  load_indicator: LoadIndicator;
}

export interface WorkloadSummary {
  team_id: string | null;
  threshold: number;
  members: WorkloadMember[];
}

export async function fetchWorkloadSummary(
  teamId: string | null = null,
): Promise<WorkloadSummary> {
  const { data, error } = await supabase.rpc('get_workload_summary', {
    p_team_id: teamId,
  });
  if (error) throw error;
  return data as WorkloadSummary;
}

// ============================================================
// Helper: aggregated totals untuk F8 quick-view tiles
// ============================================================

export interface DashboardSummary {
  totalOpenTasks: number;
  totalOverdue: number;
  completionRatePct: number; // 0-100
  onTimeDeliveryPct: number;
  bottleneckCount: number;
  totalMembers: number;
  overloadedMembers: number;
}

export function summarize(
  productivity: ProductivityMetrics,
  workload: WorkloadSummary,
): DashboardSummary {
  const totalOpenTasks = workload.members.reduce(
    (sum, m) => sum + m.open_tasks,
    0,
  );
  const totalOverdue = workload.members.reduce(
    (sum, m) => sum + m.overdue,
    0,
  );

  // Aggregate completion rate dari per-user data — average rate weighted by assigned
  let totalAssigned = 0;
  let totalDone = 0;
  for (const u of productivity.completion_rate_per_user) {
    totalAssigned += u.assigned;
    totalDone += u.done;
  }
  const completionRatePct =
    totalAssigned > 0 ? Math.round((totalDone / totalAssigned) * 100) : 0;

  const bottleneckCount = productivity.bottleneck_heatmap
    .filter((b) => b.age_bucket === '>7d' || b.age_bucket === '4-7d')
    .reduce((sum, b) => sum + b.count, 0);

  const overloadedMembers = workload.members.filter(
    (m) => m.load_indicator === 'overloaded',
  ).length;

  return {
    totalOpenTasks,
    totalOverdue,
    completionRatePct,
    onTimeDeliveryPct: Math.round(productivity.on_time_delivery_rate * 100),
    bottleneckCount,
    totalMembers: workload.members.length,
    overloadedMembers,
  };
}
