# ADR-002: Row-Level Security (RLS) Strategy

- **Status:** Accepted
- **Date:** 2026-04-27
- **Deciders:** Owner (BD), refer ke PRD section 7
- **Context:** PRD v0.2, builds on ADR-001 (Supabase managed)

---

## Context

Pilot Trackr punya 4 role dengan akses berbeda (PRD F4):
- **Admin:** full access + user management
- **Manager:** lihat & assign task tim-nya
- **Member:** lihat & update task yang assigned ke dirinya
- **Viewer (manajemen):** read-only ke semua dashboard

Tanpa security boundary yang ketat, multi-role app rentan terhadap:
- Member bisa lihat task confidential team lain via API direct call
- Manager bisa update task tim lain (bypass UI restriction)
- Viewer bisa edit task via crafted request

PRD section 9.1 menetapkan: **RLS policy ENABLED di semua tabel sebelum production. Tidak boleh rely on UI-only access control.**

## Decision

**Enforce semua access control di Postgres RLS level.** UI hanya reflect apa yang DB return — tidak ada role check di frontend yang tidak juga di-enforce di RLS.

Service role key (untuk Edge Function) bypass RLS — hanya dipakai untuk operasi yang memang harus bypass (Cowork sync, archival), tidak boleh di-expose ke client.

## RLS policy plan per tabel

### `users`

| Operasi | Admin | Manager | Member | Viewer |
|---|---|---|---|---|
| SELECT | All | Anggota team_id sama + diri sendiri | Diri sendiri | All |
| UPDATE | All | Diri sendiri (limited fields: full_name, locale, onboarding_state) | Diri sendiri (limited fields) | Diri sendiri (limited fields) |
| INSERT | All | ❌ | ❌ | ❌ |
| DELETE | All | ❌ | ❌ | ❌ |

**Policy SQL pattern:**
```sql
-- SELECT untuk Manager (bisa lihat tim-nya)
CREATE POLICY "Manager can view team members" ON users
  FOR SELECT
  USING (
    auth.uid() = id
    OR team_id IN (SELECT team_id FROM users WHERE id = auth.uid() AND role = 'manager')
  );
```

### `teams`

| Operasi | Admin | Manager | Member | Viewer |
|---|---|---|---|---|
| SELECT | All | Team-nya | Team-nya | All |
| INSERT/UPDATE/DELETE | All | ❌ | ❌ | ❌ |

### `projects`

| Operasi | Admin | Manager | Member | Viewer |
|---|---|---|---|---|
| SELECT | All | Project di mana ada task untuk team-nya | Project di mana dia assigned di salah satu task | All |
| INSERT | All | All (auto set owner_id = auth.uid()) | ❌ | ❌ |
| UPDATE | All | Project yang owner_id = auth.uid() | ❌ | ❌ |
| DELETE (soft via status='archived') | All | Project yang owner_id = auth.uid() | ❌ | ❌ |

### `tasks` ⚠️ (paling critical)

| Operasi | Admin | Manager | Member | Viewer |
|---|---|---|---|---|
| SELECT | All | Task milik anggota team-nya OR di project yang dia owner | Task assigned ke diri sendiri OR di task_watchers | All |
| INSERT | All | All (auto set created_by = auth.uid()) | Subtask dari task yang dia assigned | ❌ |
| UPDATE (full) | All | Task milik anggota team-nya | ❌ | ❌ |
| UPDATE (limited: status, completed_at) | All | All applicable | Task assigned ke diri sendiri | ❌ |
| DELETE | All | Task yang created_by = auth.uid() | ❌ | ❌ |

**Policy SQL pattern (SELECT untuk Member):**
```sql
CREATE POLICY "Member can view own tasks" ON tasks
  FOR SELECT
  USING (
    assignee_id = auth.uid()
    OR id IN (SELECT task_id FROM task_watchers WHERE user_id = auth.uid())
  );
```

### `comments`

| Operasi | Admin | Manager | Member | Viewer |
|---|---|---|---|---|
| SELECT | Mengikuti SELECT task parent | Sama | Sama | Sama |
| INSERT | Boleh kalau bisa SELECT task | Sama | Sama | ❌ |
| UPDATE | Comment milik sendiri (5 menit window) | Sama | Sama | ❌ |
| DELETE | Comment milik sendiri OR semua kalau Admin | Comment milik sendiri | Comment milik sendiri | ❌ |

