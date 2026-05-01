# Sprint 6 Patch R2 — Copy Audit

**Date:** 2026-04-30
**Scope:** All user-facing strings in `apps/web/src/`

---

## Method

1. Grep across `apps/web/src/pages/`, `components/`, `lib/labels.ts` for action verbs, status labels, button text, helpers
2. Group by semantic intent (refresh, save, delete, edit, close, create, etc.)
3. Identify inconsistencies (same meaning, different wording)
4. Pick canonical term — favor (a) dominant occurrence, (b) BRAND voice santai-profesional Bahasa Indonesia, (c) common English where idiomatic

---

## Findings

### 🔴 INCONSISTENT — fixed in this round

| Semantic | Variations found | Canonical | Where to fix |
|---|---|---|---|
| **Refresh action** | `Refresh` (labels ACTION.REFRESH), `Segarkan` (AdminUsagePage button), `Refreshing…` | **`Refresh`** (English idiomatic, dominant in labels.ts; "Segarkan" feels translation-stiff) | `AdminUsagePage` button text |
| **Edit action** | `Edit` (EDIT_COMMENT), `Ubah` (EDIT, EDIT_TASK uses "Edit tugas"), inline buttons mixed | **`Edit`** for verbs, **`Ubah`** for "change status/setting"; lock per context | `labels.ts` ACTION.EDIT_COMMENT vs ACTION.EDIT — keep both, document distinction |
| **Create/Add** | `Buat` (dominant — Buat project, Buat tugas), `Tambah` (Tambah tugas alt), `Bikin` (one wizard step copy) | **`Buat`** for primary CTAs, **`Tambah`** for "add to list/group" context, retire **`Bikin`** as colloquial-only | Wizard onboarding step copy |
| **Close** | `Tutup`, `Selesai` (both used; Selesai is for "done" action) | **`Tutup`** for dismiss/close, **`Selesai`** for completion-specific | Already correct; document |

### ✅ CONSISTENT — no action needed

| Semantic | Canonical | Examples |
|---|---|---|
| Delete | `Hapus` | DELETE, DELETE_TASK, DELETE_COMMENT all "Hapus" |
| Save | `Simpan` | SAVE, SAVE_CHANGES, button labels uniform |
| Cancel | `Batal` | CANCEL uniform |
| Login | `Masuk` | SIGN_IN uniform |
| Logout | `Keluar` | SIGN_OUT uniform |
| Back | `Kembali` | navigation uniform |
| Next | `Lanjut` | NEXT_STEP, CONTINUE uniform |
| Search | `Cari` | placeholder + button uniform |
| Filter | `Filter` | English idiomatic uniform |
| Submit | `Kirim` | SUBMIT uniform |

---

## Glossary (locked in BRAND.md v2.3 Section "Copy Glossary")

| Action | Indonesian | English (technical context) |
|---|---|---|
| Refresh data | **Refresh** | Refresh |
| Save | Simpan | (Simpan only) |
| Cancel / Dismiss | Batal | (Batal only) |
| Delete | Hapus | (Hapus only) |
| Edit (verb) | Edit / Ubah | (context-specific) |
| Create (primary) | Buat | (Buat only) |
| Add (list append) | Tambah | (Tambah only) |
| Close (dismiss) | Tutup | (Tutup only) |
| Done / Complete | Selesai | (Selesai only) |
| Login | Masuk | (Masuk only) |
| Logout | Keluar | (Keluar only) |
| Back / Previous | Kembali / Mundur | (Kembali for nav, Mundur for wizard) |
| Next / Continue | Lanjut | (Lanjut only) |
| Submit | Kirim | (Kirim only) |
| Search | Cari | (Cari only) |
| Filter | Filter | (English idiomatic) |
| Sort | Urutkan | (Urutkan only) |
| Settings | Pengaturan | (Pengaturan only) |
| Notifications | Notifikasi | (Notifikasi only) |
| Profile | Profil | (Profil only) |
| Email | Email | (English universal) |
| Password / Kata sandi | Kata sandi | (Kata sandi for label, password for code) |

---

## Future-proofing rule

**Any new component WAJIB pakai canonical term dari glossary.** Reviewer pull-request mandate: jika introduce new copy, harus consult `docs/BRAND.md` §"Copy Glossary" v2.3.
