# PRODUCT.md — KalaTask

> Strategy companion to `DESIGN.md`. Defines who/what/why before how.
> **Mode:** PRODUCT (internal task management UI, not brand surface)
> **Pair with:** `DESIGN.md` (visual tokens), `docs/BRAND.md` v2.1 (brand voice + microcopy)

---

## 1. Who

**Primary audience:** 10-30 internal Kalaborasi Group employees during 6-12 month adoption pilot.

| Role | Daily intent | Time sensitivity | Friction tolerance |
|---|---|---|---|
| **Admin** (BD/IT lead) | Configure org, audit usage, approve MoM imports, monitor health | Periodic (~daily) | Low — admin is power user, expects control density |
| **Manager** | Plan project, assign work, track team progress, unblock | High (multiple times/day) | Low — needs fast scan + bulk action |
| **Member** | See assigned work, update status, comment progress, get unblocked | Highest (continuous) | Lowest — interface IS the work, friction = cost |
| **Viewer** (management) | Read-only overview of cross-team progress, spot bottlenecks | Periodic (~weekly) | Medium — needs clarity not control |

**Not in audience:** customers, public, agencies. Product surface is internal-only. UI does not need marketing-grade hero shots, but DOES need productivity-grade information density.

---

## 2. What

**Core promise:** *"Task management yang nempel sama cara kerja tim."*

**3 jobs the product does:**
1. **Lihat siapa kerjakan apa** — task list across views (List/Kanban/Gantt) with filter, group, search
2. **Capture-to-task otomatis** — MoM rapat → action items via parser, CSV bulk import for planned tasks
3. **Spot bottleneck cepat** — bottleneck view, productivity dashboard, workload distribution

**Anti-jobs (intentionally NOT doing):**
- Time tracking (separate domain)
- Customer-facing project management (this is internal)
- Document collaboration (Notion/Drive remain canonical)
- Chat (Slack/WhatsApp remain canonical)

---

## 3. Why

**Strategic intent:**
- Validate task management adoption in Indonesian company before committing to 5-10K USD/year SaaS
- Free tier (Supabase + Vercel) eliminates recurring license cost during pilot
- 6-8 week build, 6-12 month adoption window, then build-vs-buy decision based on data

**What "good" looks like at end of pilot:**
- ≥ 70% of pilot users active weekly (= adoption signal)
- ≥ 60% of tasks have ownership + deadline (= discipline signal)
- Bottleneck view used ≥ 1×/week by managers (= productivity signal)
- ≤ 10% false-positive rate on MoM-to-task fuzzy match (= trust signal)

---

## 4. Cognitive load budget per surface

Information architecture priority: **density** over delight, **scan** over read, **action** over admire.

| Surface | Primary scan target | Max actionable items in viewport | Max colors visible simultaneously |
|---|---|---|---|
| `/dashboard` | Onboarding + entry point | 3 CTAs | 4 |
| `/projects` | Filter + list of projects | 1 primary CTA + filter row + grid | 3 (status palette) |
| `/projects/:id` | Tasks across 3 views (List/Kanban/Gantt) | Sidebar context + main content + filter | 5 (status palette + brand) |
| `/admin/mom-import/:id` | Review queue, decision per row | Filter tabs + bulk action + per-row decision | 4 (confidence levels) |
| `/admin/usage` | Health snapshot | 1 banner + 3 metric cards | 3 (health tones) |
| `/workload` / `/bottleneck` / `/productivity` | Manager scan dashboards | Chart + table | 4 |

**Anti-pattern:** modal-on-modal, accordion-in-accordion, > 7 colors competing for attention, infinite scroll without ranking.

---

## 5. Voice (delegated to `BRAND.md` v2 §13)

Indonesian santai-profesional. Verb-led actions. Conversational empty states. Specific recovery on errors. No "Anda" (use "kamu"). No raw English in user-facing text except technical terms (API, OAuth, RLS).

Source of truth: `apps/web/src/lib/labels.ts`. Components must NOT hardcode user-facing strings.

---

## 6. Decision principles (the "if in doubt" list)

When making a UX call without owner present:
1. **Density > whitespace** — internal tool, productivity-grade, not consumer-grade
2. **Default action visible** — primary CTA in viewport, not buried in menu
3. **Optimistic UI + rollback** — never wait for server before showing change (existing pattern: `useOptimisticMutation`)
4. **Empty state = onboarding moment** — icon + headline + body + CTA, never blank `<div>`
5. **Error state = recovery path** — never just "An error occurred", always actionable next step
6. **Role gating in UI mirrors RLS in DB** — never show what backend will deny, but always backend-enforce
7. **Indonesian first, English never** — except technical jargon
8. **Asana/Monday inspiration, BRAND voice tone** — patterns from product, voice from KalaTask

---

## 7. Out of scope (explicitly)

These are NOT what the product is for, despite being adjacent:
- AI-generated task suggestions beyond MoM parser (defer post-pilot)
- Native mobile app (PWA suffices for pilot)
- Custom illustration set (unDraw or none)
- Marketing landing page
- Public docs portal
- Multi-tenant / multi-org

If a feature request touches any of these, push back to next sprint or post-pilot.

---

## 8. Anti-patterns to avoid

Drawn from observation of pre-overhaul state:
- Hardcoded user-facing strings inside components (use `lib/labels.ts`)
- Raw Tailwind defaults for UI states (`bg-zinc-100`, `bg-emerald-50`) — use brand tokens
- Microcopy that's literal English translation ("Pembuatan tugas" instead of "Buat tugas")
- Modal forms that don't autofocus first input
- Empty state without CTA
- Generic error messages ("Sesuatu tidak beres" tanpa recovery)
- Tooltips that just repeat the label they're attached to
- Loading state without skeleton or spinner (= flash-of-blank)
- Primary action below fold or in submenu
- Status badge that LOOKS like a button but isn't (or vice versa)

---

## 9. Composition with skills

This file pairs with:
- **`DESIGN.md`** — visual tokens (colors, typography, spacing, elevation, motion)
- **`docs/BRAND.md` v2.1** — brand voice + microcopy guidelines
- **`apps/web/src/lib/labels.ts`** — runtime copy source of truth
- **`apps/web/src/styles/theme.css`** — runtime token definitions

Companion docs follow the Impeccable design framework's PRODUCT/DESIGN split (strategy vs visuals) without requiring the external skill install.
