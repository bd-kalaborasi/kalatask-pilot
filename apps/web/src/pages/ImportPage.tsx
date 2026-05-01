/**
 * ImportPage — unified Import workspace with tab navigation.
 *
 * Sprint 6 patch r2 Phase B: consolidates 2 separate menu entries
 * (Import Notulensi MoM + Import Tugas CSV) into one /admin/import
 * route with tab nav at the top.
 *
 * Tabs:
 * - mom (default): renders <AdminMoMImportPage embedded /> body
 * - csv: renders <AdminCsvImportPage embedded /> body
 *
 * Tab persistence via URL ?tab=mom|csv. Back-compat redirect from
 * legacy /admin/mom-import + /admin/csv-import preserved (those routes
 * still exist; this is an alternative entry point).
 *
 * Permission: admin only.
 */
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { AdminMoMImportPage } from '@/pages/AdminMoMImportPage';
import { AdminCsvImportPage } from '@/pages/AdminCsvImportPage';

type Tab = 'mom' | 'csv';

export function ImportPage() {
  const { profile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'mom';

  function navigateTab(next: Tab) {
    const sp = new URLSearchParams(searchParams);
    if (next === 'mom') sp.delete('tab');
    else sp.set('tab', next);
    setSearchParams(sp);
  }

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }
  if (profile.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-canvas animate-fade-in">
      <AppHeader />
      <main className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-8 space-y-6">
        {/* Page header */}
        <header>
          <h1 className="font-display text-headline-md text-on-surface">Import Data</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Upload notulensi rapat (MoM) atau bulk-create tugas dari spreadsheet (CSV).
          </p>
        </header>

        {/* Tab navigation */}
        <nav role="tablist" aria-label="Pilih jenis import" className="flex items-center gap-8 border-b border-outline-variant">
          <TabButton active={tab === 'mom'} onClick={() => navigateTab('mom')}>
            <span aria-hidden="true">📋</span>
            Notulensi (MoM)
          </TabButton>
          <TabButton active={tab === 'csv'} onClick={() => navigateTab('csv')}>
            <span aria-hidden="true">📊</span>
            Karyawan / Tugas (CSV)
          </TabButton>
        </nav>

        {/* Tab body */}
        {tab === 'mom' && <AdminMoMImportPage embedded />}
        {tab === 'csv' && <AdminCsvImportPage embedded />}
      </main>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? 'pb-3 -mb-px border-b-2 border-primary-container text-primary-container font-semibold flex items-center gap-2'
          : 'pb-3 -mb-px border-b-2 border-transparent text-on-surface-variant hover:text-on-surface font-medium flex items-center gap-2 transition-colors'
      }
    >
      {children}
    </button>
  );
}
