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

      // Supabase typed select returns join targets as arrays even for single FKs.
      type CommentRow = {
        id: string;
        body: string;
        created_at: string;
        author: { full_name: string } | { full_name: string }[] | null;
        task:
          | { id: string; title: string; project_id: string }
          | { id: string; title: string; project_id: string }[]
          | null;
      };
      const pickFirst = <T,>(v: T | T[] | null): T | null =>
        Array.isArray(v) ? v[0] ?? null : v;

      const items: ActivityFeedItem[] = ((rawComments ?? []) as CommentRow[]).map(
        (row) => {
          const author = pickFirst(row.author);
          const task = pickFirst(row.task);
          return {
            id: row.id,
            type: 'comment' as const,
            user_full_name: author?.full_name ?? 'Seseorang',
            task_title: task?.title ?? '(task tidak ditemukan)',
            task_id: task?.id ?? '',
            project_id: task?.project_id ?? '',
            body: row.body,
            created_at: row.created_at,
          };
        },
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

      type TaskRow = {
        id: string;
        title: string;
        priority: string;
        deadline: string | null;
        status: string;
        project_id: string;
        project: { name: string } | { name: string }[] | null;
      };
      const pickFirst = <T,>(v: T | T[] | null): T | null =>
        Array.isArray(v) ? v[0] ?? null : v;

      const rows = (data ?? []) as unknown as TaskRow[];

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
        project_name: pickFirst(r.project)?.name ?? null,
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
