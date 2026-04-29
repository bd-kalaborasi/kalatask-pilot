/**
 * useNotifications — Realtime subscription + polling fallback.
 *
 * Sprint 4.5 Step 8 (ADR-008): replaces 30s polling pattern dengan
 * Supabase Realtime broadcast subscribed to user-scoped channel.
 * Polling fallback retained kalau Realtime channel disconnect (graceful
 * degradation). Polling interval increased ke 60s saat Realtime active
 * (heartbeat only).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from '@/lib/notifications';

// Heartbeat poll — Realtime is primary path, polling as safety net
const POLL_INTERVAL_MS = 60_000;

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
  const { profile } = useAuth();
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

    // Heartbeat poll (60s) — safety net kalau Realtime disconnect
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS);

    // Realtime subscribe per ADR-008 (channel scoped per user)
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (profile) {
      channel = supabase
        .channel(`user:${profile.id}:notifications`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profile.id}`,
          },
          (payload) => {
            if (!mountedRef.current) return;
            const newRow = payload.new as NotificationRow;
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newRow.id)) return prev;
              return [newRow, ...prev].slice(0, 10);
            });
            if (!newRow.is_read) {
              setUnreadCount((c) => c + 1);
            }
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profile.id}`,
          },
          (payload) => {
            if (!mountedRef.current) return;
            const updated = payload.new as NotificationRow;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n)),
            );
            // Refetch unread count (cheaper than tracking diff)
            void fetchUnreadCount().then((c) => {
              if (mountedRef.current) setUnreadCount(c);
            });
          },
        )
        .subscribe();
    }

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [load, profile]);

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