### `attachments`

Sama dengan `comments`. Plus check storage bucket policy di Supabase Storage.

### `task_watchers`

| Operasi | Admin | Manager | Member | Viewer |
|---|---|---|---|---|
| SELECT | Mengikuti SELECT task | Sama | Sama | Sama |
| INSERT/DELETE | Untuk task yang bisa di-SELECT | Sama | Diri sendiri saja (subscribe/unsubscribe own) | ❌ |

### `activity_log`

| Operasi | Admin | Manager | Member | Viewer |
|---|---|---|---|---|
| SELECT | Mengikuti SELECT task | Sama | Sama | Sama |
| INSERT | ❌ (via DB trigger only) | ❌ | ❌ | ❌ |
| UPDATE/DELETE | ❌ (immutable) | ❌ | ❌ | ❌ |

### `notifications`

| Operasi | Admin | Manager | Member | Viewer |
|---|---|---|---|---|
| SELECT | Diri sendiri | Diri sendiri | Diri sendiri | Diri sendiri |
| UPDATE (mark as read) | Diri sendiri | Diri sendiri | Diri sendiri | Diri sendiri |
| INSERT | ❌ (via DB trigger / Edge Function only) | ❌ | ❌ | ❌ |

### `cowork_runs`

| Operasi | Admin | Manager | Member | Viewer |
|---|---|---|---|---|
| SELECT | All | All | ❌ | All |
| INSERT/UPDATE | ❌ (service role only) | ❌ | ❌ | ❌ |

### `app_settings` (untuk threshold configurable)

| Operasi | Admin | Manager | Member | Viewer |
|---|---|---|---|---|
| SELECT | All | All | All | All |
| UPDATE | All | ❌ | ❌ | ❌ |

## Storage bucket policy (Supabase Storage)

Bucket `task-attachments`:
- **READ:** user yang bisa SELECT task parent dari attachment
- **WRITE:** user yang bisa UPDATE task parent
- **Path convention:** `{task_id}/{filename}` — RLS check via task_id parsing

## Testing strategy

Setiap policy WAJIB punya test di `/supabase/tests/rls/`. Pakai `pgtap` dengan pattern:

```sql
-- Test: Member tidak bisa SELECT task milik orang lain
BEGIN;
SELECT plan(1);

-- Setup: 2 user, 1 task milik user A
INSERT INTO users (id, email, role) VALUES
  ('aaaa-...', 'a@test.com', 'member'),
  ('bbbb-...', 'b@test.com', 'member');
INSERT INTO tasks (id, title, assignee_id) VALUES
  ('task-a', 'Task A', 'aaaa-...');

-- Set session sebagai user B
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "bbbb-..."}';

-- Assert: B tidak bisa lihat task A
SELECT is_empty(
  $$ SELECT id FROM tasks WHERE id = 'task-a' $$,
  'Member B should not see task assigned to A'
);

SELECT * FROM finish();
ROLLBACK;
```

**Coverage target:** 100% untuk semua policy SELECT, INSERT, UPDATE, DELETE per role per tabel. Total estimasi: ~80 test cases.

## Consequences

### Positif
- Security boundary di DB level → bahkan kalau ada bug UI atau API exploit, data tetap aman
- RLS otomatis enforced di Realtime subscription, REST API, dan Edge Function (kalau pakai user JWT, bukan service role)
- Audit-able: policy ada di kode, bisa di-review

### Negatif (mitigasi)
- **Performance impact:** RLS check di setiap query. Mitigasi: index di kolom yang sering dipakai policy (`assignee_id`, `team_id`, `project_id`, `created_by`).
- **Complexity testing:** 80+ test case adalah significant effort. Mitigasi: prioritize test untuk tabel `tasks`, `comments`, `users` (top 3 risk).
- **Edge Function harus extra hati-hati:** kalau pakai service role key, RLS bypass. Setiap Edge Function harus manual implement role check + audit log.

## Trigger untuk revisit ADR ini

- Penambahan role baru (misal "external collaborator") — perlu policy baru di semua tabel
- Penambahan tabel baru — auto include policy plan
- Audit menemukan bypass — fix + add regression test

## Related

- PRD section 7 (Database Schema + RLS overview)
- PRD section 9.1 (Tech constraints — RLS wajib)
- Checkpoint 2 di CLAUDE.md (manual test RLS sebelum lanjut Sprint 2)
