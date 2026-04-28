import { describe, expect, it } from 'vitest';
import {
  summarize,
  type ProductivityMetrics,
  type WorkloadSummary,
} from './dashboardMetrics';

const samplePM: ProductivityMetrics = {
  scope: 'team',
  team_id: 'team-a',
  period_days: 30,
  completion_rate_per_user: [
    { user_id: 'u1', full_name: 'Andi', assigned: 10, done: 7, rate: 0.7 },
    { user_id: 'u2', full_name: 'Dewi', assigned: 5, done: 3, rate: 0.6 },
  ],
  velocity_per_week: [],
  on_time_delivery_rate: 0.78,
  avg_cycle_time_days: 4.2,
  bottleneck_heatmap: [
    { status: 'review', age_bucket: '<=3d', count: 3 },
    { status: 'review', age_bucket: '4-7d', count: 2 },
    { status: 'review', age_bucket: '>7d', count: 5 },
  ],
};

const sampleWL: WorkloadSummary = {
  team_id: 'team-a',
  threshold: 10,
  members: [
    {
      user_id: 'u1',
      full_name: 'Andi',
      open_tasks: 8,
      overdue: 2,
      high_priority: 1,
      load_indicator: 'high',
    },
    {
      user_id: 'u2',
      full_name: 'Dewi',
      open_tasks: 12,
      overdue: 1,
      high_priority: 3,
      load_indicator: 'overloaded',
    },
  ],
};

describe('summarize', () => {
  it('aggregate total open tasks across members', () => {
    const s = summarize(samplePM, sampleWL);
    expect(s.totalOpenTasks).toBe(20);
  });

  it('aggregate total overdue', () => {
    const s = summarize(samplePM, sampleWL);
    expect(s.totalOverdue).toBe(3);
  });

  it('compute completion rate weighted (10 done out of 15 assigned = 67%)', () => {
    const s = summarize(samplePM, sampleWL);
    expect(s.completionRatePct).toBe(67);
  });

  it('on-time delivery percent rounded', () => {
    const s = summarize(samplePM, sampleWL);
    expect(s.onTimeDeliveryPct).toBe(78);
  });

  it('bottleneck count = sum of (4-7d + >7d) buckets', () => {
    const s = summarize(samplePM, sampleWL);
    expect(s.bottleneckCount).toBe(7);
  });

  it('overloaded members count', () => {
    const s = summarize(samplePM, sampleWL);
    expect(s.overloadedMembers).toBe(1);
    expect(s.totalMembers).toBe(2);
  });

  it('zero assignments → completion rate 0', () => {
    const empty: ProductivityMetrics = {
      ...samplePM,
      completion_rate_per_user: [],
    };
    const s = summarize(empty, sampleWL);
    expect(s.completionRatePct).toBe(0);
  });
});
