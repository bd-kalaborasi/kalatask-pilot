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

const NOTIF_EVENT_LABELS: Record<string, { title: string; desc: string }> = {
  assigned: { title: 'Tugas di-assign ke kamu', desc: 'Saat seseorang assign task baru' },
  status_done: { title: 'Tugas selesai', desc: 'Saat task yang kamu watch berubah ke done' },
  deadline_h3: { title: 'Deadline 3 hari lagi', desc: 'Pengingat 3 hari sebelum deadline' },
  deadline_h1: { title: 'Deadline besok', desc: 'Pengingat 1 hari sebelum deadline' },
  overdue: { title: 'Tugas overdue', desc: 'Saat deadline terlewat' },
  mentioned: { title: 'Di-mention di komentar', desc: 'Saat seseorang sebut @kamu di komentar' },
  escalation: { title: 'Eskalasi tugas', desc: 'Saat task kamu di-escalate ke manager' },
  digest: { title: 'Ringkasan harian', desc: 'Email ringkasan task hari ini (kalau ada)' },
};
const NOTIF_EVENT_ORDER = [
  'assigned', 'mentioned', 'status_done', 'deadline_h3', 'deadline_h1',
  'overdue', 'escalation', 'digest',
];

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

      <PasswordChangeBlock />
    </section>
  );
}

