---
name: kalatask-microcopy
description: Use this skill when writing or reviewing any user-facing text in the KalaTask app — error messages, empty states, button labels, confirmation dialogs, notification copy, tooltips, onboarding hints. Trigger when the user asks to "tulis copy", "fix error message", "buat empty state", "ubah text di UI", or any UI text decision. This skill enforces the voice (Bahasa Indonesia santai-profesional), prevents corporate jargon, and provides ready-to-use copy templates for common scenarios. Source: BRAND.md §6 (Voice & Tone).
---

# KalaTask Microcopy — Voice & Tone Skill

## Tujuan skill ini

Skill ini memastikan setiap text di UI KalaTask:

1. **Konsisten voice** — santai-profesional, tidak corporate-stiff, tidak juga terlalu casual
2. **Tidak ada jargon** — Bahasa Indonesia natural, mix istilah teknis Inggris OK kalau lebih clear
3. **Action-oriented** — kasih user tahu APA yang harus dilakukan, bukan cuma "ada error"
4. **Tier-appropriate** — notif urgency tier match dengan tone (warning ≠ critical)

## Source of truth

- `docs/BRAND.md` §6 (Voice & Tone) — prinsip + tabel example
- `docs/BRAND.md` §6.3 (Notification copy) — tier mapping
- PRD N7 — Bahasa Indonesia default, English toggle

## Prinsip voice (5 rules)

### 1. Bahasa Indonesia santai-profesional sebagai default

- ❌ "Mohon Anda dapat mempertimbangkan untuk melakukan tindakan ini"
- ❌ "Hai gengs, yuk bikin task baru!"
- ✅ "Buat task baru?"

> Sweet spot: tone email ke kolega yang sudah kenal — bukan email ke direktur, bukan chat sama teman SD.

### 2. Mix istilah teknis Inggris OK kalau lebih clear

- ✅ "task", "deadline", "assignee", "review", "comment" — sudah natural di workplace Indonesia
- ❌ "tugas", "tenggat", "penerima tugas" — terlalu formal, jarang dipakai di chat kerja
- ⚠️ Tergantung konteks: "project" vs "proyek" — di KalaTask pakai "project" (consistent dengan label tabel)

### 3. Hindari kalimat pasif berlebihan

- ❌ "Tugas Anda telah berhasil disimpan ke dalam sistem."
- ✅ "Task disimpan."

### 4. Action-oriented, bukan describe-only

- ❌ "Error: koneksi gagal."
- ✅ "Koneksi gagal. Coba refresh atau cek internet."

### 5. Hindari personifikasi sistem yang berlebihan

- ❌ "Saya, KalaTask, dengan senang hati membantu Anda menyelesaikan task ini! 🎉"
- ✅ "Task selesai."
- 🤖 emoji untuk Cowork OK (BRAND.md §6.2 example) — itu specific brand voice untuk auto-action

## Library microcopy — copy-paste reference

### A. Empty states

| Konteks | Copy |
|---|---|
| Kanban kosong | "Belum ada task. Klik '+' atau biarkan Cowork buat dari MoM besok pagi 🤖" |
| List kosong (user-driven) | "Belum ada task di sini. Klik '+' untuk mulai." |
| Search kosong | "Tidak ketemu. Coba kata kunci lain atau hapus filter." |
| Filter kosong | "Filter ini gak nemu apa-apa. Reset filter?" |
| Notif kosong | "Belum ada notifikasi. Kamu update 👍" |
| Comments kosong | "Belum ada komentar. Mulai diskusi di sini." |
| Project kosong (new) | "Project baru, belum ada task. Buat task pertama atau import dari CSV." |
| Activity log kosong | "Belum ada aktivitas di task ini." |

### B. Confirm dialogs (destructive action)

Format: kalimat tanya + konsekuensi singkat. JANGAN pakai "Apakah Anda yakin..."

| Action | Copy |
|---|---|
| Delete task | "Hapus task ini? Tidak bisa di-undo." |
| Archive project | "Archive project ini? Task di dalamnya tetap ada, tapi project tidak muncul di list aktif." |
| Remove assignee | "Lepas assignee dari task ini? Task akan jadi 'Unassigned'." |
| Bulk delete | "Hapus {N} task sekaligus? Tidak bisa di-undo." |
| Reset password | "Kirim email reset password ke {email}?" |
| Sign out | "Keluar dari KalaTask?" |

