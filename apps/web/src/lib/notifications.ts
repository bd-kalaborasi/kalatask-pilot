/**
 * Notifications data layer — fetch + mark-as-read + types.
 *
 * RLS: notifications strict own user_id only (per ADR-002 + Sprint 3
 * migration `20260428100100`). Client tinggal call .from('notifications'),
 * RLS auto-scope.
 */
import { supabase } from '@/lib/supabase';

export type NotificationType =
  | 'assigned'
  | 'status_done'
  | 'deadline_h3'
  | 'deadline_h1'
  | 'overdue'
  | 'mentioned'
  | 'escalation';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  task_id: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
}

const SELECT_COLUMNS = 'id, user_id, type, task_id, body, is_read, created_at';

export async function fetchNotifications(
  limit = 10,
): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false);
  if (error) throw error;
}

/**
 * Map notification type → tier untuk visual urgency (BRAND.md notif tier).
 */
export type NotifTier = 'normal' | 'warning' | 'urgent' | 'critical';

export function notifTier(type: NotificationType): NotifTier {
  switch (type) {
    case 'assigned':
    case 'status_done':
    case 'mentioned':
      return 'normal';
    case 'deadline_h3':
      return 'warning';
    case 'deadline_h1':
      return 'urgent';
    case 'overdue':
    case 'escalation':
      return 'critical';
    default:
      return 'normal';
  }
}
