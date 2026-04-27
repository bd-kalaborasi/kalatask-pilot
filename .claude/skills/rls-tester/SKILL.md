---
name: rls-tester
description: Use this skill when writing pgTAP tests for Row-Level Security (RLS) policies in the KalaTask Supabase database. Trigger when the user asks to "test RLS", "tulis test untuk policy X", "verify RLS", "check coverage RLS", or right after creating/modifying a policy via the `rls-policy-writer` skill. Every RLS policy MUST have at least one positive test (allowed access works) and one negative test (forbidden access blocked). Coverage target per ADR-002: ~80 test cases across all policies. This skill provides pgTAP scaffolding, role-impersonation patterns, and coverage tracking.
---

# RLS Tester — KalaTask

## Tujuan skill ini

Skill ini memastikan setiap RLS policy yang dibuat punya test yang:

1. **Membuktikan policy bekerja** — positive test (role X bisa akses data X) + negative test (role Y tidak bisa)
2. **Idempotent** — bisa di-run berkali-kali, tidak bergantung state DB sebelumnya
3. **Isolated** — pakai `BEGIN/ROLLBACK` supaya test data tidak persist
4. **Self-documenting** — nama test jelas menjelaskan scenario yang di-test

## Source of truth

- Matrix policy di `docs/adr/ADR-002-rls-strategy.md` — daftar semua kombinasi role × tabel × operasi yang harus ditest
- Coverage target: **80+ test cases** untuk seluruh pilot

## Setup pgTAP (one-time)

pgTAP adalah extension Postgres untuk unit testing. Install via migration:

```sql
-- supabase/migrations/000_setup_pgtap.sql (di-run sekali)
CREATE EXTENSION IF NOT EXISTS pgtap;
```

> Supabase managed sudah support pgTAP, tinggal enable. Test di-run via Supabase CLI: `supabase test db`.

## Struktur folder test

```
supabase/
├── migrations/
└── tests/
    └── rls/
        ├── _helpers.sql                    # function setup/teardown shared
        ├── tasks_select_admin_test.sql
        ├── tasks_select_member_assigned_test.sql
        ├── tasks_select_member_blocked_other_test.sql
        ├── tasks_update_member_status_only_test.sql
        ├── ...
        └── COVERAGE.md                     # tracker coverage manual
```

**Naming convention test file:** `{table}_{operation}_{role}_{scenario}_test.sql`

Contoh:
- `tasks_select_member_assigned_test.sql` — Member bisa SELECT task assigned ke dirinya
- `tasks_select_member_blocked_other_test.sql` — Member TIDAK bisa SELECT task orang lain
- `comments_update_own_5min_window_test.sql` — UPDATE comment sendiri dalam 5 menit
- `comments_update_own_after_5min_blocked_test.sql` — UPDATE comment sendiri SETELAH 5 menit gagal

## Aturan WAJIB untuk setiap test

### 1. Selalu pakai BEGIN/ROLLBACK

Test tidak boleh mengubah state DB permanently. Wrap setiap test dengan transaction yang di-rollback:

```sql
BEGIN;
SELECT plan(2);  -- jumlah assertion

-- ... setup + assertions ...

SELECT * FROM finish();
ROLLBACK;
```

### 2. Setup data dengan UUID predictable

Pakai UUID literal yang gampang di-track di assertion, jangan `gen_random_uuid()`:

```sql
-- ❌ Hindari (UUID random sulit di-debug saat fail)
INSERT INTO users (id, email, role) VALUES (gen_random_uuid(), 'a@test.com', 'member');

-- ✅ Pakai (UUID literal, traceable)
INSERT INTO users (id, email, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@test.com', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'manager@test.com', 'manager'),
  ('33333333-3333-3333-3333-333333333333', 'member-a@test.com', 'member'),
  ('44444444-4444-4444-4444-444444444444', 'member-b@test.com', 'member'),
  ('55555555-5555-5555-5555-555555555555', 'viewer@test.com', 'viewer');
```

