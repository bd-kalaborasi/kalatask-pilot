/**
 * DashboardPage — Beranda KalaTask.
 *
 * Sprint 6 patch: structure adopted from Stitch v1 export
 * (docs/stitch-html-export/01-dashboard.html "Beranda KalaTask").
 *
 * Layout:
 * - AppHeader (existing horizontal — Stitch left rail deferred to follow-up)
 * - Hero: display-lg greeting + body-lg subtitle
 * - KPI strip: 3 cards (Tugas Mendesak / Proyek Aktif / Aktivitas Tim)
 * - Quick Action Strip: Buat proyek, Buat tugas, Lihat semua proyek
 * - 2-col main: ActivityFeed + Featured Project (left), Priorities + Illustration (right)
 *
 * Data sources (existing hooks):
 * - useAuth → profile (name, role)
 * - useDashboardData → ProductivityMetrics + WorkloadSummary (KPI numbers)
 * - useProjectsList → projects array (count + featured)
 *
 * Where data isn't yet wired to schema (activity feed, per-user priorities),
 * EmptyState placeholders show with intent — to be filled in follow-up sprint.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useProjectsList } from '@/hooks/useProjectsList';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import { summarize } from '@/lib/dashboardMetrics';
import { ACTION } from '@/lib/labels';

export function DashboardPage() {
  const { profile } = useAuth();
  const { reopenWizard } = useOnboarding();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const { productivity, workload, loading: metricsLoading } = useDashboardData();
  const { projects, loading: projectsLoading } = useProjectsList();

  const summary = useMemo(
    () => (productivity && workload ? summarize(productivity, workload) : null),
    [productivity, workload],
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active'),
    [projects],
  );

  const featuredProject = activeProjects[0] ?? null;

  const canCreateProject =
    profile?.role === 'admin' || profile?.role === 'manager';

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-sm text-muted-foreground">Memuat profil...</div>
      </div>
    );
  }

  const firstName = profile.full_name.split(' ')[0] || profile.full_name;

  return (
    <div className="min-h-screen bg-canvas animate-fade-in">
      <AppHeader />
      <main className="max-w-[1400px] mx-auto px-margin-mobile md:px-margin-desktop py-10 space-y-10">
        {/* Hero */}
        <header>
          <h1 className="font-display text-display-sm md:text-display-md text-primary mb-2">
            Selamat datang, {firstName}
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl">
            Sudah siap untuk produktif hari ini? Mari selesaikan tantangan kamu bersama tim.
          </p>
        </header>

        {/* KPI strip — 3 cards */}
        <section
          aria-label="Ringkasan kerja kamu"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <KpiCard
            tone="urgent"
            iconName="!"
            label="Tugas Mendesak"
            value={summary ? summary.totalOverdue : metricsLoading ? '…' : 0}
            caption="Perlu perhatian segera"
          />
          <KpiCard
            tone="secondary"
            iconName="◧"
            label="Proyek Aktif"
            value={projectsLoading ? '…' : activeProjects.length}
            caption="Berjalan minggu ini"
          />
          <KpiCard
            tone="primary"
            iconName="↻"
            label="Aktivitas Tim"
            value={summary ? summary.bottleneckCount : metricsLoading ? '…' : 0}
            caption="Bottleneck terdeteksi"
          />
        </section>

        {/* Quick action strip */}
        <section
          aria-label="Aksi cepat"
          className="flex flex-wrap gap-4 p-4 bg-surface-container-low rounded-kt-lg border border-outline-variant"
        >
          {canCreateProject && (
            <Button
              variant="brand"
              onClick={() => setCreateProjectOpen(true)}
              data-testid="dashboard-create-project-button"
            >
              + {ACTION.CREATE_PROJECT}
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/projects">+ {ACTION.CREATE_TASK}</Link>
          </Button>
          <Button asChild variant="ghost-brand">
            <Link to="/projects">Lihat semua proyek</Link>
          </Button>
          <button
            type="button"
            onClick={() => void reopenWizard()}
            className="ml-auto text-body-sm font-medium text-primary-container hover:underline underline-offset-4"
          >
            Buka tutorial
          </button>
        </section>

        {/* Main 2-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Activity feed + Featured project */}
          <div className="lg:col-span-2 space-y-6">
            <ActivityFeedPanel />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeaturedProjectCard
                project={featuredProject}
                loading={projectsLoading}
              />
              <TeamCard memberCount={workload?.members.length ?? 0} />
            </div>
          </div>

          {/* RIGHT: Priorities + Illustration */}
          <div className="space-y-6">
            <PrioritiesPanel />
            <CollabIllustrationCard />
          </div>
        </div>
      </main>

      {canCreateProject && (
        <CreateProjectModal
          open={createProjectOpen}
          onClose={() => setCreateProjectOpen(false)}
          onCreated={() => setCreateProjectOpen(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// Sub-components — kept inline for now; extract if reused.
// ============================================================

interface KpiCardProps {
  tone: 'urgent' | 'secondary' | 'primary';
  iconName: string;
  label: string;
  value: number | string;
  caption: string;
}

function KpiCard({ tone, iconName, label, value, caption }: KpiCardProps) {
  const toneClasses = {
    urgent: {
      ring: 'bg-error-container/30 text-feedback-danger',
      value: 'text-feedback-danger',
    },
    secondary: {
      ring: 'bg-secondary-container/30 text-secondary',
      value: 'text-secondary',
    },
    primary: {
      ring: 'bg-primary-container/15 text-primary-container',
      value: 'text-primary-container',
    },
  }[tone];

  return (
    <div className="bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
      <div className="flex items-center gap-4 mb-4">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold ${toneClasses.ring}`}
          aria-hidden="true"
        >
          {iconName}
        </div>
        <span className="text-label-lg font-bold text-on-surface-variant uppercase tracking-wide">
          {label}
        </span>
      </div>
      <h3 className={`font-display text-display-sm leading-none mb-1 tabular-nums ${toneClasses.value}`}>
        {value}
      </h3>
      <p className="text-body-md text-on-surface-variant font-medium">{caption}</p>
    </div>
  );
}

function ActivityFeedPanel() {
  return (
    <section
      aria-label="Aktivitas terbaru"
      className="bg-surface-container-lowest rounded-kt-lg shadow-brand-sm border border-outline-variant overflow-hidden"
    >
      <header className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/50">
        <h2 className="text-title-lg font-bold text-on-surface">Aktivitas terbaru</h2>
        <Link to="/projects" className="text-primary-container text-label-lg font-bold hover:underline">
          Lihat semua
        </Link>
      </header>
      <div className="px-6 py-8">
        <EmptyState
          icon="📋"
          title="Aktivitas tim akan muncul di sini"
          body="Begitu rekan kerja update tugas, komentar, atau selesaikan project, kamu lihat semuanya di feed ini."
          compact
        />
      </div>
    </section>
  );
}

interface FeaturedProjectCardProps {
  project: { id: string; name: string; description: string | null } | null;
  loading: boolean;
}

function FeaturedProjectCard({ project, loading }: FeaturedProjectCardProps) {
  if (loading) {
    return (
      <div className="bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant">
        <p className="text-body-sm text-on-surface-variant">Memuat project unggulan…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant flex flex-col">
        <h4 className="text-title-lg font-bold text-on-surface mb-2">Belum ada project aktif</h4>
        <p className="text-body-md text-on-surface-variant mb-4">
          Buat project pertama untuk mulai kelompokkan tugas tim.
        </p>
        <Button asChild variant="brand" size="sm" className="self-start">
          <Link to="/projects">Buka Projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block bg-primary-container p-6 rounded-kt-lg shadow-brand-md relative overflow-hidden text-on-primary-container group transition-shadow hover:shadow-brand-lg"
    >
      <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform">
        <span className="text-[120px] leading-none">🚀</span>
      </div>
      <span className="inline-block px-3 py-1 bg-on-primary-container/20 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
        Project unggulan
      </span>
      <h4 className="font-display text-headline-sm mb-2 line-clamp-2">{project.name}</h4>
      {project.description && (
        <p className="text-body-md text-on-primary-container/80 line-clamp-2 mb-4">
          {project.description}
        </p>
      )}
      <div className="flex justify-between items-end">
        <span className="text-label-lg font-medium">Buka detail</span>
        <span aria-hidden="true">→</span>
      </div>
    </Link>
  );
}

interface TeamCardProps {
  memberCount: number;
}

function TeamCard({ memberCount }: TeamCardProps) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant flex flex-col justify-between">
      <div>
        <h4 className="text-title-lg font-bold text-on-surface mb-2">Tim Aktif</h4>
        <div className="flex -space-x-2 mb-4" aria-hidden="true">
          {Array.from({ length: Math.min(memberCount, 4) }).map((_, i) => (
            <div
              key={i}
              className="w-10 h-10 rounded-full bg-secondary-container border-2 border-surface-container-lowest flex items-center justify-center text-xs font-bold text-on-secondary-container"
            >
              {i + 1}
            </div>
          ))}
          {memberCount > 4 && (
            <div className="w-10 h-10 rounded-full bg-surface-container border-2 border-surface-container-lowest flex items-center justify-center text-xs font-bold text-on-surface-variant">
              +{memberCount - 4}
            </div>
          )}
        </div>
      </div>
      <p className="text-body-md text-on-surface-variant">
        {memberCount > 0
          ? `Kolaborasi dengan ${memberCount} anggota tim di seluruh project aktif.`
          : 'Belum ada anggota tim. Tambah lewat Settings.'}
      </p>
    </div>
  );
}

function PrioritiesPanel() {
  return (
    <section
      aria-label="Prioritas untuk kamu"
      className="bg-surface-container-lowest rounded-kt-lg shadow-brand-sm border border-outline-variant overflow-hidden"
    >
      <header className="px-6 py-4 border-b border-outline-variant bg-surface-container-low/50">
        <h2 className="text-title-lg font-bold text-on-surface">Prioritas untuk kamu</h2>
      </header>
      <div className="p-6">
        <EmptyState
          icon="⭐"
          title="Belum ada tugas prioritas"
          body="Tugas dengan deadline dekat atau prioritas tinggi akan muncul di sini begitu kamu di-assign."
          compact
        />
      </div>
    </section>
  );
}

function CollabIllustrationCard() {
  return (
    <div className="bg-primary-container/10 p-6 rounded-kt-lg border border-primary-container/30 flex flex-col items-center text-center">
      <div className="w-32 h-32 rounded-full bg-primary-container/15 flex items-center justify-center text-6xl mb-4" aria-hidden="true">
        🤝
      </div>
      <h4 className="font-display text-title-lg font-bold text-primary-container mb-2">
        Tingkatkan kolaborasi
      </h4>
      <p className="text-body-md text-on-surface-variant mb-4">
        Pakai @-mention di komen tugas untuk diskusi cepat tanpa keluar dari konteks kerja.
      </p>
      <Link
        to="/projects"
        className="text-primary-container font-bold text-label-lg hover:underline underline-offset-4"
      >
        Pelajari caranya →
      </Link>
    </div>
  );
}
