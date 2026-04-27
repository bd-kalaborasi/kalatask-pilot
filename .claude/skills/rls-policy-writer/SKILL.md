---
name: rls-policy-writer
description: Use this skill when writing, modifying, or reviewing Postgres Row-Level Security (RLS) policies for the KalaTask Supabase database. Trigger when the user asks to "write RLS policy", "tambah policy untuk tabel X", "enable RLS", "fix RLS bug", "update policy untuk role baru", or when creating a new migration that adds tables (every new table MUST get RLS from day one). This skill encodes the policy strategy locked in ADR-002 and prevents common pitfalls like recursive policy lookups, missing service-role bypass, and forgotten policies on JOIN tables. ALWAYS pair with `rls-tester` skill to write pgTAP tests for every policy created.
---

# RLS Policy Writer — KalaTask

## Tujuan skill ini

Skill ini memastikan setiap RLS policy yang ditulis untuk database KalaTask:

1. **Konsisten dengan ADR-002** — pattern matrix sudah locked, jangan invent policy baru
2. **Aman secara default** — `ENABLE RLS` + `FORCE RLS` di semua tabel, deny-by-default
3. **Performant** — index di kolom yang sering di-check (`auth.uid()`, `team_id`, `assignee_id`)
4. **Testable** — setiap policy harus punya pasangan test pgTAP (lihat skill `rls-tester`)

## Source of truth

**Selalu refer ke `docs/adr/ADR-002-rls-strategy.md`** untuk matrix policy per tabel × role × operasi. Jika kamu melihat gap di ADR-002 (misal tabel baru yang belum di-cover), STOP dan tanya owner — JANGAN improvisasi.

## Aturan WAJIB sebelum nulis policy

### 1. Setiap tabel baru = RLS dari migration pertama

Tidak boleh ada tabel di production tanpa RLS. Pattern di setiap migration yang `CREATE TABLE`:

```sql
-- 1. Create table
CREATE TABLE public.example_table (...);

-- 2. ENABLE + FORCE RLS langsung
ALTER TABLE public.example_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.example_table FORCE ROW LEVEL SECURITY;

-- 3. Tulis policy (minimum: SELECT untuk authenticated)
CREATE POLICY "..." ON public.example_table FOR SELECT TO authenticated USING (...);

-- 4. Index untuk kolom yang dipakai di USING/WITH CHECK
CREATE INDEX idx_example_table_owner ON public.example_table (owner_id);
```

> **`FORCE ROW LEVEL SECURITY`** penting karena tanpa ini, table owner (postgres role) bypass RLS. Untuk safety di pilot, force semua tabel.

### 2. Default deny — explicit allow

Postgres default kalau RLS enabled tanpa policy = nothing visible. Itu BAGUS. Tulis policy untuk `allow`, jangan tulis policy untuk `deny`.

❌ Salah: bikin policy "deny viewer" — RLS bukan firewall, ini access control.
✅ Benar: hanya bikin policy untuk role yang BOLEH access. Sisanya otomatis deny.

### 3. Pisah policy per role per operation

Lebih baik 4 policy kecil daripada 1 policy gabungan dengan `CASE WHEN` panjang. Reason:

- Lebih mudah di-test (1 policy = 1 test scenario)
- Lebih mudah di-review (security audit baca per policy)
- Postgres optimizer lebih happy

```sql
-- ❌ Hindari: 1 policy gabungan
CREATE POLICY "all roles select tasks" ON tasks FOR SELECT USING (
  CASE current_user_role()
    WHEN 'admin' THEN true
    WHEN 'manager' THEN ...
    WHEN 'member' THEN assignee_id = auth.uid()
    WHEN 'viewer' THEN true
  END
);

-- ✅ Pakai: policy per role
CREATE POLICY "tasks_select_admin" ON tasks FOR SELECT
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "tasks_select_member_assigned" ON tasks FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'member'
    AND assignee_id = auth.uid()
  );
-- ... dst per role
```

### 4. Naming convention policy

Format: `{table}_{operation}_{role}_{descriptor}`

Contoh:
- `tasks_select_admin_all`
- `tasks_select_member_assigned`
- `tasks_update_member_status_only`
- `comments_insert_anyone_with_task_access`

Konsisten supaya `pg_policies` view bisa di-grep dengan mudah saat audit.

### 5. Hindari recursive RLS lookup

⚠️ **Common pitfall:** policy di tabel `tasks` yang query tabel `users`, sementara `users` punya RLS yang nge-query `tasks`. Hasilnya: infinite loop, query timeout, atau silent error.

**Solusi:** pakai `SECURITY DEFINER` function untuk lookup role, BUKAN inline subquery ke tabel ber-RLS.

```sql
-- Helper function untuk get role current user
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER  -- bypass RLS saat di-call
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Pakai helper ini di policy
CREATE POLICY "tasks_select_admin_all" ON tasks FOR SELECT
  USING (current_user_role() = 'admin');
```