Convention: 8-digit pertama UUID = role identifier. `1111...` admin, `2222...` manager, `3333..4444` members, `5555...` viewer.

### 3. Impersonate user dengan SET LOCAL

Untuk test policy dari sudut pandang role tertentu, override JWT claim di session:

```sql
-- Set session sebagai authenticated user dengan ID tertentu
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
```

> **Catatan:** `auth.uid()` baca `request.jwt.claims->>'sub'`. `current_user_role()` (helper kita) baca dari tabel `users`. Pastikan user dengan ID itu sudah di-INSERT sebelum SET claim.

### 4. Pasangkan positive + negative test

Setiap policy minimum punya 2 test:

- **Positive:** "Role X yang seharusnya boleh, BENAR-BENAR bisa"
- **Negative:** "Role Y yang seharusnya TIDAK boleh, BENAR-BENAR tidak bisa"

Tanpa negative test, kamu tidak tahu apakah policy benar-benar restrictive atau cuma "all allow" yang kebetulan terlihat bekerja.

### 5. Comment header di setiap file test

```sql
-- =============================================================
-- Test: tasks_select_member_blocked_other
-- Policy: tasks_select_member (lihat migrations/{ts}_add_rls_tasks.sql)
-- ADR-002 §tasks Member SELECT
-- PRD F1, F4
--
-- Scenario: Member B mencoba SELECT task yang assigned ke Member A.
-- Expected: query return empty result (RLS filter row-nya).
-- =============================================================
```

## Pattern library — copy-paste reference

### Template helper functions

File `supabase/tests/rls/_helpers.sql`:

```sql
-- Function: setup_test_users()
-- Insert 5 user dengan role berbeda + 2 team
-- Idempotent: ON CONFLICT DO NOTHING

CREATE OR REPLACE FUNCTION test_setup_users()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO teams (id, name) VALUES
    ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Team Alpha'),
    ('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Team Beta')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO users (id, email, role, team_id, full_name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@test.com',    'admin',   NULL,                                   'Admin Test'),
    ('22222222-2222-2222-2222-222222222222', 'manager-a@test.com','manager', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Manager Alpha'),
    ('33333333-3333-3333-3333-333333333333', 'member-a1@test.com','member',  'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Member Alpha 1'),
    ('44444444-4444-4444-4444-444444444444', 'member-b1@test.com','member',  'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Member Beta 1'),
    ('55555555-5555-5555-5555-555555555555', 'viewer@test.com',   'viewer',  NULL,                                   'Viewer Test')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Function: impersonate(uuid)
-- Shortcut untuk SET LOCAL claims

CREATE OR REPLACE FUNCTION test_impersonate(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'SET LOCAL "request.jwt.claims" = %L',
    json_build_object('sub', user_uuid::text, 'role', 'authenticated')::text
  );
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$;
```

> Note: helper function ini boleh di-create di schema `public` atau `test`. Saran: schema `test` agar terpisah dari production functions.

### Pattern A: Positive test — role boleh akses

```sql
-- File: tasks_select_member_assigned_test.sql
BEGIN;
SELECT plan(1);

-- Setup
SELECT test_setup_users();

INSERT INTO projects (id, name, owner_id) VALUES
  ('proj1111-1111-1111-1111-111111111111', 'Project A', '22222222-2222-2222-2222-222222222222');

INSERT INTO tasks (id, title, assignee_id, project_id, status) VALUES
  ('task1111-1111-1111-1111-111111111111', 'Task assigned to Member A1', '33333333-3333-3333-3333-333333333333', 'proj1111-1111-1111-1111-111111111111', 'todo');

-- Impersonate Member A1
SELECT test_impersonate('33333333-3333-3333-3333-333333333333');

-- Assert: Member A1 bisa SELECT task yang assigned ke dia
SELECT results_eq(
  $$ SELECT id FROM tasks WHERE id = 'task1111-1111-1111-1111-111111111111' $$,
  $$ VALUES ('task1111-1111-1111-1111-111111111111'::uuid) $$,
  'Member should see task assigned to them'
);

SELECT * FROM finish();
ROLLBACK;
```

