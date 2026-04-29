# ADR-008: Realtime Comments Architecture

- **Status:** Accepted
- **Date:** 2026-04-28
- **Deciders:** Claude Code (proposer), Owner BD (approver)
- **Context:** Sprint 4.5 — Comments + @mention butuh keputusan apakah pakai Supabase Realtime broadcast (instant) atau polling (Sprint 3 pattern). Research finding: collaboration depth = adoption-critical, "instant" emission @mention = retention factor.

---

## Context

Sprint 4.5 ships comments thread + @mention. Research (Recommendation #2 throttling) says notif emission harus instant untuk @mention — collaboration friction killer kalau lag > 5 detik.

PRD N1 line 150: "Real-time update komen/status via Supabase Realtime, target latency < 1 detik."

Sprint 3 sudah pakai 30-detik polling untuk notification badge dropdown. Pattern works untuk passive notifications, tapi tidak fit untuk active conversation thread (comments) di mana user expect immediate sender-to-receiver visibility.

ADR-008 evaluate apakah:
- Pivot dari polling → Realtime broadcast untuk comments + notifications
- Hybrid — Realtime untuk active comments thread, polling tetap untuk badge count
- Tetap polling untuk semua, accept lag

**Constraint pilot:**
- Free-tier philosophy (ADR-001)
- Supabase free tier Realtime: 200 concurrent + 2 million messages/month — sangat cukup pilot 30 user
- Bundle size constraint (Sprint 4 baseline 152.7 KB; +50 KB headroom)
- React SPA single-page lifecycle — subscription cleanup critical (memory leak risk)
- pgTAP testability not applicable (Realtime adalah server-side WAL, client-side connection-based)

---

## Decision

**Adopt Option C — Hybrid: Realtime broadcast untuk comments thread (active task only) + Realtime untuk notifications (replace 30s polling).**

Spesifikasi:
- **Realtime publication:** ALTER PUBLICATION `supabase_realtime` ADD TABLE `public.comments`, `public.notifications`. Existing tables unchanged.
- **Channel scoping:**
  - Comments — channel per task (`task:${task_id}`). Subscribe saat user buka task detail page; unsubscribe saat leave page.
  - Notifications — channel per user (`user:${user_id}`). Subscribe saat AuthContext mount session; unsubscribe saat logout.
- **Subscribe pattern:** `useEffect` dengan cleanup function. `supabase.channel(name).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: 'task_id=eq.${id}' }, callback).subscribe()`.
- **State sync:** local React state + Realtime INSERT events. Optimistic update saat `post_comment` RPC + Realtime echo dedupe via `id` field.
- **Notification badge polling fallback:** retain 30s polling fallback kalau Realtime channel disconnect detected (graceful degradation).

---

## Options yang dipertimbangkan

| Opsi | Latency | Complexity | Free-tier fit | Bundle impact |
|---|---|---|---|---|
| A: Polling-only (Sprint 3 pattern) | 30s lag | Low | ✅ | 0 |
| B: Realtime everywhere (replace polling 100%) | < 1s | Medium | ✅ | +5 KB |
| **C: Hybrid Realtime + polling fallback** ✅ | < 1s active task / 30s passive | Medium | ✅ | +5 KB |
| D: Long-polling custom | Variable | High (custom impl) | ⚠️ | +10 KB |

---

## Reasoning kenapa Option C dipilih

1. **Research Recommendation #1 + #2 satisfied.** Comments thread + @mention notif harus instant. Realtime delivers < 1s; polling 30s = collaboration friction documented kill factor.

2. **Free-tier limit not constraining.** Supabase Realtime free tier: 200 concurrent connections + 2M messages/month. Pilot 30 user × 1 active task per user × 24 jam = ~30 concurrent peak. ~150 messages/day average. Negligible vs limit.

3. **Hybrid > pure Realtime untuk pilot.** Notification badge dropdown tidak butuh < 1s update — 30s polling fallback adequate kalau Realtime connection failed (network blip, Supabase-side incident). Hybrid resilient.

4. **Channel scoping = memory safe.** `task:${task_id}` subscribe saat enter task detail, unsubscribe on leave. Avoid global subscription to all tasks (which would explode subscription count + bandwidth).

5. **Optimistic update + Realtime echo = consistent UX.** `post_comment` RPC returns immediately (optimistic), Realtime INSERT echo arrives ~100ms later. Dedupe via `id` field ensures no double-render.

6. **pgTAP testability tidak compromised.** RPC `post_comment` (Sprint 4.5 Step 4) tetap pgTAP-testable. Realtime broadcast = transport layer, not business logic — out-of-scope pgTAP.

7. **Bundle impact minimal.** `@supabase/supabase-js` sudah include Realtime client. No additional package needed. Hooks `useTaskCommentsRealtime` + `useNotificationsRealtime` ~5 KB total.

---

## Consequences

### Positif
- Comments thread instant feel (< 1s lag) — research-aligned UX
- @mention notif instant emission (perception-critical)
- Hybrid resilient — graceful degradation kalau Realtime disconnect
- Sprint 3 polling pattern preserved untuk badge fallback
- Channel scoping prevents bandwidth explosion
- Free-tier limits not approached

### Negatif (mitigasi)
- **Subscription cleanup discipline** — subscribe/unsubscribe lifecycle bug = memory leak. Mitigasi: `useEffect` cleanup mandatory; ESLint rule `react-hooks/exhaustive-deps` enforce.
- **Realtime echo dedupe complexity** — optimistic INSERT + server INSERT same `id` need dedupe. Mitigasi: dedupe via `id` field di hook state reducer.
- **Free-tier Realtime concurrent cap (200)** — pilot scale 30 user well under, but kalau scale to 100+ concurrent need monitor. Mitigasi: ADR-008 trigger revisit di section bawah.
- **WAL replication lag pada Postgres heavy load** — pilot scale tidak relevan. Realtime pakai logical replication; lag spike kalau DB busy. Mitigasi: monitor di Supabase Dashboard.
- **pgTAP test gap** — Realtime functional behavior bukan pgTAP-testable. Mitigasi: Playwright E2E covers (post comment di tab A → verify appears di tab B real-time).

---

## Channel design detail (Sprint 4.5 implementation)

```ts
// useTaskCommentsRealtime hook
const channel = supabase.channel(`task:${taskId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'comments',
      filter: `task_id=eq.${taskId}` },
    (payload) => appendComment(payload.new)
  )
  .subscribe();

