---
name: supabase-migration
description: Use this skill when creating, modifying, or applying Supabase database migrations for the KalaTask project. Trigger when the user asks to "buat migration", "tambah tabel", "schema change", "apply migration", "rollback migration", or any DDL change to the database. This skill enforces naming convention, ordering rules, idempotency, RLS-from-day-one, and safe rollback patterns. Pair with `rls-policy-writer` (every new table needs RLS) and `rls-tester` (every policy needs test).
---

# Supabase Migration — KalaTask

## Tujuan skill ini

Skill ini memastikan setiap migration:

1. **Predictable order** — naming convention timestamp-based, lexicographically sortable
2. **Idempotent (sebisa mungkin)** — `IF NOT EXISTS`, `ON CONFLICT`, `OR REPLACE` untuk hindari error saat re-run
3. **Reversible** — setiap migration punya counterpart `down` (atau dokumentasi rollback)
4. **Self-contained** — satu migration = satu logical change, bisa di-apply standalone
5. **RLS-aware** — tabel baru otomatis enable RLS sebelum production

## Source of truth

- Stack decision: ADR-001 (Supabase managed)
- RLS strategy: ADR-002
- Tooling: Supabase CLI (`supabase migration new`, `supabase db push`, `supabase db reset`)

## Naming convention

### Format: `{timestamp}_{snake_case_description}.sql`

- `{timestamp}` — `YYYYMMDDHHMMSS` (UTC, bukan WIB)
- `{snake_case_description}` — verb + object, singular lebih clear daripada plural

```
20260427120000_add_helper_functions.sql
20260427120100_create_users_table.sql
20260427120200_add_rls_users.sql
20260427130000_create_teams_table.sql
20260427130100_add_rls_teams.sql
```

> **Kenapa terpisah** "create table" dan "add RLS"? Supaya kalau RLS perlu di-revisit (ADR-002 update), kita tidak perlu touch table DDL. Lebih granular = lebih aman saat audit.

### Convention prefix verb

| Prefix | Use case |
|---|---|
| `create_` | CREATE TABLE, CREATE TYPE |
| `add_` | ALTER ADD column, ADD CONSTRAINT, ADD POLICY |
| `drop_` | DROP TABLE, DROP COLUMN (rare di pilot) |
| `alter_` | Change column type, default, dll |
| `seed_` | INSERT data master / lookup table |
| `fix_` | Hot-fix yang harus di-rush, plus link issue |

## Aturan WAJIB

### 1. Setiap migration max 1 logical change

Salah:

```sql
-- 20260427120000_add_users_and_teams_and_rls.sql
-- ❌ Terlalu banyak hal di 1 file. Sulit di-rollback parsial.
CREATE TABLE users (...);
CREATE TABLE teams (...);
ALTER TABLE users ENABLE RLS;
CREATE POLICY ...;
INSERT INTO teams VALUES ...;
```

Benar:

```sql
-- 20260427120000_create_users_table.sql       — CREATE TABLE saja
-- 20260427120100_create_teams_table.sql       — CREATE TABLE saja
-- 20260427120200_add_rls_users.sql            — RLS users saja
-- 20260427120300_add_rls_teams.sql            — RLS teams saja
-- 20260427120400_seed_default_teams.sql       — INSERT data saja
```

### 2. Pakai `IF NOT EXISTS` untuk DDL idempotent

```sql
-- ✅ Idempotent
CREATE TABLE IF NOT EXISTS public.users (...);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE EXTENSION IF NOT EXISTS pgtap;

-- ✅ ENUM type juga
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo','in_progress','review','done','blocked');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
```

> **Catatan:** policy `CREATE POLICY` tidak punya `IF NOT EXISTS` di Postgres < 17. Workaround: `DROP POLICY IF EXISTS` dulu sebelum `CREATE POLICY`. Atau pakai `DO $$ ... $$` block dengan exception handling.

### 3. Setiap CREATE TABLE wajib include kolom audit standard

Default audit columns:

```sql
CREATE TABLE IF NOT EXISTS public.example (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... business columns ...
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES public.users(id),
  -- updated_by optional, tergantung kebutuhan tabel
  updated_by  uuid REFERENCES public.users(id)
);

-- Trigger auto-update updated_at
CREATE TRIGGER trg_example_set_updated_at
  BEFORE UPDATE ON public.example
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

> Function `set_updated_at()` di-define di migration awal `20260427000000_add_helper_functions.sql`:

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

### 4. Setiap CREATE TABLE harus disusul migration RLS

Pattern:

```
{ts}_create_X_table.sql       — CREATE TABLE saja, BELUM enable RLS
{ts+1}_add_rls_X.sql           — ENABLE RLS + FORCE RLS + policies
```

JANGAN CREATE TABLE tanpa RLS counterpart di sprint yang sama. Kalau perlu lebih lama, paling tidak `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` tanpa policy = default deny semua. Itu safe state, bukan unsafe.

### 5. Foreign key constraint inline, bukan post-hoc

```sql
-- ✅ Inline FK saat CREATE TABLE
CREATE TABLE tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL
);

