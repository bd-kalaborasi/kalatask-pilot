# Skill Issues — KalaTask Pilot

> File ini untuk track bug, gap, atau improvement opportunity di skill-skill
> yang ada di `.claude/skills/`. Skill author bisa pakai ini sebagai backlog
> untuk follow-up. Tidak block pilot development (workaround sudah ada di
> commit history per issue).

---

## supabase-migration skill — Pattern E bug

**Date discovered:** 2026-04-27
**Discovered by:** Claude Code during Sprint 1 helper functions migration apply
**Severity:** High (blocks foundation migration di greenfield DB)
**Status:** Workaround applied (commit `439e4ae`); skill update pending

### Issue

Pattern E example di `.claude/skills/supabase-migration/SKILL.md` (lines 350–381) menggunakan `LANGUAGE sql` untuk function yang reference `public.users` table:

```sql
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql              -- ← bug source
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;
```

Postgres eager-validate `LANGUAGE sql` function body saat `CREATE FUNCTION` (controlled via GUC `check_function_bodies`, default `on`). Kalau `public.users` belum ada saat migration apply, planner gagal resolve schema reference → error:

```
ERROR: 42P01: relation "public.users" does not exist
LINE N: SELECT role FROM public.users WHERE id = auth.uid();
```

### Impact

- **Pattern tidak workable di greenfield DB** (foundation migration scenario yang Pattern E sendiri claim sebagai use case-nya: "Migration paling awal — semua function utility yang dipakai migration berikutnya").
- Kontradiksi internal: skill text bilang ini foundation migration (no dependencies), tapi code-nya butuh `public.users` sudah exist.
- Misleading comment di header migration yang mengikuti pattern ini: assumption "Postgres deferred resolution untuk SQL fn body" tidak benar untuk `LANGUAGE sql`.

### Workaround applied di pilot

Convert 6 function yang reference `public.users` ke `LANGUAGE plpgsql`:

```sql
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql          -- ← lazy name resolution
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid());
END;
$$;
```

`LANGUAGE plpgsql` lazy-validate name resolution di runtime, jadi `CREATE FUNCTION` sukses. Function akan error kalau dipanggil sebelum `public.users` exist — tapi itu OK, karena urutan migration memang public.users dibuat sebelum function dipanggil dari RLS policy.

Commit history reference:
- Bug discovery: error saat owner apply via Supabase Dashboard (2026-04-27)
- Fix commit: `439e4ae` — `fix(db): convert helper functions ke plpgsql untuk lazy validation`

### Trade-off conversion plpgsql

Minor performance cost vs LANGUAGE sql:
- Lose function inlining optimization (planner tidak inline plpgsql ke calling query)
- Each call = function invocation overhead (microseconds)

Untuk pilot scale 30 user, negligible. STABLE marking masih cache hasil per query. Acceptable trade-off untuk pilot context.

### Recommendations untuk skill author

1. **Update Pattern E** gunakan `LANGUAGE plpgsql` (dengan body `BEGIN RETURN (...); END;`) untuk function dengan cross-table reference. Atau eksplisit pisah jadi 2 sub-pattern:
   - Pattern E1: helpers tanpa cross-table ref (LANGUAGE sql OK)
   - Pattern E2: helpers dengan cross-table ref (LANGUAGE plpgsql wajib)
2. **Tambah note eksplisit** di skill: "Pattern E require referenced table sudah exist — atau gunakan plpgsql untuk lazy validation."
3. **Test pattern di blank DB** sebelum commit ke skill. Pattern foundation migration paling sering dipakai di scenario greenfield, jadi paling kritis untuk validate.
4. **Dokumentasikan `check_function_bodies` GUC** sebagai konteks untuk reader yang mau pahami trade-off plpgsql vs sql untuk RLS helper functions.

### Cross-reference

- Skill file: `.claude/skills/supabase-migration/SKILL.md` (Pattern E di section "Pattern library", line 350-381)
- Migration affected: `supabase/migrations/20260427000000_add_helper_functions.sql`
- Postgres docs: https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-CHECK-FUNCTION-BODIES

---

## supabase-migration + rls-policy-writer skills — GRANT pattern gap

