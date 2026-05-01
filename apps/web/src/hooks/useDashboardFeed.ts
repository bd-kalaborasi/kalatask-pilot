/**
 * useDashboardFeed — derived activity feed + per-user priorities.
 *
 * R4 Phase B: replaces R3 EmptyState placeholders on DashboardPage.
 * Sources existing schema (no new tables needed):
 * - Activity: recent comments + recent task status changes (joined)
 * - Priorities: user's tasks ordered by priority desc, deadline asc
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ActivityFeedItem {
  id: string;
  type: 'comment' | 'task_update';
  user_full_name: string;
  task_title: string;
  task_id: string;
  project_id: string;
  body?: string;
  created_at: string;
}

export interface PriorityTask {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: string | null;
  status: string;
  project_id: string;
  project_name: string | null;
}

export function useDashboardFeed(limit = 6): {
  feed: ActivityFeedItem[];
  loading: boolean;
} {
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void (async () => {
      // Recent comments with task + author context (RLS-aware)
      const { data: rawComments } = await supabase
        .from('comments')
        .select(
          'id, body, created_at, author:users!comments_author_id_fkey (full_name), task:tasks!comments_task_id_fkey (id, title, project_id)',
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      const items: ActivityFeedItem[] = (rawComments ?? []).map(
        (row: {
          id: string;
          body: string;
          created_at: string;
          author: { full_name: string } | null;
          task: { id: string; title: string; project_id: string } | null;
        }) => ({
          id: row.id,
          type: 'comment' as const,
          user_full_name: row.author?.full_name ?? 'Seseorang',
          task_title: row.task?.title ?? '(task tidak ditemukan)',
          task_id: row.task?.id ?? '',
          project_id: row.task?.project_id ?? '',
          body: row.body,
          created_at: row.created_at,
        }),
      );

      if (mounted) {
        setFeed(items);
        setLoading(false);
      }
    })().catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [limit]);

  return { feed, loading };
}

const PRIORITY_RANK: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function useUserPriorities(userId: string | null, limit = 4): {
  priorities: PriorityTask[];
  loading: boolean;
} {
  const [priorities, setPriorities] = useState<PriorityTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    void (async () => {
      // Open tasks (not done) for this user, with project context (RLS).
      const { data } = await supabase
        .from('tasks')
        .select(
          'id, title, priority, deadline, status, project_id, project:projects!tasks_project_id_fkey (name)',
        )
        .eq('assignee_id', userId)
        .neq('status', 'done')
        .order('deadline', { ascending: true, nullsFirst: false });

      const rows = (data ?? []) as Array<{
        id: string;
        title: string;
        priority: string;
        deadline: string | null;
        status: string;
        project_id: string;
        project: { name: string } | null;
      }>;

      // Sort: priority desc, then deadline asc (already pre-sorted by deadline)
      rows.sort(
        (a, b) =>
          (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0),
      );

      const sliced: PriorityTask[] = rows.slice(0, limit).map((r) => ({
        id: r.id,
        title: r.title,
        priority: r.priority as PriorityTask['priority'],
        deadline: r.deadline,
        status: r.status,
        project_id: r.project_id,
        project_name: r.project?.name ?? null,
      }));

      if (mounted) {
        setPriorities(sliced);
        setLoading(false);
      }
    })().catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [userId, limit]);

  return { priorities, loading };
}
