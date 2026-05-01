/**
 * SettingsPage — workspace settings + member admin.
 *
 * Sprint 6 patch r2: structure adopted from Stitch v1 export
 * (docs/stitch-html-export/13-settings-team.html "Anggota Tim - Settings").
 *
 * Layout (admin-scoped sections only render for admin):
 * - Sidebar nav: Akun kamu | Workspace | Admin (collapses on mobile)
 * - Main content: section-scoped panels driven by URL ?section= param
 *
 * MVP sections:
 * - profile (any role) — name, email, avatar placeholder
 * - notifications (any role) — preferences
 * - members (admin only) — table of all users with role + status
 *
 * Note: Stitch design shows extensive workspace/admin nav which the
 * pilot doesn't yet need. We render available sections and indicate
 * future ones with disabled state + "Segera tersedia" tooltip.
 */
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/lib/supabase';
import { formatDateID } from '@/lib/formatDate';
import type { UserRole } from '@/lib/auth';

type Section = 'profile' | 'notifications' | 'members';

interface SettingsUser {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  team_id: string | null;
  team_name?: string | null;
  created_at: string;
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
};

const ROLE_TONE: Record<UserRole, string> = {
  admin: 'bg-feedback-danger-bg text-feedback-danger ring-1 ring-feedback-danger-border',
  manager: 'bg-primary-container/15 text-primary-container ring-1 ring-primary-container/30',
  member: 'bg-feedback-success-bg text-feedback-success ring-1 ring-feedback-success-border',
  viewer: 'bg-surface-container text-on-surface-variant ring-1 ring-outline-variant',
};

export function SettingsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = (searchParams.get('section') as Section) || 'profile';

  function navigateSection(next: Section) {
    const sp = new URLSearchParams(searchParams);
    if (next === 'profile') sp.delete('section');
    else sp.set('section', next);
    setSearchParams(sp);
  }

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';

  // Guard: members section admin only
  if (section === 'members' && !isAdmin) {
    return <Navigate to="/settings" replace />;
  }

  return (
    <div className="min-h-screen bg-canvas animate-fade-in">
      <AppHeader />
      <main className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-8">
        <div className="grid lg:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar nav */}
          <aside className="lg:sticky lg:top-8 lg:self-start space-y-6" aria-label="Pengaturan">
            <NavSection title="Akun kamu">
              <NavItem active={section === 'profile'} onClick={() => navigateSection('profile')} icon="👤">
                Profile
              </NavItem>
              <NavItem
                active={section === 'notifications'}
                onClick={() => navigateSection('notifications')}
                icon="🔔"
              >
                Notifikasi
              </NavItem>
            </NavSection>

            {isAdmin && (
              <NavSection title="Admin">
                <NavItem
                  active={section === 'members'}
                  onClick={() => navigateSection('members')}
                  icon="👥"
                >
                  Anggota tim
                </NavItem>
              </NavSection>
            )}

            <NavSection title="Workspace (Coming soon)">
              <NavItemDisabled icon="🛠️">Umum</NavItemDisabled>
              <NavItemDisabled icon="🔐">Roles &amp; permissions</NavItemDisabled>
              <NavItemDisabled icon="🧩">Integrasi</NavItemDisabled>
            </NavSection>
          </aside>

          {/* Main content */}
          <div>
            {section === 'profile' && <ProfileSection profile={profile} />}
            {section === 'notifications' && <NotificationsSection />}
            {section === 'members' && isAdmin && <MembersSection currentUserId={profile.id} />}
          </div>
        </div>
      </main>
    </div>
  );
}

interface NavSectionProps {
  title: string;
  children: React.ReactNode;
}

