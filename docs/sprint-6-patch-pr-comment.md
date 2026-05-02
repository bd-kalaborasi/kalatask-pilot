## Sprint 6 PATCH ROUND — Stitch v1 HTML deep refactor (10 commits added: `5354136` → `e3ab266`)

After Sprint 6 final overhaul (token round, ADR-010), owner verified localhost vs Stitch references and found a structural gap. Token-only refactor wasn't enough — Stitch screens require DOM hierarchy changes (KPI grids, panels, sidebar context, tab strips, leaderboards). This patch round adopts real Stitch HTML structure per route, not reverse-engineered from descriptions.

### New workflow (now mandatory)
1. `mcp__stitch__list_screens` to verify screen IDs (one ID in spec was 33-hex; actual was 32-hex — pre-flight saves a wasted lookup)
2. `mcp__stitch__get_screen → htmlCode.downloadUrl`
3. `curl -sL <url> -o docs/stitch-html-export/{N}-{slug}.html` for raw HTML audit trail
4. Adapt DOM hierarchy in React; preserve functional logic; swap raw colors → v2.2 brand tokens; replace hardcoded data → props/state; EmptyState placeholder where data not yet wired
5. Side-by-side screenshot pair in `docs/sprint-6-patch-comparison/`
6. Commit per route

### Routes refactored (8 of 13)

| Route | Stitch ref → localhost | Commit |
|---|---|---|
| `/dashboard` | `01-dashboard-{stitch,after}.png` | `b05b83f` |
| `/dashboard/productivity` | `11-productivity-{stitch,after}.png` | `5baf75b` |
| `/admin/usage` | `08-admin-usage-{stitch,after}.png` | `7fdc2d9` |
| `/projects` | `02-projects-{stitch,after}.png` | `687480e` |
| `/workload` | `09-workload-{stitch,after}.png` | (in `98c1c51`) |
| `/bottleneck` | `10-bottleneck-{stitch,after}.png` | (in `98c1c51`) |
| `/admin/mom-import` (list + review) | (no comparison pair captured) | `783817a` |
| `/projects/:id` + `/tasks/:id` | (header upgrade only) | `ac45dbf` |
| `/dashboard/manager` | `14-manager-dashboard-after.png` | `9a101e5` |

### Routes deferred (no existing route in `App.tsx`)
- `/tasks` — Stitch ref at `docs/stitch-html-export/04-tasks.html`
- `/onboarding` — Stitch ref at `12-onboarding.html` (current is `WizardTour` overlay component, not page)
- `/settings` — Stitch ref at `13-settings-team.html`

These three need new route additions to `App.tsx`. Defer to Sprint 7.

### Test surface (intentional updates, not bypasses)

- `auth.spec.ts` — heading text changed (`fullName` → `Selamat datang, {firstName}`); email dropped from dashboard (still in AppHeader)
- `dashboards.spec.ts` — heading labels: `Productivity Dashboard` → `Productivity`, `Workload View` → `Workload Tim`, `Bottleneck View` → `Bottleneck Tugas`. Period caption → tab role.
- `ProductivityDashboardPage.tsx` — fixed hooks-order violation (`useMemo` moved above early-return guards)

### Bundle delta
- Pre-patch (Phase G): 150.73 KB gzip
- Post-patch: **153.54 KB gzip** (+2.81 KB this round, +6.97 KB cumulative from baseline 146.57 KB)
- Within 250 KB hard ceiling; over +5 KB target — accepted given structural depth (4-KPI sparkline, leaderboard, insights derivation, 2-col layouts, semantic section panels)

### Visual evidence
- Stitch references + post-Stitch localhost actuals in `docs/sprint-6-patch-comparison/`
- Pre-Stitch baseline still at `docs/sprint-6-overhaul-screenshots/` for full comparison

### Anti-pattern explicitly avoided this round
- Token-only refactor without DOM hierarchy change
- Reverse-engineering Stitch from screenshots/descriptions
- Skipping side-by-side visual verify
- Bypassing stale tests instead of updating them

### Owner action
Ready to merge. Tag `sprint-6-patch-complete` marks the closing point. Revert via `git reset --hard sprint-6-pre-overhaul` (full revert) or back to before patch round (tag will be added at this commit).