-- ❌ Hindari post-hoc ALTER (bikin migration order bergantung lebih banyak)
CREATE TABLE tasks (id uuid PRIMARY KEY, project_id uuid NOT NULL);
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id);
```

> **Trade-off ON DELETE:** `CASCADE` untuk owned (task milik project), `SET NULL` untuk reference (assignee bisa keluar tapi task masih ada).

### 6. Index untuk semua FK + kolom yang di-query rutin

Postgres tidak auto-create index untuk FK. Bikin manual:

```sql
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status) WHERE status <> 'done';
-- Partial index — task done tidak perlu di-index (jarang di-query untuk filtering)
```

Kolom yang dipakai di RLS `USING` clause WAJIB di-index. Performance penalty RLS terbesar di sini.

### 7. Tulis comment untuk setiap migration kompleks

Bagian atas file:

```sql
-- =============================================================
-- Migration: 20260427120100_create_users_table
--
-- Tujuan: Bikin tabel users dengan kolom audit + role enum.
-- Refer: PRD §7 (Database Schema), ADR-002 (RLS strategy).
--
-- Dependencies:
--   - 20260427120000_add_helper_functions.sql (set_updated_at trigger)
--
-- Reversal:
--   DROP TABLE public.users CASCADE;
--   (akan cascade hapus tasks, comments, dll yang FK ke users — destructive)
--
-- Author: Claude Code (skill: supabase-migration)
-- =============================================================
```

## Workflow eksekusi

### Saat user minta "buat migration baru untuk X"

1. **Tentukan timestamp** — cek migration terakhir, increment 1 menit (atau pakai actual UTC `date -u +%Y%m%d%H%M%S`)
2. **Cek 1-logical-change rule** — kalau X melibatkan banyak hal, split jadi multiple migration
3. **Generate file di `supabase/migrations/`**
4. **Cek dependencies** — apakah migration ini butuh migration lain di-apply dulu? Document di header.
5. **Reminder ke user**:
   - Apply lokal: `supabase db reset` (full re-apply) atau `supabase db push` (incremental)
   - Pasangkan dengan migration RLS jika tabel baru
   - Pasangkan dengan test pgTAP jika ada policy

### Saat user minta "apply migration"

1. Cek state DB:
   ```bash
   supabase migration list
   ```
2. Identifikasi migration yang belum applied
3. Apply incremental:
   ```bash
   supabase db push
   ```
4. Untuk reset full (development only, akan WIPE data):
   ```bash
   supabase db reset
   ```
5. Verifikasi:
   ```bash
   supabase migration list
   # Status semua harus "Applied"
   ```

### Saat user minta "rollback migration"

⚠️ Supabase CLI tidak punya native `down` migration. Strategy:

**Option A — Forward-only fix (preferred di pilot):**
- Tulis migration baru yang reverse change-nya
- Misal: `20260428100000_drop_column_X.sql` untuk reverse `20260427100000_add_column_X.sql`
- Pros: full audit trail, gak ambigu state DB
- Cons: bisa noisy

**Option B — Reset di dev (DANGEROUS di production):**
```bash
supabase db reset
# Wipe semua, re-run dari migration 0
```
- Pros: clean slate
- Cons: data hilang. JANGAN di production.

**Option C — Manual SQL (last resort):**
- Connect ke DB via `supabase db psql`
- Run reverse SQL manual
- Update entry di tabel `supabase_migrations.schema_migrations` (hapus row migration yang di-rollback)
- Pros: fast
- Cons: high risk human error, no audit trail

### Saat user minta "seed data"

Pakai prefix `seed_` dan letakkan di `supabase/seed.sql` (auto-run saat `supabase db reset`):

```sql
-- supabase/seed.sql — di-run setelah semua migration

-- App settings default
INSERT INTO public.app_settings (key, value) VALUES
  ('notification_warning_days_before_deadline', '3'),
  ('notification_urgent_days_before_deadline', '1'),
  ('cowork_sync_schedule_cron', '0 7 * * *')
ON CONFLICT (key) DO NOTHING;