function PasswordChangeBlock() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function handleSave() {
    setError(null);
    if (pw.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }
    if (pw !== pw2) {
      setError('Konfirmasi password tidak cocok');
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSavedAt(new Date());
    setPw('');
    setPw2('');
    setOpen(false);
  }

  return (
    <div className="bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-title-md font-semibold text-on-surface">Ubah password</p>
          <p className="text-body-sm text-on-surface-variant">
            Password minimal 8 karakter. Ganti sesekali untuk keamanan.
          </p>
        </div>
        {!open && (
          <Button onClick={() => setOpen(true)} variant="outline" size="sm">
            Ubah password
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-3 pt-2 border-t border-outline-variant">
          <div>
            <label htmlFor="new-password" className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest">
              Password baru
            </label>
            <input
              id="new-password"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-outline-variant rounded-kt-md text-body-md focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container"
              autoComplete="new-password"
              disabled={saving}
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor="new-password-confirm" className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest">
              Konfirmasi password baru
            </label>
            <input
              id="new-password-confirm"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-outline-variant rounded-kt-md text-body-md focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container"
              autoComplete="new-password"
              disabled={saving}
              minLength={8}
            />
          </div>
          {error && <p className="text-body-sm text-feedback-danger">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} variant="brand" size="sm">
              {saving ? 'Menyimpan...' : 'Simpan password'}
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                setPw('');
                setPw2('');
                setError(null);
              }}
              disabled={saving}
              variant="outline"
              size="sm"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {savedAt && !open && (
        <p className="text-body-sm text-feedback-success">
          ✓ Password berhasil diubah {savedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.
        </p>
      )}
    </div>
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

interface NotifPref {
  event_type: string;
  enabled: boolean;
  channel: string;
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotifPref[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.rpc('get_notif_prefs');
      if (!mounted) return;
      if (error) {
        // Migration not yet applied — fall back to defaults locally.
        setUnavailable(true);
        setPrefs(
          NOTIF_EVENT_ORDER.map((et) => ({
            event_type: et,
            enabled: true,
            channel: 'in_app',
          })),
        );
        setLoading(false);
        return;
      }
      setPrefs((data ?? []) as NotifPref[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function toggle(event_type: string, current: boolean) {
    setSaving(event_type);
    setPrefs((prev) =>
      prev.map((p) => (p.event_type === event_type ? { ...p, enabled: !current } : p)),
    );
    if (!unavailable) {
      const { error } = await supabase.rpc('update_notif_pref', {
        p_event_type: event_type,
        p_enabled: !current,
        p_channel: 'in_app',
      });
      if (error) {
        // Rollback optimistic update on error.
        setPrefs((prev) =>
          prev.map((p) => (p.event_type === event_type ? { ...p, enabled: current } : p)),
        );
      }
    }
    setSaving(null);
  }

  // Fill in any missing events from canonical order so UI is stable.
  const ordered = useMemo(() => {
    const byKey = new Map(prefs.map((p) => [p.event_type, p]));
    return NOTIF_EVENT_ORDER.map(
      (et) =>
        byKey.get(et) ?? { event_type: et, enabled: true, channel: 'in_app' },
    );
  }, [prefs]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-headline-md text-on-surface">Preferensi notifikasi</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Atur notifikasi yang kamu terima — saat di-mention, tugas di-assign, atau status berubah.
        </p>
      </header>

      {unavailable && (
        <div className="bg-feedback-warning-bg border border-feedback-warning-border rounded-kt-md p-3 text-body-sm text-feedback-warning">
          ⚠️ Tabel preferensi belum di-deploy. Toggle hanya disimpan lokal — admin perlu apply migration{' '}
          <code className="font-mono">20260501100000_r4_create_notif_prefs.sql</code>.
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-kt-lg shadow-brand-sm border border-outline-variant divide-y divide-outline-variant/60">
        {loading ? (
          <div className="p-6">
            <p className="text-body-md text-on-surface-variant">Memuat preferensi...</p>
          </div>
        ) : (
          ordered.map((p) => {
            const meta = NOTIF_EVENT_LABELS[p.event_type] ?? {
              title: p.event_type,
              desc: '',
            };
            return (
              <div
                key={p.event_type}
                className="flex items-start justify-between gap-4 p-5"
              >
                <div className="flex-1">
                  <p className="text-body-md font-semibold text-on-surface">{meta.title}</p>
                  <p className="text-body-sm text-on-surface-variant mt-0.5">{meta.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={p.enabled}
                  aria-label={`Toggle ${meta.title}`}
                  disabled={saving === p.event_type}
                  onClick={() => toggle(p.event_type, p.enabled)}
                  className={
                    p.enabled
                      ? 'relative inline-flex h-6 w-11 items-center rounded-full bg-primary-container transition-colors disabled:opacity-50'
                      : 'relative inline-flex h-6 w-11 items-center rounded-full bg-surface-container transition-colors disabled:opacity-50 ring-1 ring-outline-variant'
                  }
                >
                  <span
                    className={
                      p.enabled
                        ? 'inline-block h-5 w-5 transform rounded-full bg-on-primary-container shadow translate-x-5 transition-transform'
                        : 'inline-block h-5 w-5 transform rounded-full bg-on-surface-variant shadow translate-x-1 transition-transform'
                    }
                  />
                </button>
              </div>
            );
          })
        )}
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

function InviteButton({ onInvited }: { onInvited: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@') || trimmed.length < 5) {
      setError('Email tidak valid');
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.rpc('create_user_invite', {
      p_email: trimmed,
      p_role: role,
    });
    setSaving(false);
    if (err) {
      // RPC unavailable → graceful degradation message
      if (err.message.includes('not found') || err.code === '42883') {
        setError('Migration belum di-deploy. Hubungi admin untuk apply 20260501100100_r4_create_user_invites.sql');
      } else {
        setError(err.message);
      }
      return;
    }
    setSuccess(`Undangan dikirim ke ${trimmed}`);
    setEmail('');
    onInvited();
    setTimeout(() => {
      setOpen(false);
      setSuccess(null);
    }, 1800);
  }

  if (!open) {
    return (
      <Button variant="brand" onClick={() => setOpen(true)}>
        + Undang anggota
      </Button>
    );
  }

  return (
    <div className="w-full bg-surface-container-low p-4 rounded-kt-md border border-outline-variant space-y-3">
      <p className="text-title-sm font-semibold text-on-surface">Undang anggota baru</p>
      <div className="grid sm:grid-cols-[1fr_140px_auto_auto] gap-2 items-end">
        <div>
          <label htmlFor="invite-email" className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest">
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rekan@perusahaan.com"
            className="mt-1 w-full px-3 py-2 border border-outline-variant rounded-kt-md text-body-md focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container"
            disabled={saving}
          />
        </div>
        <div>
          <label htmlFor="invite-role" className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest">
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="mt-1 w-full px-3 py-2 border border-outline-variant rounded-kt-md text-body-md bg-surface-container-lowest"
            disabled={saving}
          >
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Button onClick={handleSubmit} disabled={saving} variant="brand" size="sm">
          {saving ? 'Mengirim...' : 'Kirim undangan'}
        </Button>
        <Button
          onClick={() => {
            setOpen(false);
            setEmail('');
            setError(null);
            setSuccess(null);
          }}
          variant="outline"
          size="sm"
          disabled={saving}
        >
          Batal
        </Button>
      </div>
      {error && <p className="text-body-sm text-feedback-danger">{error}</p>}
      {success && <p className="text-body-sm text-feedback-success">✓ {success}</p>}
    </div>
  );
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
        <InviteButton onInvited={() => { /* Sprint 7+: refresh invite list */ }} />
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
                ? 'Tambah anggota tim lewat tombol "+ Undang anggota" di atas.'
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
