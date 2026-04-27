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