### Pattern B: Negative test — role tidak boleh akses

```sql
-- File: tasks_select_member_blocked_other_test.sql
BEGIN;
SELECT plan(1);

-- Setup: 1 task assigned ke Member A1
SELECT test_setup_users();

INSERT INTO projects (id, name, owner_id) VALUES
  ('proj1111-1111-1111-1111-111111111111', 'Project A', '22222222-2222-2222-2222-222222222222');

INSERT INTO tasks (id, title, assignee_id, project_id, status) VALUES
  ('task1111-1111-1111-1111-111111111111', 'Confidential A1 task', '33333333-3333-3333-3333-333333333333', 'proj1111-1111-1111-1111-111111111111', 'todo');

-- Impersonate Member B1 (orang lain)
SELECT test_impersonate('44444444-4444-4444-4444-444444444444');

-- Assert: Member B1 TIDAK bisa SELECT task milik Member A1
SELECT is_empty(
  $$ SELECT id FROM tasks WHERE id = 'task1111-1111-1111-1111-111111111111' $$,
  'Member should NOT see task assigned to another member'
);

SELECT * FROM finish();
ROLLBACK;
```

### Pattern C: Test INSERT dengan WITH CHECK

```sql
-- File: tasks_insert_member_blocked_test.sql
-- Member tidak boleh INSERT task baru (cuma admin & manager yang boleh)
BEGIN;
SELECT plan(1);

SELECT test_setup_users();

INSERT INTO projects (id, name, owner_id) VALUES
  ('proj1111-1111-1111-1111-111111111111', 'Project A', '22222222-2222-2222-2222-222222222222');

-- Impersonate Member A1
SELECT test_impersonate('33333333-3333-3333-3333-333333333333');

-- Assert: INSERT harus throw error (atau row count = 0 di RETURNING)
SELECT throws_ok(
  $$ INSERT INTO tasks (title, project_id, status)
     VALUES ('Sneaky task', 'proj1111-1111-1111-1111-111111111111', 'todo') $$,
  '42501',  -- SQLSTATE for insufficient_privilege (RLS violation)
  NULL,
  'Member should NOT be able to INSERT new task'
);

SELECT * FROM finish();
ROLLBACK;
```

> **Note:** RLS violation Postgres throw error code `42501`. Test pakai `throws_ok` dengan code itu untuk strict assertion.

### Pattern D: Test UPDATE limited-field (RLS + trigger)

```sql
-- File: tasks_update_member_field_lock_test.sql
-- Member bisa UPDATE status, TAPI tidak bisa UPDATE title (di-reset oleh trigger)
BEGIN;
SELECT plan(2);

SELECT test_setup_users();

INSERT INTO projects (id, name, owner_id) VALUES
  ('proj1111-1111-1111-1111-111111111111', 'Project A', '22222222-2222-2222-2222-222222222222');

INSERT INTO tasks (id, title, assignee_id, project_id, status) VALUES
  ('task1111-1111-1111-1111-111111111111', 'Original Title', '33333333-3333-3333-3333-333333333333', 'proj1111-1111-1111-1111-111111111111', 'todo');

-- Impersonate Member A1
SELECT test_impersonate('33333333-3333-3333-3333-333333333333');

-- Member coba update title + status
UPDATE tasks
  SET title = 'Hacked Title', status = 'in_progress'
  WHERE id = 'task1111-1111-1111-1111-111111111111';

-- Assert 1: Status berhasil di-update
SELECT is(
  (SELECT status FROM tasks WHERE id = 'task1111-1111-1111-1111-111111111111'),
  'in_progress'::task_status,
  'Member can update status'
);

-- Assert 2: Title TIDAK berubah (di-reset oleh trigger field-lock)
SELECT is(
  (SELECT title FROM tasks WHERE id = 'task1111-1111-1111-1111-111111111111'),
  'Original Title',
  'Member CANNOT change title (locked by trigger)'
);

SELECT * FROM finish();
ROLLBACK;
```