Helper function lain yang useful:
- `current_user_team_id()` — return team_id user yang sedang login
- `is_admin()` / `is_manager()` / `is_member()` / `is_viewer()` — boolean shortcut

> **Catatan:** function ini harus dibuat di migration paling awal (`001_helper_functions.sql`) sebelum migration tabel manapun.

### 6. Service role bypass — eksplisit & sengaja

Cowork agent + Edge Function tertentu pakai service role key (bypass RLS). Itu sengaja untuk:
- INSERT ke `notifications` (trigger generate notif)
- INSERT ke `activity_log` (DB trigger)
- INSERT/UPDATE ke `cowork_runs` (otomatis dari Cowork)

**Setiap penggunaan service role HARUS di-document di ADR atau comment migration**, supaya audit jelas. JANGAN expose service role key ke client side.

## Pattern library — copy-paste reference

### Pattern A: Simple ownership (tabel `notifications`)

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

-- User cuma bisa lihat notif sendiri
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- User cuma bisa update (mark as read) notif sendiri
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- INSERT cuma via service role (no policy = deny untuk authenticated)

CREATE INDEX idx_notifications_user_id ON notifications (user_id);
```

### Pattern B: Role-based access dengan helper (tabel `app_settings`)

```sql
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings FORCE ROW LEVEL SECURITY;

-- Semua role bisa SELECT (read settings)
CREATE POLICY "app_settings_select_authenticated" ON app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Cuma admin yang bisa UPDATE
CREATE POLICY "app_settings_update_admin" ON app_settings FOR UPDATE
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');
```

### Pattern C: Inheritance via parent (tabel `comments` inherit dari `tasks`)

```sql
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments FORCE ROW LEVEL SECURITY;

-- SELECT comment kalau bisa SELECT task parent-nya
CREATE POLICY "comments_select_via_task" ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = comments.task_id
      -- RLS di `tasks` otomatis filter SELECT — kalau row gak return, EXISTS false
    )
  );

-- INSERT comment kalau bisa SELECT task (kecuali viewer)
CREATE POLICY "comments_insert_via_task" ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_role() <> 'viewer'
    AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = comments.task_id)
    AND user_id = auth.uid()  -- enforce author_id konsisten
  );

-- UPDATE comment milik sendiri, max 5 menit window
CREATE POLICY "comments_update_own_5min" ON comments FOR UPDATE
  USING (
    user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '5 minutes'
  )
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_comments_task_id ON comments (task_id);
CREATE INDEX idx_comments_user_id ON comments (user_id);
```

### Pattern D: Multi-condition (tabel `tasks` untuk Member)

```sql
-- Member bisa SELECT task: assigned ke dirinya OR dia di task_watchers
CREATE POLICY "tasks_select_member" ON tasks FOR SELECT
  USING (
    is_member()  -- helper function
    AND (
      assignee_id = auth.uid()
      OR id IN (
        SELECT task_id FROM task_watchers WHERE user_id = auth.uid()
      )
    )
  );

CREATE INDEX idx_tasks_assignee_id ON tasks (assignee_id);
CREATE INDEX idx_task_watchers_user_id ON task_watchers (user_id);
CREATE INDEX idx_task_watchers_task_id ON task_watchers (task_id);
```

### Pattern E: Limited-field UPDATE (tabel `tasks` Member update status only)

⚠️ Postgres RLS tidak punya native column-level restriction. Workaround: pakai `WITH CHECK` yang compare row lama vs baru.

```sql
-- Member cuma boleh update kolom status & completed_at di task assigned ke dia
CREATE POLICY "tasks_update_member_status" ON tasks FOR UPDATE
  USING (
    is_member()
    AND assignee_id = auth.uid()
  )
  WITH CHECK (
    is_member()
    AND assignee_id = auth.uid()
    -- Tidak bisa enforce "kolom lain tidak berubah" via RLS murni.
    -- Solusi: trigger BEFORE UPDATE yang reset kolom non-allowed.
  );

-- Companion trigger untuk enforce field lock
CREATE OR REPLACE FUNCTION tasks_member_field_lock()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user_role() = 'member' THEN
    -- Reset kolom non-allowed ke nilai lama
    NEW.title := OLD.title;
    NEW.description := OLD.description;
    NEW.assignee_id := OLD.assignee_id;
    NEW.deadline := OLD.deadline;
    NEW.priority := OLD.priority;
    -- Allow: status, completed_at, updated_at
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_member_field_lock_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION tasks_member_field_lock();
```

> **Trade-off:** RLS + trigger combo lebih kompleks tapi adalah satu-satunya cara reliable di Postgres untuk column-level RBAC. Alternative (Edge Function dengan service role + manual check) lebih kompleks lagi dan lose Realtime auto-RLS.

### Pattern F: Storage bucket policy (Supabase Storage)

Storage RLS pakai SQL function di-call lewat policy di `storage.objects`:

```sql
-- Bucket task-attachments: READ kalau bisa SELECT task parent
CREATE POLICY "task_attachments_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'task-attachments'
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id::text = (string_to_array(name, '/'))[1]
      -- task-attachments path: {task_id}/{filename}
    )
  );

