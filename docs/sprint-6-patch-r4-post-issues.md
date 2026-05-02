# Sprint 6 Patch R4 — Post-Apply Issue Fixes

**Date:** 2026-05-02 (day after R4 close)
**Tag context:** runs on top of `sprint-6-patch-round-4`
**Trigger:** owner ran `supabase db push` (the 4 R4 migrations) and then exercised the new UI surfaces. Two issues surfaced.

---

## Issue 1 — `/settings` Notifikasi: no visible save confirmation

### Reproduction (owner-reported)

1. Login as admin → /settings → Notifikasi tab
2. Toggle a preference (e.g. "Tugas di-assign ke kamu")
3. Refresh the page → toggle state persisted ✓
4. **Concern:** UI gave no "Saved" feedback. Owner couldn't tell whether the toggle had reached the server, since other settings (`Edit nama`, `Ubah password`) use explicit "Simpan" buttons.

### Diagnosis

Source: `SettingsPage.tsx` `NotificationsSection.toggle` already auto-saved per click via `update_notif_pref` RPC with optimistic UI. The pattern was correct (toggles industry-standard for binary preferences — iOS, GitHub, Slack all behave this way; explicit "Simpan" is for multi-field forms). What was missing: **observable confirmation**. Only feedback was a brief `disabled={saving === ...}` flicker — too subtle.

**Decision:** keep auto-save (consistent with platform conventions; explicit Simpan would be unergonomic for 8 toggles), add transient `Menyimpan…` / `✓ Tersimpan` indicator inline + a one-line "Perubahan tersimpan otomatis" hint above the list.

### Fix

`apps/web/src/pages/SettingsPage.tsx` `NotificationsSection`:

- New `savedFlash: Record<event_type, stamp>` state
- After each successful `update_notif_pref`, set the stamp; clear after 1.8s
- Render inline `aria-live="polite"` span next to the toggle: `Menyimpan…` while saving, `✓ Tersimpan` for 1.8s after, fade out
- New top-of-section copy: `Perubahan tersimpan otomatis saat kamu toggle.`
- `data-event` attr on each toggle for E2E targeting

Microcopy follows BRAND.md §6 voice (santai-profesional, present tense).

---

## Issue 2 — `/admin` Anggota Tim: invite submit success but pending invite invisible

### Reproduction (owner-reported)

1. Login as admin → /settings?section=members
2. Click "+ Undang anggota" → fill email → "Kirim undangan"
3. Success toast appears ✓
4. **Bug:** the invited email never appears anywhere on the page — owner thought submit had silently failed.

### Diagnosis

Two distinct defects collaborated:

**(a) Missing UI consumer (frontend bug).**
`MembersSection` listed only rows from `public.users` (`SELECT id, full_name, email, role…`). Pending invites live in `public.user_invites` (separate table). The component had a TODO marker on line 794:

```ts
<InviteButton onInvited={() => { /* Sprint 7+: refresh invite list */ }} />
```

— callback intentionally a no-op. So even if the RPC had worked end-to-end, the table would still never show pending invites, because no view component ever queried them.

**(b) `list_user_invites()` RPC raised `column reference "role" is ambiguous` (DB bug).**
Caught only after wiring the new panel to the RPC. Function definition:

```sql
CREATE OR REPLACE FUNCTION public.list_user_invites()
RETURNS TABLE(
  id uuid, email text, role text, …  -- ← OUT-param `role` declared here
)
LANGUAGE plpgsql
…
DECLARE caller_role text;
BEGIN
  …
  SELECT role INTO caller_role FROM public.users WHERE id = uid;
  -- ↑ unqualified `role` collides with the OUT-param `role`
```

PL/pgSQL adds OUT-param column names to the function-body name space. With `RETURNS TABLE(role …)` declared, an unqualified `role` reference inside the body becomes ambiguous between `users.role` and the OUT alias. `create_user_invite` and `revoke_user_invite` had the same line but didn't blow up, because they don't use `RETURNS TABLE` — so no OUT-param shadow exists.

Owner's network tab would have shown a 400/500 from `/rest/v1/rpc/list_user_invites`, but since the panel didn't exist yet, that RPC was never called from the working app — the failure only surfaced once the new panel started polling.

### Fix

Three coordinated changes:

1. **Add `PendingInvitesPanel` component** in `SettingsPage.tsx`.
   - Reads `list_user_invites()` RPC, filters `status = 'pending'`
   - Renders email + role + invited_at + expires_at per row + revoke button
   - Renders `null` when empty (so it stays hidden when there's no pending state)
   - `refreshKey` prop bumped by `MembersSection` so submit triggers a refetch
   - Uses `revoke_user_invite()` RPC for the revoke action with optimistic removal

2. **Wire `InviteButton.onInvited`** to `setInvitesRefreshKey((k) => k + 1)` in `MembersSection`.

3. **Patch the source migration + add corrective migration** for the SQL ambiguity:
   - `supabase/migrations/20260501100100_r4_create_user_invites.sql` — qualified the lookup as `SELECT u.role INTO caller_role FROM public.users u WHERE u.id = uid;` so fresh deploys are clean.
   - `supabase/migrations/20260502100000_r4_post_fix_invite_role_ambiguity.sql` — `CREATE OR REPLACE FUNCTION` for all three invite RPCs with the qualified lookup. Idempotent; safe to apply on the already-deployed DB. Already pushed via `supabase db push`.

   We qualified all three (not just `list_user_invites`) so any future signature change that introduces `RETURNS TABLE(role …)` doesn't reintroduce the bug.

---

## Verification

```
$ npx playwright test sprint-6-patch-r4/post-issues.spec.ts
  ok 1 I1 admin: notif toggle shows save state + tersimpan flash (2.1s)
  ok 2 I2 admin: invite shows up in pending list after submit (2.6s)
  2 passed (6.5s)

$ npx playwright test sprint-6-patch-r3/domain-coverage.spec.ts sprint-4-onboarding.spec.ts
  78 passed (1.8m)
```

Bundle delta: `SettingsPage` chunk gzip 5.37 → 6.09 KB (+0.72 KB for PendingInvitesPanel). Initial JS gzip flat at 154.87 KB.

Build clean. Type-check clean.

---

## Lessons

- **Don't ship a placeholder no-op.** The Sprint 7+ TODO on `onInvited` looked harmless during R4 because the brief said "graceful degradation" — but the backend half (RPC) shipped, and the frontend half (panel) didn't, so users saw success-toast-then-silence. If a backend feature ships without a UI consumer, hide the UI surface that triggers it; don't half-wire.
- **`RETURNS TABLE(...)` shadows variables.** When a PL/pgSQL function returns a table whose column names match local lookups, every unqualified reference inside the body becomes ambiguous. Always qualify table accesses inside `RETURNS TABLE` functions. This is a well-known PG gotcha — one to add to the RLS-policy-writer skill checklist.
- **Auto-save toggles need a confirmation flash.** Industry pattern is sound, but human users still want to *see* the save reach the server. A 1.8s "✓ Tersimpan" near the affected control is the cheapest way to satisfy this without abandoning the auto-save pattern for explicit Simpan buttons.
