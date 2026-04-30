/**
 * AppHeader — shared top bar untuk pages selain Login.
 *
 * Brand wordmark + nav link + role badge + logout button.
 */
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/auth';

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin:   'bg-feedback-danger-bg text-feedback-danger ring-1 ring-feedback-danger-border',
  manager: 'bg-brand-deep-100 text-brand-deep-700 ring-1 ring-brand-deep-200',
  member:  'bg-feedback-success-bg text-feedback-success ring-1 ring-feedback-success-border',
  viewer:  'bg-surface-container-low text-foreground ring-1 ring-border',
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
};

export function AppHeader() {
  const { profile, signOut } = useAuth();

  return (
    <header className="border-b bg-surface">
      <div className="max-w-dashboard mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="kt-wordmark text-xl flex-shrink-0">
          <span className="kt-wordmark-kala">Kala</span>
          <span className="kt-wordmark-task">Task</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'px-3 py-1.5 rounded-md transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            Beranda
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              cn(
                'px-3 py-1.5 rounded-md transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            Projects
          </NavLink>
          {profile && (profile.role === 'admin' || profile.role === 'manager') && (
            <NavLink
              to="/dashboard/manager"
              className={({ isActive }) =>
                cn(
                  'px-3 py-1.5 rounded-md transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              Dashboard
            </NavLink>
          )}
          {profile?.role === 'admin' && (
            <>
              <NavLink
                to="/admin/mom-import"
                title="Convert action items dari notulensi rapat (Plaud) jadi tugas otomatis"
                className={({ isActive }) =>
                  cn(
                    'px-3 py-1.5 rounded-md transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                Import Notulensi
              </NavLink>
              <NavLink
                to="/admin/csv-import"
                title="Bulk-create tugas dari spreadsheet (.csv)"
                className={({ isActive }) =>
                  cn(
                    'px-3 py-1.5 rounded-md transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                Import Tugas (CSV)
              </NavLink>
              <NavLink
                to="/admin/usage"
                className={({ isActive }) =>
                  cn(
                    'px-3 py-1.5 rounded-md transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                Usage
              </NavLink>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 flex-shrink-0">
          {profile && (
            <>
              <InstallPrompt />
              <NotificationDropdown />
              <div className="hidden sm:flex items-center gap-2 ml-1">
                <span className="text-sm text-muted-foreground">
                  {profile.full_name}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium uppercase tracking-wide rounded-full px-2 py-0.5',
                    ROLE_BADGE_CLASS[profile.role],
                  )}
                >
                  {ROLE_LABEL[profile.role]}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                Keluar
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
