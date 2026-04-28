/**
 * DashboardPage — role-aware landing setelah login.
 *
 * Sprint 2: AppHeader shared dengan ProjectsPage. Quick link ke Projects.
 */
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { UserRole } from '@/lib/auth';

const ROLE_DESCRIPTION: Record<UserRole, string> = {
  admin:
    'Akses penuh: kelola semua user, project, task. Buka tab Projects untuk mulai.',
  manager:
    'Kelola project + task tim kamu. Buka tab Projects untuk lihat scope.',
  member:
    'Lihat project yang punya task assigned ke kamu. Buka tab Projects.',
  viewer:
    'Read-only overview semua project + task. Buka tab Projects untuk dashboard manajemen.',
};

export function DashboardPage() {
  const { profile } = useAuth();
  const { reopenWizard } = useOnboarding();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-sm text-muted-foreground">Memuat profil...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="max-w-dashboard mx-auto px-6 py-10 space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Selamat datang,</p>
          <h2 className="text-3xl font-semibold">{profile.full_name}</h2>
          <p className="text-xs text-muted-foreground font-mono">
            {profile.email}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Akses Kamu</CardTitle>
            <CardDescription>
              Sprint 2 baseline — F3 Three Views + F14 Project Lifecycle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">
              {ROLE_DESCRIPTION[profile.role]}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link to="/projects">Buka Projects</Link>
              </Button>
              <button
                type="button"
                onClick={() => void reopenWizard()}
                className="text-sm font-medium underline-offset-2 hover:underline"
                style={{ color: 'var(--kt-sky-700)' }}
              >
                Buka tutorial
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