function NavSection({ title, children }: NavSectionProps) {
  return (
    <section>
      <p className="px-4 text-label-md font-bold text-on-surface-variant uppercase tracking-widest mb-2">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  children: React.ReactNode;
}

function NavItem({ active, onClick, icon, children }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'w-full flex items-center gap-3 px-4 py-2.5 bg-primary-container/15 text-primary-container font-semibold border-r-4 border-primary-container rounded-l-kt-md text-left'
          : 'w-full flex items-center gap-3 px-4 py-2.5 text-on-surface-variant hover:bg-surface-container transition-colors rounded-kt-md text-left'
      }
    >
      <span aria-hidden="true">{icon}</span>
      <span className="text-body-md">{children}</span>
    </button>
  );
}

function NavItemDisabled({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div
      className="w-full flex items-center gap-3 px-4 py-2.5 text-on-surface-variant/50 rounded-kt-md cursor-not-allowed"
      aria-disabled="true"
      title="Segera tersedia"
    >
      <span aria-hidden="true">{icon}</span>
      <span className="text-body-md">{children}</span>
    </div>
  );
}

// ============================================================
// Profile section
// ============================================================

interface ProfileSectionProps {
  profile: { id: string; full_name: string; email: string | null; role: UserRole };
}

function ProfileSection({ profile }: ProfileSectionProps) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      setError('Nama minimal 2 karakter');
      setSaving(false);
      return;
    }
    const { error: err } = await supabase
      .from('users')
      .update({ full_name: trimmed })
      .eq('id', profile.id);
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    setSavedAt(new Date());
    setEditing(false);
    setSaving(false);
  }

  function handleCancel() {
    setFullName(profile.full_name);
    setError(null);
    setEditing(false);
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-headline-md text-on-surface">Profile</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Identitas akun kamu di KalaTask. Email + password ubahnya lewat admin.
        </p>
      </header>

      <div className="bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant space-y-4">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full bg-primary-container/15 flex items-center justify-center text-2xl font-bold text-primary-container"
            aria-hidden="true"
          >
            {fullName?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                <label htmlFor="profile-name" className="sr-only">Nama lengkap</label>
                <input
                  id="profile-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-kt-md text-body-md focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container"
                  disabled={saving}
                  maxLength={120}
                />
                {error && (
                  <p className="text-body-sm text-feedback-danger">{error}</p>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} variant="brand" size="sm">
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                  <Button onClick={handleCancel} disabled={saving} variant="outline" size="sm">
                    Batal
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-title-md font-semibold text-on-surface">{fullName}</p>
                <p className="text-body-sm text-on-surface-variant font-mono">
                  {profile.email ?? '—'}
                </p>
              </>
            )}
          </div>
          {!editing && (
            <Button onClick={() => setEditing(true)} variant="outline" size="sm">
              Edit nama
            </Button>
          )}
        </div>

        {savedAt && !editing && (
          <p className="text-body-sm text-feedback-success">
            ✓ Tersimpan {savedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.
            Refresh halaman untuk lihat perubahan di header.
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-outline-variant">
          <Field label="Role" value={ROLE_LABEL[profile.role]} />
          <Field label="User ID" value={profile.id} mono />
        </div>
      </div>

      <div className="bg-surface-container-low p-4 rounded-kt-md border border-outline-variant">
        <p className="text-body-sm text-on-surface-variant">
          ℹ️ Email + password ubahnya lewat admin (security review). Nama bisa diubah langsung.
        </p>
      </div>
    </section>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className={mono ? 'text-body-sm font-mono text-on-surface' : 'text-body-md text-on-surface'}>
        {value}
      </p>
    </div>
  );
}

// ============================================================
// Notifications section
// ============================================================

function NotificationsSection() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-headline-md text-on-surface">Preferensi notifikasi</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Atur notifikasi yang kamu terima — saat di-mention, tugas di-assign, atau status berubah.
        </p>
      </header>

      <div className="bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant">
        <EmptyState
          icon="🔔"
          title="Preferensi notifikasi: segera tersedia"
          body="Saat ini semua notifikasi aktif by default. Toggle per-event akan tersedia di Sprint 7."
        />
      </div>
    </section>
  );
}

// ============================================================
// Members section (admin only)
// ============================================================

interface MembersSectionProps {
  currentUserId: string;
}