// useNotificationsRealtime hook (replace polling)
const channel = supabase.channel(`user:${userId}:notifications`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${userId}` },
    (payload) => appendNotif(payload.new)
  )
  .subscribe();
```

**Cleanup:**
```ts
useEffect(() => {
  const channel = ...;
  return () => { void supabase.removeChannel(channel); };
}, [taskId]);
```

---

## Trigger untuk revisit ADR ini

ADR-008 harus di-evaluate ulang kalau salah satu kondisi:

- **Concurrent users > 150** — approach Realtime free-tier 200 cap. Pivot: scope channels lebih agresif atau upgrade Pro plan.
- **Realtime message volume > 1M/month** — monitoring threshold (50% of 2M cap).
- **Memory leak detected** in production (subscription not unmounted) — review hook lifecycle.
- **Postgres logical replication slot exhausted** — Supabase Pro plan or self-hosted needed.
- **Comments thread > 1000 messages per task** — pagination + virtual scroll required. Realtime scope unchanged tapi rendering perlu refactor.
- **Multi-tenant scaling (di luar pilot Kalaborasi)** — channel naming + RLS scope perlu re-evaluate.

---

## Related

- ADR-001 (Supabase managed) — free-tier philosophy
- ADR-002 (RLS strategy) — comments RLS follows task parent visibility
- PRD §3.1 N1 line 150 — realtime latency target < 1s
- PRD §7 line 555 — comments table "Realtime subscription target"
- Sprint 3 notification 30s polling pattern (preserved as fallback)
- Sprint 4.5 plan Step 3-7 — implementation
- Supabase Realtime docs: https://supabase.com/docs/guides/realtime