-- WRITE kalau bisa UPDATE task parent
CREATE POLICY "task_attachments_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id::text = (string_to_array(name, '/'))[1]
      -- WHERE clause akan ke-filter RLS di tabel tasks otomatis
    )
  );
```

## Workflow eksekusi

### Saat user minta "tulis policy untuk tabel X"

1. **Cek ADR-002** — apakah tabel X sudah ada di matrix policy plan?
   - Ada → ikuti matrix-nya, jangan deviate
   - Belum ada → STOP, tanya owner: "Tabel X belum di-cover di ADR-002. Mau saya draft addition ke ADR-002 dulu?"

2. **Identifikasi pattern** dari pattern library di atas (A-F).

3. **Tulis policy SQL** dengan struktur:
   - `ALTER TABLE ... ENABLE` + `FORCE ROW LEVEL SECURITY`
   - Policy SELECT untuk tiap role yang punya akses
   - Policy INSERT/UPDATE/DELETE untuk tiap role yang punya akses
   - Index di kolom yang dipakai policy
   - Comment di setiap policy: refer ke F nomor PRD atau matrix ADR-002

4. **Generate companion test stub** untuk skill `rls-tester` — kasih reminder ke user untuk lanjut bikin test setelah policy approved.

### Saat user minta "review RLS yang sudah ada"

1. Run query audit:
   ```sql
   -- Tabel mana yang RLS belum enabled?
   SELECT schemaname, tablename, rowsecurity, forcerowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
     AND (rowsecurity = false OR forcerowsecurity = false);
   ```

2. Untuk tiap tabel, list semua policy:
   ```sql
   SELECT tablename, policyname, cmd, roles, qual, with_check
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, cmd;
   ```

3. Cross-check vs matrix di ADR-002. Flag:
   - Tabel tanpa RLS enabled
   - Policy yang tidak ada di ADR-002 (suspicious — kapan ditambahkan dan kenapa)
   - Role yang seharusnya punya akses tapi tidak ada policy
   - Policy yang qual-nya nge-query tabel ber-RLS lain (potential recursive lookup)

## Anti-patterns yang harus dihindari

1. **Tidak pakai `FORCE ROW LEVEL SECURITY`** — postgres role bypass RLS. Selalu force di pilot.
2. **Inline subquery ke tabel ber-RLS** — bikin recursive lookup. Pakai SECURITY DEFINER helper.
3. **Policy gabungan dengan `CASE WHEN role`** — sulit di-test, sulit di-audit. Pisah per role.
4. **Lupa index** di kolom yang dipakai di `USING` / `WITH CHECK` — query lambat seiring data tumbuh.
5. **Policy yang allow `auth.uid() IS NULL`** — harusnya `TO authenticated`. `anon` role harus di-deny by default.
6. **Lupa `WITH CHECK` di INSERT/UPDATE** — `USING` doang gak cukup untuk INSERT/UPDATE, perlu `WITH CHECK` juga.
7. **Lupa policy untuk `task_watchers` / JOIN tables** — sering ter-skip karena kelihatannya "internal".
8. **Pakai `auth.role()` untuk check role custom** — `auth.role()` itu Postgres role (`authenticated`/`anon`), bukan role aplikasi. Pakai `current_user_role()` helper.

## Output format

Saat kamu generate policy SQL:

1. Letakkan di file migration baru: `supabase/migrations/{timestamp}_{description}.sql`
2. Format sesuai naming convention: `20260427120000_add_rls_tasks.sql`
3. Setiap policy disertai comment:
   ```sql
   -- Policy: tasks_select_member
   -- ADR-002 §tasks (Member SELECT): assignee_id = auth.uid() OR di task_watchers
   -- PRD F1, F4
   CREATE POLICY ...
   ```
4. Akhiri file dengan reminder block:
   ```sql
   -- TODO: pasangan test pgTAP harus dibuat di:
   -- supabase/tests/rls/{table}_{role}_{operation}.sql
   -- Lihat skill `rls-tester`.
   ```

## Kapan TIDAK pakai skill ini

- User tanya konseptual tentang RLS (jelaskan via penjelasan biasa, bukan generate SQL)
- User minta bypass RLS untuk debugging (kasih warning + saran pakai `SET ROLE postgres` di dev only)
- User minta hapus RLS dari tabel production — STOP, tanya kenapa, ini security regression

## Related

- ADR-002 (`docs/adr/ADR-002-rls-strategy.md`) — source of truth matrix policy
- Skill `rls-tester` — pasangan untuk write pgTAP test
- Skill `supabase-migration` — naming convention dan rollback strategy
- PRD §7 (Database Schema) dan §9.1 (Tech constraints — RLS wajib)
- CLAUDE.md Checkpoint 2 — manual test RLS sebelum lanjut Sprint 2