-- Sample admin user (untuk dev only — production via Supabase Auth)
-- Comment block ini di production
INSERT INTO public.users (id, email, full_name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@kalaborasi.test', 'Admin Dev', 'admin')
ON CONFLICT (id) DO NOTHING;
```

## Pattern library — copy-paste reference

### Pattern A: Create table dengan audit columns + trigger

```sql
-- supabase/migrations/20260427130000_create_projects_table.sql

CREATE TABLE IF NOT EXISTS public.projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  owner_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES public.users(id),
  updated_by  uuid REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status   ON public.projects (status);

-- Auto-update updated_at
CREATE TRIGGER trg_projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Comment for self-documentation
COMMENT ON TABLE public.projects IS 'Project container for tasks. PRD §7';
```

### Pattern B: Add column ke tabel existing

```sql
-- supabase/migrations/20260428140000_add_locale_to_users.sql

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'id'
    CHECK (locale IN ('id','en'));

COMMENT ON COLUMN public.users.locale IS 'User UI language preference. PRD N7.';
```

### Pattern C: Add ENUM value (postgres EXTREMELY tricky)

```sql
-- supabase/migrations/20260429100000_add_task_status_blocked.sql

-- Postgres < 12 tidak support ALTER TYPE ADD VALUE di transaction.
-- Solusi: jalankan di-luar transaction (Supabase CLI handle ini).

ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'blocked' AFTER 'done';

-- ⚠️ Setelah migration ini, query yang pakai 'blocked' tidak boleh di-execute
-- di session yang sama dengan migration ini. Restart connection diperlukan.
```

### Pattern D: Drop column safely

```sql
-- supabase/migrations/20260430090000_drop_legacy_field_from_tasks.sql

-- Step 1: Kalau ada code yang masih baca kolom, deploy code yang gak baca dulu.
-- Step 2: Baru jalanin migration ini.

ALTER TABLE public.tasks
  DROP COLUMN IF EXISTS legacy_field;

-- TODO: post-deploy, monitor application untuk error
```

### Pattern E: Helper functions migration awal

```sql
-- supabase/migrations/20260427000000_add_helper_functions.sql
-- Migration paling awal — semua function utility yang dipakai migration berikutnya

-- Function: set_updated_at — auto-update updated_at di trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function: current_user_role — RLS helper untuk avoid recursive lookup
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Shortcut booleans
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$ SELECT current_user_role() = 'admin' $$;
CREATE OR REPLACE FUNCTION public.is_manager() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$ SELECT current_user_role() = 'manager' $$;
CREATE OR REPLACE FUNCTION public.is_member() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$ SELECT current_user_role() = 'member' $$;
CREATE OR REPLACE FUNCTION public.is_viewer() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$ SELECT current_user_role() = 'viewer' $$;

COMMENT ON FUNCTION public.current_user_role IS 'Get app role of current authenticated user. SECURITY DEFINER to bypass RLS, prevents recursive lookup. ADR-002.';
```

## Anti-patterns yang harus dihindari

1. **Edit migration yang sudah applied di production** — JANGAN. Bikin migration baru.
2. **Migration tanpa naming timestamp** — order ambiguous, akan corrupt sequence
3. **Multiple `CREATE TABLE` di 1 file tanpa transaction** — kalau 1 fail di tengah, state inconsistent
4. **Lupa index FK** — query lambat, RLS lebih lambat
5. **`ALTER TYPE ADD VALUE` di tengah transaction** — Postgres reject (di < v12)
6. **Migration yang bergantung data hasil migration lain di transaction yang sama** — pakai 2 file terpisah
7. **DROP TABLE tanpa CASCADE awareness** — bisa hapus dependencies, atau gagal karena ada FK
8. **Edit `supabase/seed.sql` jadi destructive** — seed harus idempotent (`ON CONFLICT DO NOTHING`)

## Output format

Saat generate migration:

1. File: `supabase/migrations/{YYYYMMDDHHMMSS}_{snake_case_description}.sql`
2. Header comment standar (Tujuan, Refer, Dependencies, Reversal, Author)
3. Body: DDL/DML statements
4. Footer comment: TODO untuk pasangan RLS atau test jika applicable
5. Setelah file dibuat, kasih instruksi run:
   ```bash
   supabase db push    # apply ke local + linked project
   supabase migration list  # verify status
   ```

## Kapan TIDAK pakai skill ini

- User minta query data (SELECT) — itu bukan migration, langsung saja
- User minta ad-hoc SQL untuk debugging — pakai `supabase db psql` interactive
- User minta export/import data — beda concern (`pg_dump`, `pg_restore`)
- User pakai dashboard Supabase UI untuk DDL — JANGAN, itu bypass migration history. Kasih warning.

## Related

- ADR-001 (`docs/adr/ADR-001-supabase-managed.md`) — managed vs self-hosted
- ADR-002 (`docs/adr/ADR-002-rls-strategy.md`) — RLS pasangan migration
- Skill `rls-policy-writer` — untuk policy migration
- Skill `rls-tester` — untuk test pasangan policy
- Supabase docs: https://supabase.com/docs/guides/cli/local-development#database-migrations