Button label di confirm dialog:
- Primary destructive: "Hapus" / "Archive" / "Reset"
- Secondary: "Batal"

### C. Error messages

Format: apa yang salah + apa yang user bisa lakukan

| Error | Copy |
|---|---|
| Login fail | "Email atau password salah. Coba lagi atau reset password." |
| Network fail | "Koneksi terputus. Cek internet, lalu refresh." |
| Server error 500 | "Ada error di server. Coba lagi sebentar lagi atau hubungi admin." |
| Permission denied (403) | "Kamu tidak punya akses ke halaman ini. Kalau seharusnya bisa, hubungi admin." |
| Validation: required field | "{Field} wajib diisi." |
| Validation: email format | "Format email belum benar." |
| File too large | "File terlalu besar. Maksimum 10MB." |
| File type not supported | "Format file ini belum didukung. Pakai PDF, DOCX, JPG, atau PNG." |
| Duplicate entry | "{Field} sudah dipakai. Pakai yang lain." |
| Save fail | "Gagal simpan. Coba lagi atau refresh halaman." |
| Form has errors | "Ada {N} field yang perlu dibetulkan." |

### D. Success messages (toast)

Pendek, friendly, konfirm action selesai.

| Action | Copy |
|---|---|
| Save | "Disimpan." |
| Create | "Task dibuat." |
| Delete | "Dihapus." |
| Update status | "Status diupdate ke '{status}'." |
| Comment posted | "Komentar terkirim." |
| File uploaded | "File berhasil di-upload." |
| Invitation sent | "Undangan dikirim ke {email}." |
| CSV imported | "Berhasil import {N} task. {M} skipped (lihat detail)." |

> Note: hindari "Berhasil!" tanpa konteks — kasih tahu apa yang berhasil.

### E. Notification copy (PRD F7) — tier mapping

Match urgency tier dengan tone:

#### Normal (sky blue, informatif netral)

```
"Task baru di-assign ke kamu: *Review laporan Q1*"
"@Sari komentar di task *Update website*"
"*Project Beta* baru di-create oleh Pak Budi"
```

#### Warning (amber, friendly reminder)

```
"*Review laporan Q1* deadline 3 hari lagi"
"Workload kamu sudah {N} open task — perlu re-prioritize?"
"3 task di tim kamu sudah > 7 hari di status 'Review'"
```

#### Urgent (orange, tegas tapi tidak panik)

```
"*Review laporan Q1* deadline besok"
"Cowork agent gagal sync 2 hari berturut-turut. Cek folder Drive."
"Kamu di-mention di 5 komentar baru"
```

#### Critical (red, direct, action-oriented)

```
"*Review laporan Q1* sudah lewat deadline 2 hari. Update sekarang."
"Cowork agent error: {error}. Hubungi admin."
"Free tier Supabase 90% — upgrade dalam {N} hari."
```

### F. Auto-comment dari Cowork (PRD F9)

Format konsisten supaya user tahu ini auto, bukan manual:

```
[Auto dari MoM {file_name} ({date})]: {excerpt singkat dari MoM}
```

Contoh:
```
[Auto dari MoM rapat-marketing-2026-04-26.docx (26-04-2026)]: 
Tim setuju target launch geser ke minggu depan, butuh approval Pak Budi.
```

JANGAN tulis seperti komentar manusia — user perlu tahu ini source-nya machine.

### G. Onboarding tooltip (PRD F10)

Format: kalimat singkat + 1 contoh + dismiss option

```
"Drag task antar kolom untuk update status. Coba pindahin task ini ke 'In Progress' →"
[Got it] [Skip tour]

"Klik @ untuk mention rekan kerja di komentar. Mereka akan dapat notif."
[Got it] [Skip tour]
```

JANGAN tooltip kepanjangan — user gak baca tooltip > 2 kalimat.

### H. Button labels (canonical)

Konsisten across app supaya user gak confused:

| Action | Label preferred |
|---|---|
| Create new | "Buat task" / "Buat project" / "Buat user" (verb + object spesifik) |
| Save | "Simpan" |
| Cancel | "Batal" |
| Confirm destructive | "Hapus" / "Archive" / "Reset" (action verb) |
| Submit form | "Simpan" atau "Kirim" (tergantung konteks) |
| Edit | "Edit" |
| Close modal | "Tutup" |
| Back | "Kembali" |
| Next step | "Lanjut" |
| Mark as done | "Tandai selesai" |
| Sign out | "Keluar" |
| Sign in | "Masuk" |

