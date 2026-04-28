/**
 * useDashboardData — combined fetch productivity + workload untuk F8/F13.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  fetchProductivityMetrics,
  fetchWorkloadSummary,
  type ProductivityMetrics,
  type WorkloadSummary,
} from '@/lib/dashboardMetrics';

interface UseDashboardDataResult {
  productivity: ProductivityMetrics | null;
  workload: WorkloadSummary | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDashboardData(
  teamId: string | null = null,
  periodDays = 30,
): UseDashboardDataResult {
  const [productivity, setProductivity] = useState<ProductivityMetrics | null>(null);
  const [workload, setWorkload] = useState<WorkloadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pm, wl] = await Promise.all([
        fetchProductivityMetrics(teamId, periodDays),
        fetchWorkloadSummary(teamId),
      ]);
      setProductivity(pm);
      setWorkload(wl);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Gagal load dashboard'));
    } finally {
      setLoading(false);
    }
  }, [teamId, periodDays]);

  useEffect(() => {
    void load();
  }, [load]);

  return { productivity, workload, loading, error, refetch: load };
}
