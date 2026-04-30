/**
 * NotificationDropdown — header bell icon + dropdown panel.
 *
 * Sprint 3 Step 4. Pattern: simple custom dropdown (no @radix-ui/react-
 * dropdown-menu untuk minimize dep — pre-approved Sprint 3 plan).
 *
 * Behavior:
 * - Bell icon dengan badge count unread
 * - Click bell → toggle panel
 * - Click luar → close panel (click-outside listener)
 * - Click notif item → mark read + navigate ke task detail
 * - "Tandai semua dibaca" link kalau ada unread
 * - Empty state ("Belum ada notifikasi. Kamu update 👍" per microcopy skill)
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { formatRelativeTimeID } from '@/lib/formatRelativeTime';
import { notifTier, type NotificationRow } from '@/lib/notifications';

const TIER_DOT_CLASS: Record<ReturnType<typeof notifTier>, string> = {
  normal:   'bg-feedback-info',
  warning:  'bg-feedback-warning',
  urgent:   'bg-feedback-warning',
  critical: 'bg-feedback-danger',
};

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
  } = useNotifications();

  // Click-outside close
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleClick(notif: NotificationRow) {
    if (!notif.is_read) {
      try {
        await markRead(notif.id);
      } catch {
        // Error sudah di-handle di hook
      }
    }
    setOpen(false);
    if (notif.task_id) {
      // Find project_id via task — fetch lazy via supabase. For pilot,
      // simpler navigate ke /projects (user can navigate from there).
      // TODO Sprint 4: deeplink ke /projects/<project_id>?task=<task_id>
      navigate('/projects');
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
        className="relative inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-feedback-danger text-[10px] font-medium text-white ring-2 ring-surface"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifikasi"
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-md border bg-surface shadow-brand-md overflow-hidden z-50 kt-slide-up"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <h3 className="text-sm font-medium">Notifikasi</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs text-primary hover:underline"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <p className="px-3 py-6 text-sm text-muted-foreground text-center">
                Memuat...
              </p>
            )}

            {!loading && notifications.length === 0 && (
              <p className="px-3 py-6 text-sm text-muted-foreground text-center">
                Belum ada notifikasi. Kamu update 👍
              </p>
            )}

            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => void handleClick(n)}
                className={cn(
                  'w-full text-left px-3 py-2.5 flex gap-2.5 items-start hover:bg-accent/50 transition-colors border-b last:border-b-0',
                  !n.is_read && 'bg-feedback-info-bg',
                )}
              >
                <span
                  className={cn(
                    'mt-1.5 inline-block h-2 w-2 rounded-full flex-shrink-0',
                    TIER_DOT_CLASS[notifTier(n.type)],
                  )}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm leading-snug line-clamp-2',
                      !n.is_read && 'font-medium',
                    )}
                  >
                    {n.body}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelativeTimeID(n.created_at)}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t px-3 py-2 text-center">
            <Link
              to="/projects"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Lihat semua aktivitas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