JANGAN pakai "OK" / "Submit" generik — kasih label spesifik per konteks.

### I. Loading states

```
"Loading..." → ✅ OK untuk dev/quick state
"Memuat..." → ✅ Bahasa Indonesia
"Sedang memproses {N} item..." → ✅ untuk operation panjang
"Hampir selesai..." → ❌ sok tahu, jangan janji
```

### J. Form helper text & placeholder

Format: short, instructional

```
Email
[ user@kalaborasi.com               ]
> Email kamu untuk login

Deadline
[ DD-MM-YYYY                        ]
> Kosongkan kalau belum ada deadline

Description
[ Tulis detail task di sini...      ]
> Markdown di-support: **bold**, *italic*, [link](url)
```

JANGAN placeholder yang sama dengan label — duplicate, gak guna.

## Anti-patterns yang harus dihindari

1. **Corporate jargon** — "leverage", "synergy", "circle back", "ping me"
2. **"Apakah Anda yakin..."** — terlalu formal, redundant
3. **"Mohon..."** — terlalu memohon, gak action-oriented
4. **Exclamation berlebihan!!! 🎉🎉🎉** — terkesan unprofessional dan mendorong sangat-energetic
5. **Pasif berlebihan** — "Tugas telah berhasil disimpan oleh sistem"
6. **Eufemisme** — "Maaf, ada sedikit kendala" untuk error besar — say it straight
7. **Generic "Error" / "Success"** — tanpa konteks user gak tahu apa yang harus dilakukan
8. **Mix bahasa di 1 kalimat tanpa logika** — "Save your task, ya!" — pilih satu
9. **All caps** — "TASK BERHASIL DIHAPUS" — terkesan teriak

## Workflow eksekusi

### Saat user minta "tulis copy untuk X"

1. **Identifikasi tipe** — error, success, empty state, confirm, notif tier?
2. **Cek library section** (A-J) — apakah sudah ada template untuk konteks ini?
   - Ada → pakai template, adjust kata kunci spesifik
   - Belum → tulis baru sesuai prinsip voice
3. **Validate vs anti-patterns** — apakah copy melanggar 9 anti-pattern?
4. **Cek konsistensi** — kata kerja yang sama dengan komponen lain (Save vs Simpan harus konsisten across app)

### Saat user minta "fix copy yang aneh"

1. Identifikasi apa yang salah:
   - Tone off (terlalu formal/casual)?
   - Tidak action-oriented?
   - Salah tier urgency?
2. Rewrite dengan template dari library
3. Kalau pattern baru, propose tambah ke library

### Saat user minta English version

PRD N7 mention English toggle. Voice principle untuk English version:

- **Tone**: clear, friendly-professional (sama level seperti Indonesian)
- **Avoid**: legalese, marketing speak, overly casual ("Hey buddy!")
- **Sweet spot**: tone Slack message ke kolega senior

Contoh translation:

| Indonesian | English |
|---|---|
| "Hapus task ini? Tidak bisa di-undo." | "Delete this task? Can't be undone." |
| "Belum ada task. Klik '+' atau biarkan Cowork buat dari MoM besok pagi 🤖" | "No tasks yet. Click '+' or let Cowork create them from tomorrow's MoM 🤖" |
| "Email atau password salah. Coba lagi atau reset password." | "Wrong email or password. Try again or reset password." |

## Output format

Saat user minta copy:

1. Kasih copy primary
2. Kasih 1-2 alternatif kalau ada trade-off (mis. lebih singkat vs lebih jelas)
3. Catatan konteks: kapan dipakai, tier apa (untuk notif)
4. Kalau melibatkan dynamic value, marker pakai `{variable}`:
   ```
   "{N} task baru di-assign ke kamu"
   ```

## Kapan TIDAK pakai skill ini

- User minta marketing copy / blog post — itu beda voice (lebih external, persuasive)
- User minta legal copy (T&C, privacy policy) — formal, butuh legal review
- User minta dokumentasi internal (README, CLAUDE.md) — itu technical writing, beda concern

## Related

- BRAND.md §6 (Voice & Tone) — prinsip + table
- BRAND.md §6.3 (Notification copy) — tier mapping
- PRD F7 (Notification escalation)
- PRD F9 (Cowork auto-comment format)
- PRD F10 (Onboarding tooltip)
- PRD N7 (Localization)
- Skill `kalatask-brand-tokens` — pasangan untuk styling
- Skill `indonesian-format` — date/number formatter