### Pattern E: Test inheritance via parent (comments via tasks)

```sql
-- File: comments_select_inherit_task_visibility_test.sql
BEGIN;
SELECT plan(2);

SELECT test_setup_users();

INSERT INTO projects (id, name, owner_id) VALUES
  ('proj1111-1111-1111-1111-111111111111', 'Project A', '22222222-2222-2222-2222-222222222222');

-- Task milik Member A1, comment dari Member A1
INSERT INTO tasks (id, title, assignee_id, project_id, status) VALUES
  ('task1111-1111-1111-1111-111111111111', 'Task A', '33333333-3333-3333-3333-333333333333', 'proj1111-1111-1111-1111-111111111111', 'todo');

INSERT INTO comments (id, task_id, user_id, content) VALUES
  ('comm1111-1111-1111-1111-111111111111', 'task1111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Internal note');

-- Impersonate Member A1 — bisa lihat task → bisa lihat comment
SELECT test_impersonate('33333333-3333-3333-3333-333333333333');

SELECT isnt_empty(
  $$ SELECT id FROM comments WHERE id = 'comm1111-1111-1111-1111-111111111111' $$,
  'Member A1 can see comment on own task'
);

-- Reset session
RESET ROLE;

-- Impersonate Member B1 — tidak bisa lihat task → tidak bisa lihat comment
SELECT test_impersonate('44444444-4444-4444-4444-444444444444');

SELECT is_empty(
  $$ SELECT id FROM comments WHERE id = 'comm1111-1111-1111-1111-111111111111' $$,
  'Member B1 cannot see comment on task they have no access to'
);

SELECT * FROM finish();
ROLLBACK;
```

### Pattern F: Test temporal constraint (5-menit window untuk edit comment)

```sql
-- File: comments_update_after_5min_blocked_test.sql
BEGIN;
SELECT plan(1);

SELECT test_setup_users();

-- Setup task & comment dengan created_at 10 menit lalu
INSERT INTO projects (id, name, owner_id) VALUES
  ('proj1111-1111-1111-1111-111111111111', 'Project A', '22222222-2222-2222-2222-222222222222');

INSERT INTO tasks (id, title, assignee_id, project_id, status) VALUES
  ('task1111-1111-1111-1111-111111111111', 'Task A', '33333333-3333-3333-3333-333333333333', 'proj1111-1111-1111-1111-111111111111', 'todo');

INSERT INTO comments (id, task_id, user_id, content, created_at) VALUES
  ('comm1111-1111-1111-1111-111111111111', 'task1111-1111-1111-1111-111111111111',
   '33333333-3333-3333-3333-333333333333', 'Original', NOW() - INTERVAL '10 minutes');

-- Impersonate Member A1 (author comment)
SELECT test_impersonate('33333333-3333-3333-3333-333333333333');

-- Assert: UPDATE setelah 5 menit harus 0 row affected (RLS USING failed)
SELECT is(
  (
    WITH updated AS (
      UPDATE comments SET content = 'Edited after 10 min'
      WHERE id = 'comm1111-1111-1111-1111-111111111111'
      RETURNING 1
    )
    SELECT COUNT(*) FROM updated
  ),
  0::bigint,
  'Cannot edit own comment after 5-minute window'
);

SELECT * FROM finish();
ROLLBACK;
```

## Coverage tracking

File `supabase/tests/rls/COVERAGE.md` — manual checklist yang di-update saat policy + test ditambahkan:

```markdown
# RLS Test Coverage

Last updated: YYYY-MM-DD

## Tabel: tasks

| Operasi | Admin | Manager | Member | Viewer |
|---|---|---|---|---|
| SELECT | ✅ tasks_select_admin_test.sql | ✅ tasks_select_manager_team_test.sql | ✅ tasks_select_member_assigned_test.sql<br>✅ tasks_select_member_blocked_other_test.sql | ✅ tasks_select_viewer_all_test.sql |
| INSERT | ✅ tasks_insert_admin_test.sql | ✅ tasks_insert_manager_test.sql | ✅ tasks_insert_member_blocked_test.sql | ✅ tasks_insert_viewer_blocked_test.sql |
| UPDATE | ✅ ... | ✅ ... | ✅ ... | ✅ tasks_update_viewer_blocked_test.sql |
| DELETE | ✅ ... | ✅ ... | ✅ tasks_delete_member_blocked_test.sql | ✅ tasks_delete_viewer_blocked_test.sql |

**Coverage tasks:** 16/16 ✅

## Tabel: comments
...

---

## Summary

- Total test files: X
- Total assertions: Y
- Coverage by table:
  - tasks: 16/16
  - comments: 12/12
  - users: 8/8
  - ... 
- **Overall: Z / ~80 target**
```

## Workflow eksekusi

### Saat user minta "tulis test untuk policy X"

1. **Identifikasi policy** — baca file migration yang berisi policy X
2. **Mapping ke ADR-002** — confirm scenario yang harus di-test (matrix role × operation)
3. **Generate minimum 2 test file** per policy (positive + negative)
4. **Update COVERAGE.md** — tambahkan checkmark di matrix
5. **Generate test runner snippet** untuk masuk ke CI nanti:
   ```bash
   supabase test db
   ```

### Saat user minta "review coverage RLS"

1. List semua policy: `SELECT * FROM pg_policies WHERE schemaname = 'public'`
2. List semua test file di `supabase/tests/rls/`
3. Cross-check vs `COVERAGE.md`
4. Flag gap: policy yang belum ada test

### Saat user minta "fix test yang fail"

1. Run `supabase test db`, capture output
2. Untuk tiap fail:
   - Apakah test salah (bug di test) atau policy salah (bug di RLS)?
   - Cek diff antara expected vs actual
3. Fix bug → re-run

## Anti-patterns yang harus dihindari

1. **Test tanpa ROLLBACK** — bikin test data persist, run kedua langsung corrupt
2. **UUID random di setup** — sulit di-debug saat fail
3. **Hanya positive test, tanpa negative** — gak tau policy benar-benar restrictive atau cuma allow-all
4. **Test multiple scenario di 1 file** — sulit di-debug, sulit re-run subset. 1 file = 1 scenario.
5. **Lupa `RESET ROLE`** sebelum impersonate user lain di test yang sama
6. **Test dependency antar file** — tiap test harus self-contained, gak ada urutan run yang harus di-respect
7. **Skip test untuk Admin** karena "ya pasti bisa" — tetap test, supaya policy admin dipastikan ada (bukan sekadar absence-of-restriction)
8. **Pakai timestamp `NOW()` tanpa control** — flaky test, pakai timestamp explicit (`'2026-01-01 10:00:00'`)

## Output format

Saat generate test file:

1. Letakkan di `supabase/tests/rls/{table}_{operation}_{role}_{scenario}_test.sql`
2. Sertakan header comment standar
3. Update `supabase/tests/rls/COVERAGE.md` dengan checkmark
4. Akhiri response dengan ringkasan: "Test created: X. Coverage updated: Y/80. Run: `supabase test db`"

## Kapan TIDAK pakai skill ini

- User minta integration test atau E2E test (ini RLS-specific, bukan general testing)
- User minta load test / performance test untuk RLS — itu butuh tools beda (pgbench, dll)
- User minta test untuk Edge Function logic — itu pakai Deno test runner, bukan pgTAP

## Related

- ADR-002 (`docs/adr/ADR-002-rls-strategy.md`) — coverage target & matrix
- Skill `rls-policy-writer` — pasangan untuk write policy (test always paired)
- Skill `supabase-migration` — naming convention migration
- CLAUDE.md Checkpoint 2 — manual + automated test sebelum lanjut Sprint 2
- pgTAP docs: https://pgtap.org/documentation.html