**Date discovered:** 2026-04-27
**Discovered by:** Claude Code during Sprint 1 pgTAP test execution
**Severity:** High (blocks all client API access ke RLS-protected tables)
**Status:** Workaround applied (migration `20260427120150_add_grants_users.sql`); skill update pending

### Issue

Both skills tidak mention pattern GRANT untuk role authenticated/anon/service_role di RLS-protected tables:

- `.claude/skills/supabase-migration/SKILL.md` — Pattern A-F (Create table, Add column, ENUM, Drop column, Helper functions) tidak include GRANT
- `.claude/skills/rls-policy-writer/SKILL.md` — Pattern A-F (Simple ownership, Role-based, Inheritance, Multi-condition, Limited-field UPDATE, Storage bucket) tidak include GRANT

Skill literal example (rls-policy-writer Pattern A):
```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  USING (user_id = auth.uid());
-- (no GRANT statement — gap)
```

Skill assume "RLS = sufficient access control." Itu salah.

### Reality

Postgres evaluate **RLS AFTER table-level privilege check**. Sequence query:

1. Check user has table privilege (SELECT/INSERT/UPDATE/DELETE) → throw `42501` kalau gagal
2. Apply RLS policy filter → return rows yang qualified

Tanpa GRANT, step 1 fail, RLS step 2 tidak pernah eksekusi. Default Supabase tidak auto-GRANT untuk role API (anon/authenticated/service_role) di tabel baru — terutama kalau migration di-apply via Dashboard SQL Editor (yang connect sebagai `postgres` role dengan restrictive default ACL untuk public schema).

### Impact

- Migration yang follow skill literal akan produce tabel yang **functional zero** untuk client API access.
- RLS policy tidak pernah evaluate — false sense of security.
- Test pgTAP gagal dengan `42501: permission denied for table` SEBELUM bisa verify RLS behavior.

Pilot Sprint 1 affected: pgTAP test `users_rls.test.sql` stuck di test #1 (anon SELECT) dengan permission error, padahal expectation-nya RLS-level deny (0 rows return).

### Workaround applied di pilot

Add GRANT statements via migration baru `20260427120150_add_grants_users.sql`:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
GRANT SELECT ON public.users TO anon;  -- atau skip untuk defense-in-depth
```

Forward-only migration, idempotent, tidak modify migration users existing (compliance dengan skill anti-pattern #1).

### Recommendations untuk skill author

1. **Update Pattern A-F di rls-policy-writer:** Tambah section "Required GRANT statements" SEBELUM CREATE POLICY block. Setiap pattern harus eksplisit show GRANT.

2. **Update Pattern A-F di supabase-migration:** Tambah Pattern baru `grants_for_rls_table` dengan template:
   ```sql
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.{table} TO authenticated;
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.{table} TO service_role;
   GRANT SELECT ON public.{table} TO anon;  -- optional, security choice
   ```

3. **Document trade-off di skill:** GRANT SELECT to anon vs defense-in-depth (no anon GRANT). Untuk PII-bearing tables, recommend defense-in-depth.

4. **Test pattern di blank Supabase project** sebelum commit ke skill. Pattern Sprint-1 yang ditemukan bug-nya: Pattern E (LANGUAGE sql eager validation, di entry sebelumnya) + GRANT gap (entry ini). Both ter-discover saat real-world apply, indicate skill author belum test di greenfield.

5. **Catatan pola problem:** Pattern E bug + GRANT gap = same root cause family (skill belum di-test di greenfield Supabase). Kemungkinan ada pattern bug serupa di Pattern lain — recommend audit lengkap skill.

### Cross-reference

- Skill file affected: `.claude/skills/supabase-migration/SKILL.md` (Pattern A-F), `.claude/skills/rls-policy-writer/SKILL.md` (Pattern A-F)
- Migration workaround: `supabase/migrations/20260427120150_add_grants_users.sql`
- Test affected: `supabase/tests/users_rls.test.sql` (test #1 stuck pre-fix)
- Postgres docs: https://www.postgresql.org/docs/current/sql-grant.html
- Supabase docs: https://supabase.com/docs/guides/database/postgres/row-level-security#granting-access-to-tables
