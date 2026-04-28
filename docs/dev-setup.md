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

### Supabase CLI (Sprint 3 Q6 deferred)

```bash
npx --yes supabase --version
# 2.95.5+ via npx
```

Setup di `supabase/config.toml` (Sprint 3 commit `fcfb5c4`).

Status: `init` done, `link` + `start` deferred (owner action ~30-60 menit).

### Playwright

Installed Sprint 1 Step 9. Run via `npx playwright test` di `apps/web/`.

### Vitest

Installed Sprint 2 Step 1. Run via `npm run test:run` di `apps/web/`.

---

## Update history

- 2026-04-28: Initial doc — gh CLI setup untuk autonomous PR (Sprint 3 wrap)
