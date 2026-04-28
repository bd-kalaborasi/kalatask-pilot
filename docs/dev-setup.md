# Dev Environment Setup — KalaTask Pilot

> Tools + setup yang dibutuhkan Claude Code agent + owner untuk autonomous workflow.

---

## gh CLI setup untuk autonomous PR workflow

### Why

Sprint 3 wrap discovered: agentic PR creation butuh `gh` CLI. Tanpa gh, Claude Code fallback ke "write PR body file → owner manual create via GitHub web" (extra step). Setup ini one-time, payoff Sprint 4+ PR creation full-agentic.

### Install (Windows native)

```bash
winget install --id GitHub.cli --silent --accept-source-agreements --accept-package-agreements
```

Default install path: `C:\Program Files\GitHub CLI\gh.exe`. PATH update applied saat new shell session — kalau session lama, manual:

```bash
export PATH="/c/Program Files/GitHub CLI:$PATH"
```

Atau restart Git Bash session. Permanent: edit `~/.bashrc` add line di atas.

Verify:
```bash
gh --version
# Expected: gh version 2.91.0 (or newer)
```

### Authenticate

`gh auth login` interactive — recommended path for owner one-time setup:

```bash
gh auth login
# Pilih: GitHub.com → HTTPS → Login with web browser
# Browser opens GitHub login page → owner authenticate → callback
# Token stored di Windows Credential Manager (encrypted)
```

Verify:
```bash
gh auth status
# Expected: Logged in to github.com as <your-username>
```

### Alternative: Personal Access Token (PAT)

Kalau interactive browser flow tidak ideal (mis. headless / CI):

1. Generate PAT: https://github.com/settings/tokens
   - Scope minimum: `repo`, `workflow`, `read:org`
   - Expiration: 90 hari (rotate before expire)

2. Auth via stdin (no token in shell history):
   ```bash
   gh auth login --with-token < ~/.github_pat
   # File ~/.github_pat berisi token only, owner manage via secure store
   ```

3. **Token rotation reminder:** add calendar reminder 7 hari sebelum PAT expire.

### Security hygiene

- ❌ JANGAN commit token ke repo (any branch, any file)
- ❌ JANGAN paste token di chat / commit message / log
- ✅ Token storage: Windows Credential Manager (default `gh auth login`)
- ✅ Atau file `~/.github_pat` di-gitignore (consistent dengan `.env` pattern Sprint 1)

### Permission model

`gh` CLI inherit user permission. Untuk Sprint 3+:
- `gh pr create` — needs `repo` scope (PR creation di repo owner)
- `gh pr merge` — TIDAK dipakai oleh Claude Code (per task constraint, owner manual click merge button untuk audit trail)
- `gh pr view` — read-only, useful untuk Sprint 4+ verification

### Verification command

Saat Claude Code start session baru, jalankan:
```bash
gh auth status && gh repo view bd-kalaborasi/kalatask-pilot --json url
```

Expected output:
```
github.com
  ✓ Logged in to github.com account <username>
{"url":"https://github.com/bd-kalaborasi/kalatask-pilot"}
```

Kalau "not logged in" → owner re-run `gh auth login`.

---

## Other tools (cumulative Sprint 1-3)

### Supabase CLI (Sprint 4+ autonomous workflow)

#### Why

Sprint 1-3 patterns:
- Migration apply → Dashboard SQL Editor (manual paste)
- pgTAP execution → MCP `execute_sql` aggregation OR Dashboard

Sprint 4+ goal: eliminate manual Dashboard step untuk migration apply via `supabase db push`. pgTAP execution stays MCP-based (no Docker overhead).

#### Install — DO NOT install native

Supabase tidak di winget catalog (verified 2026-04-28). Scoop available tapi extra hop. **Use `npx supabase`** (v2.95.5+) — works immediately, no PATH setup, consistent across Sprint 4+ session.

```bash
npx --yes supabase --version
# Expected: 2.95.5 (or newer)
```

Setup `supabase/config.toml` already done Sprint 3 (commit `fcfb5c4`). No re-init needed.

#### Owner one-time auth (~3 menit)

##### Step 1: Generate access token

Open: https://supabase.com/dashboard/account/tokens

- Click **Generate new token**
- Name: "kalatask-pilot CLI" (atau apapun)
- Click **Generate token**
- **Copy token immediately** (di-display sekali only)

##### Step 2: Login

```bash
npx supabase login
# Paste token saat prompt → Enter
# Token disimpan di:
#   Windows: %USERPROFILE%\AppData\Roaming\supabase\access-token
#   Linux/Mac: ~/.supabase/access-token
```

##### Step 3: Link project

```bash
cd C:\Users\bdkal\Projects\kalatask-pilot
npx supabase link --project-ref iymtuvslcsoitgoulmmk
# Akan prompt database password
```

DB password from: https://supabase.com/dashboard/project/iymtuvslcsoitgoulmmk/settings/database

(Section "Connection string" → klik "Show password" atau scroll ke field password.)

#### Verify auth

```bash
npx supabase projects list
# Expected: project iymtuvslcsoitgoulmmk visible dengan flag "linked: true"
```

#### Common commands Sprint 4+

| Command | Purpose | Docker required? |
|---|---|---|
| `npx supabase db push` | Apply local migrations to remote | ❌ No |
| `npx supabase db diff` | Check sync local vs remote schema | ❌ No |
| `npx supabase db pull` | Pull remote schema → local migrations | ❌ No |
| `npx supabase migration list` | List migration status | ❌ No |
| `npx supabase test db` | Run pgTAP against local | ✅ Yes (`supabase start` Docker) |
| `npx supabase start` | Start local stack (Postgres + Studio + Auth) | ✅ Yes (Docker Desktop) |

**Sprint 4+ recommended migrations workflow:**
```bash
# Develop local (apps/web/dev server pakai remote — same as Sprint 1-3)
# Write migration file di supabase/migrations/

# Apply to remote (replaces Dashboard manual paste):
npx supabase db push

# Verify sync:
npx supabase db diff
# Expected: no output (in sync)
```

#### pgTAP execution path (Sprint 4+)

**Recommended: continue MCP `execute_sql` aggregation pattern** (Sprint 1+2 established, no Docker required).

Workflow:
1. Owner toggle `.mcp.json` ke `read_only=false`
2. Owner restart Claude Code (MCP session config refresh)
3. Claude Code run pgTAP via MCP `execute_sql` dengan TEMP table aggregation pattern
4. Owner toggle back `read_only=true` after run

Alternative: `npx supabase test db` requires Docker Desktop + `supabase start` setup (~10-15 menit Docker initial pull). Defer to owner discretion.

#### Security hygiene

- ❌ JANGAN commit access token / DB password
- ✅ Token storage: `%USERPROFILE%\AppData\Roaming\supabase\access-token` (file system, no env var pollution)
- ✅ DB password: Supabase keychain via `supabase link` (encrypted di config)
- 🔁 Token rotation: 6 bulan default expiry, calendar reminder

#### Verification command (session start)

```bash
npx supabase projects list 2>&1 | grep iymtuvslcsoitgoulmmk
```

Expected: line dengan project ref + linked indicator.

Kalau tidak terdaftar → owner re-run `npx supabase login`.

### Playwright

Installed Sprint 1 Step 9. Run via `npx playwright test` di `apps/web/`.

### Vitest

Installed Sprint 2 Step 1. Run via `npm run test:run` di `apps/web/`.

---

## Update history

- 2026-04-28: Initial doc — gh CLI setup untuk autonomous PR (Sprint 3 wrap)