function MembersSection({ currentUserId }: MembersSectionProps) {
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      const { data, error: err } = await supabase
        .from('users')
        .select('id, full_name, email, role, team_id, created_at, team:teams!users_team_id_fkey(id, name)')
        .order('created_at', { ascending: false });
      if (!mounted) return;
      if (err) {
        setError(err as unknown as Error);
        setLoading(false);
        return;
      }
      const rows = (data ?? []).map((row: any) => ({
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        role: row.role,
        team_id: row.team_id,
        team_name: row.team?.name ?? null,
        created_at: row.created_at,
      })) as SettingsUser[];
      setUsers(rows);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== 'all') list = list.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) || (u.email?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [users, roleFilter, search]);

  const counts = useMemo(() => {
    const c = { admin: 0, manager: 0, member: 0, viewer: 0 };
    for (const u of users) c[u.role]++;
    return c;
  }, [users]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-headline-md text-on-surface">Anggota Tim</h1>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="px-3 py-1 bg-primary-container/15 text-primary-container rounded-full text-label-md font-bold">
            {users.length} anggota
          </span>
          <p className="text-body-md text-on-surface-variant">
            {counts.admin} admin · {counts.manager} manager · {counts.member} member ·{' '}
            {counts.viewer} viewer
          </p>
        </div>
      </header>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-surface-container-lowest p-4 rounded-kt-lg border border-outline-variant shadow-brand-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="pl-10 pr-4 py-2 border border-outline-variant rounded-kt-md text-body-md w-72 focus:border-primary-container focus:ring-2 focus:ring-primary-container/30"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden="true">⌕</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            className="px-3 py-2 border border-outline-variant rounded-kt-md text-body-md bg-surface-container-lowest"
          >
            <option value="all">Semua role</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <Button variant="brand" disabled title="Segera tersedia">
          + Undang anggota
        </Button>
      </div>

      {loading && <p className="text-body-md text-on-surface-variant">Memuat anggota...</p>}

      {error && (
        <div className="border border-feedback-danger/50 bg-feedback-danger-bg rounded-kt-md p-4">
          <p className="text-body-md text-feedback-danger">{error.message}</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-kt-lg shadow-brand-sm">
          <EmptyState
            icon="👥"
            title={users.length === 0 ? 'Belum ada anggota' : 'Tidak ada hasil'}
            body={
              users.length === 0
                ? 'Tambah anggota tim lewat fitur Undang (akan tersedia di Sprint 7).'
                : 'Coba ubah kata kunci pencarian atau filter role.'
            }
          />
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="bg-surface-container-lowest rounded-kt-lg shadow-brand-sm border border-outline-variant overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-4 text-label-md font-bold text-on-surface-variant uppercase tracking-widest">Pengguna</th>
                <th className="p-4 text-label-md font-bold text-on-surface-variant uppercase tracking-widest">Role</th>
                <th className="p-4 text-label-md font-bold text-on-surface-variant uppercase tracking-widest">Tim</th>
                <th className="p-4 text-label-md font-bold text-on-surface-variant uppercase tracking-widest">Bergabung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className={`hover:bg-surface-container-low/50 transition-colors ${
                    u.id === currentUserId ? 'bg-primary-container/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold"
                        aria-hidden="true"
                      >
                        {u.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-body-md font-semibold text-on-surface">
                          {u.full_name}
                          {u.id === currentUserId && (
                            <span className="ml-2 text-label-md text-primary-container">(kamu)</span>
                          )}
                        </p>
                        <p className="text-body-sm text-on-surface-variant font-mono">
                          {u.email ?? '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-label-md font-bold ${ROLE_TONE[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="p-4">
                    {u.team_name ? (
                      <span className="px-2 py-1 bg-secondary-container/40 text-on-secondary-container rounded text-label-md font-bold uppercase tracking-wide">
                        {u.team_name}
                      </span>
                    ) : (
                      <span className="text-body-sm text-on-surface-variant">—</span>
                    )}
                  </td>
                  <td className="p-4 text-body-sm text-on-surface-variant">
                    {formatDateID(u.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
