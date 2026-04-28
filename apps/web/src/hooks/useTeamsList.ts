import { useEffect, useState } from 'react';
import { fetchTeams, type Team } from '@/lib/teams';

interface UseTeamsListResult {
  teams: Team[];
  loading: boolean;
  error: Error | null;
}

/**
 * Fetch teams sekali saat mount. Tidak refetch — teams jarang berubah.
 */
export function useTeamsList(): UseTeamsListResult {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await fetchTeams();
        if (mounted) setTeams(result);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Gagal load teams'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { teams, loading, error };
}
