/**
 * useNotifications — fetch + polling 30s notif unread count + list.
 *
 * Sprint 3 pattern: simple polling. Sprint 4+ upgrade ke Supabase
 * Realtime broadcast (subscribe 'notifications' channel via filter
 * user_id=eq.{auth.uid()}).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from '@/lib/notifications';

const POLL_INTERVAL_MS = 30_000;

interface UseNotificationsResult {
  notifications: NotificationRow[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        fetchNotifications(10),
        fetchUnreadCount(),
      ]);
      if (!mountedRef.current) return;
      setNotifications(list);
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error('Gagal load notif'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [load]);

  const markRead = useCallback(
    async (id: string) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(id);
      } catch (err) {
        // Rollback on error — refetch authoritative
        await load();
        throw err;
      }
    },
    [load],
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      await load();
      throw err;
    }
  }, [load]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: load,
    markRead,
    markAllRead,
  };
}
