/**
 * DashboardPage — role-aware landing setelah login.
 *
 * Sprint 1 scope: minimal placeholder per role + logout button.
 * Full dashboard (kanban, list, gantt) dibangun Sprint 2+.
 */
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/auth';

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
};

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700 ring-1 ring-red-200',
  manager: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  member: 'bg-green-100 text-green-700 ring-1 ring-green-200',
  viewer: 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200',
};

const ROLE_DESCRIPTION: Record<UserRole, string> = {
  admin:
    'Akses penuh: kelola semua user, project, task. Dashboard lengkap dibangun di Sprint 2.',
  manager:
    'Kelola project + task tim kamu. Dashboard team scope dibangun di Sprint 2.',
  member:
    'Lihat task assigned ke kamu. Task list view dibangun di Sprint 2.',
  viewer:
    'Read-only overview semua project + task. Dashboard manajemen dibangun di Sprint 2.',
};

export function DashboardPage() {
  const { profile, signOut } = useAuth();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-sm text-muted-foreground">Memuat profil...</div>
      </div>
    );
  }

  const role = profile.role;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Top bar */}
      <header className="border-b bg-surface">
        <div className="max-w-dashboard mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="kt-wordmark text-2xl">
            <span className="kt-wordmark-kala">Kala</span>
            <span className="kt-wordmark-task">Task</span>
          </h1>
          <Button variant="outline" size="sm" onClick={signOut}>
            Keluar
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-dashboard mx-auto px-6 py-10 space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Selamat datang,</p>
          <h2 className="text-3xl font-semibold flex items-center gap-3">
            {profile.full_name}
            <span
              className={cn(
                'text-xs font-medium uppercase tracking-wide rounded-full px-2.5 py-1',
                ROLE_BADGE_CLASS[role],
              )}
            >
              {ROLE_LABEL[role]}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            {profile.email}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Akses Kamu</CardTitle>
            <CardDescription>
              Sprint 1 baseline — full feature di Sprint berikutnya
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{ROLE_DESCRIPTION[role]}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Pilot Sprint 1</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">RLS foundation:</span> 80 pgTAP
              assertions passing (users + teams + projects + tasks)
            </p>
            <p>
              <span className="font-medium">Auth flow:</span> Supabase email +
              password (kamu sedang login pakai ini)
            </p>
            <p>
              <span className="font-medium">Next:</span> Task list + Kanban
              view (Sprint 2)
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
