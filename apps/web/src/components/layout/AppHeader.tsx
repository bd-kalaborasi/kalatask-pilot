/**
 * AppHeader — shared top bar untuk pages selain Login.
 *
 * Brand wordmark + nav link + role badge + logout button.
 */
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/auth';

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700 ring-1 ring-red-200',
  manager: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  member: 'bg-green-100 text-green-700 ring-1 ring-green-200',
  viewer: 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200',
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
        </nav>

        <div className="flex items-center gap-2 flex-shrink-0">
          {profile && (
            <>
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
