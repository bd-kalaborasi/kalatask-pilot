---
name: cowork-prompt-tuning
description: Use this skill when iterating, testing, or fixing the Cowork agent prompt template that converts Meeting-of-Minutes (MoM) files into KalaTask actions (CREATE/UPDATE/SKIP). Trigger when the user mentions "tune Cowork prompt", "fix false positive", "Cowork agent salah parse", "test prompt dengan sample MoM", "evaluate fuzzy match score", or any iteration on `cowork-agent/prompt.md`. This skill enforces the strict JSON schema in PRD F9, prevents hallucination of action items not in the source, and provides an evaluation framework for adjusting threshold (0.85 fuzzy match) before pilot go-live.
---

# Cowork Prompt Tuning — KalaTask

## Tujuan skill ini

Skill ini membantu iterasi prompt template Cowork agent supaya:

1. **Tidak halusinasi** — agent tidak boleh invent action item, nama orang, atau deadline yang tidak ada di MoM
2. **Konsisten output** — strict JSON schema, parse-able tanpa retry
3. **Threshold yang kalibrated** — fuzzy match score 0.85 bukan angka random, harus diuji vs sample real
4. **False positive minimal** — pilot sukses kalau salah update task < 10% (Checkpoint 3 di CLAUDE.md)

## Source of truth

- Prompt template baseline: `cowork-agent/prompt.md` (di-derive dari PRD §12.1)
- Acceptance criteria: PRD F9 (5 atau 6 spesifik kriteria untuk fuzzy match, status keyword, dll)
- Sample MoM untuk testing: `docs/sample-mom/` (BD perlu kumpulkan, ini ada di action item PRD §10.3)
- Eval target: false positive < 10%, false negative < 15%

## Aturan WAJIB sebelum tune prompt

### 1. JANGAN tune tanpa data eval

Tuning prompt tanpa sample MoM real = guessing. Sebelum modify prompt:

- **Minimal 5 sample MoM** dari konteks Kalaborasi (bisa anonymized, tapi struktur harus realistic)
- **Expected output per sample** — ground truth yang sudah di-validate manual oleh BD
- **Eval metric defined**: precision (% prediksi yang benar), recall (% action item yang ke-detect), false positive rate

Kalau data belum ada, STOP dan minta BD kumpulkan. Pesan ke user:
> "Tuning prompt tanpa sample MoM real berisiko — saya cuma bisa tebak. Mau saya generate template eval spreadsheet untuk kumpulkan ground truth dulu?"

### 2. Schema JSON strict — tidak boleh berubah

Output Cowork agent harus parse-able oleh Edge Function `cowork-sync`. Schema strict (PRD §12.1):

```json
{
  "items": [
    {
      "action": "create" | "update" | "skip",
      "target_task_id": "uuid or null (only for update/skip)",
      "title": "...",
      "assignee_name_raw": "...",
      "deadline": "YYYY-MM-DD or null",
      "context_excerpt": "...",
      "status_keyword": "done | blocked | review | null",
      "match_score": 0.0-1.0,
      "reasoning": "1 kalimat kenapa pilih action ini"
    }
  ]
}
```

JANGAN tambah field baru di prompt tanpa update:
1. Edge Function `cowork-sync` parser
2. PRD §12.1 (prompt spec)
3. Database schema kalau ada field baru yang harus disimpan

### 3. Anti-hallucination directive HARUS di prompt

Setiap revisi prompt harus mempertahankan 4 directive eksplisit ini:

```
CONSTRAINT (NON-NEGOTIABLE):
- Jangan invent action item yang tidak ada di MoM.
- Jangan invent nama orang yang tidak disebut.
- Jika ragu antara CREATE dan UPDATE, default ke CREATE dengan flag needs_review.
- Jangan output text di luar JSON.
```

Kalau directive ini hilang dari revisi, halusinasi rate naik signifikan (empirik dari pattern LLM agentic).

### 4. Threshold harus didefinisikan eksplisit, bukan implisit

Default di PRD §F9:
- Fuzzy match score > 0.85 → UPDATE
- Score < 0.85 → CREATE
- Score 0.5-0.7 untuk assignee → flag `needs_review`
- Score < 0.5 untuk assignee → assign ke "Unassigned"

Kalau perlu adjust threshold, ubah di prompt dan **document di ADR baru** (mis. ADR-006 jika threshold change). Jangan ubah threshold cuma karena 1 sample fail.

## Workflow eksekusi

### Workflow A: First-time prompt setup (sebelum ada sample MoM)

1. Generate prompt baseline dari PRD §12.1 (full template ada di sana)
2. Kasih ke user dalam format dry-run: "Prompt ini ditulis sesuai spec PRD. Sebelum production, butuh test dengan minimum 5 sample MoM untuk kalibrasi threshold."
3. Generate template eval spreadsheet untuk BD kumpulkan ground truth (kolom: file, expected action, expected title, expected assignee, expected status_keyword)
4. Reminder ke owner: ini adalah action item PRD §10.3 #9 (sample MoM 5-10 file)

### Workflow B: Tuning iteration (setelah ada sample MoM)

1. **Baseline run:**
   - Run prompt current vs semua sample MoM
   - Capture output JSON per sample
   - Compare vs ground truth (manual review hasil oleh BD)
   - Tabulate metric: precision, recall, false positive rate

2. **Identify failure mode:**
   - **Type 1 — Hallucinated action item** (high impact): agent buat task yang tidak ada di MoM
   - **Type 2 — Missed action item**: agent skip kalimat yang seharusnya jadi task
   - **Type 3 — Wrong assignee**: salah parsing nama
   - **Type 4 — Wrong action (CREATE vs UPDATE)**: fuzzy match threshold off
   - **Type 5 — Wrong status keyword**: salah deteksi "selesai", "blocked", dll
   - **Type 6 — Schema violation**: output bukan JSON valid

3. **Pilih intervensi spesifik per failure mode:**

   | Failure type | Intervensi prompt |
   |---|---|
   | Type 1 (hallucination) | Tambah few-shot example yang menunjukkan kalimat yang BUKAN action item; pertegas constraint anti-invent |
   | Type 2 (missed) | Tambah few-shot example untuk pattern action item yang under-detected (mis. "akan kita follow-up minggu depan" — passive but is action) |
   | Type 3 (wrong assignee) | Spesifikasi format nama Indonesia: "Pak/Bu/Mas/Mbak {Nama}", "Tim {Divisi}", panggilan akrab yang harus di-fuzzy-match ke `users.full_name` |
   | Type 4 (wrong CREATE/UPDATE) | Adjust threshold (0.85) ATAU pertegas instruksi token-overlap calculation |
   | Type 5 (status keyword) | Expand keyword list, atau tambah negation handling ("belum selesai" ≠ "selesai") |
   | Type 6 (schema) | Tambah final reminder di akhir prompt: "Output ONLY JSON. No markdown, no preamble." |

4. **Apply intervensi minimal:** ubah 1 hal per iteration, re-run, compare metric. Multiple change sekaligus = sulit attribute improvement.

5. **Stop kriteria:**
   - False positive < 10% (Checkpoint 3 target)
   - False negative < 15%
   - Schema compliance 100%
   - 3 iteration tanpa improvement → switch strategy (mungkin model upgrade, bukan prompt)

### Workflow C: Debugging single-sample failure

User report: "Sample MoM X menghasilkan output salah."

1. Minta sample MoM + output JSON yang salah
2. Identifikasi failure type (1-6 di atas)
3. Generate hypothesis: kenapa prompt mis-handle case ini?
4. Test hypothesis dengan minor variation di prompt (cuma untuk debugging, jangan deploy)
5. Setelah root cause clear, propose intervensi yang tidak break sample lain
6. WAJIB: re-run di full sample set sebelum approve perubahan

## Pattern library — copy-paste reference

### Pattern A: Few-shot example untuk anti-hallucination

Tambahkan section di prompt:

```
CONTOH KASUS YANG BUKAN ACTION ITEM (agent harus skip):

Contoh 1:
Kalimat MoM: "Tim setuju target Q3 lebih realistis dari Q2."
Reasoning: Ini decision/agreement, tidak ada owner + deliverable spesifik.
Action: SKIP (jangan create task)

Contoh 2:
Kalimat MoM: "Pak Budi sudah submit proposal kemarin."
Reasoning: Past tense, sudah selesai. Tidak butuh task tracking.
Action: SKIP

Contoh 3:
Kalimat MoM: "Diskusi soal pricing memakan waktu lama."
Reasoning: Komentar diskusi, bukan commitment kerja.
Action: SKIP
```

### Pattern B: Few-shot example untuk pattern action item Indonesian

```
CONTOH KASUS YANG ADALAH ACTION ITEM (agent harus extract):

Contoh 1:
Kalimat MoM: "Mbak Sari akan follow-up vendor X tentang quotation, target Jumat."
Extract:
{
  "action": "create",
  "title": "Follow-up vendor X tentang quotation",
  "assignee_name_raw": "Mbak Sari",
  "deadline": "2026-05-02",  // Jumat dari context tanggal meeting
  "context_excerpt": "Mbak Sari akan follow-up vendor X tentang quotation, target Jumat.",
  "status_keyword": null
}

Contoh 2 (pasif tapi tetap action item):
Kalimat MoM: "Laporan Q1 perlu direvisi sebelum minggu depan."
Reasoning: Owner implisit dari konteks meeting. Kalau tidak jelas, assignee = "Unassigned".
Extract:
{
  "action": "create",
  "title": "Revisi laporan Q1",
  "assignee_name_raw": null,
  "deadline": "2026-05-04",
  "context_excerpt": "Laporan Q1 perlu direvisi sebelum minggu depan.",
  "status_keyword": "review"
}
```

### Pattern C: Format nama Indonesia → fuzzy match

```
PARSING NAMA INDONESIA:

- "Pak Budi" / "Bu Sari" / "Mas Andi" / "Mbak Rina" → buang prefix, fuzzy match "Budi", "Sari", dll ke `users.full_name`
- "Tim Marketing" / "Tim Mkt" → match ke `teams.name` dengan fuzzy. Kalau match, assignee = team_lead. Kalau tidak match, assignee = null + flag.
- Nama lengkap "Budi Santoso" — exact-ish match ke full_name, harus prioritas lebih tinggi dari panggilan singkat
- Multiple match (mis. ada 2 user "Budi") → pilih yang paling relevant by konteks meeting (project owner, last comment, dll), atau set null + needs_review

Threshold fuzzy match nama:
- > 0.7 → assign langsung
- 0.5 - 0.7 → assign + flag needs_review
- < 0.5 → assignee = "Unassigned" + flag needs_review
```

### Pattern D: Status keyword expansion + negation

```
DETEKSI STATUS KEYWORD:

Done indicators (status → 'done'):
- "selesai", "sudah selesai", "completed", "done", "kelar", "beres"
- NEGATION: "belum selesai", "hampir selesai", "tidak selesai" → BUKAN done

Blocked indicators (status → 'blocked'):
- "blocked", "stuck", "menunggu", "pending vendor", "tertahan", "macet"
- NEGATION: "tidak blocked", "sudah unblocked" → BUKAN blocked

Review indicators (status → 'review'):
- "review dulu", "cek dulu", "tolong review", "minta feedback"
- NEGATION: "selesai review" → done, BUKAN review

Default: status_keyword = null (jangan paksa kategori kalau ambigu)
```

### Pattern E: Eval spreadsheet template

CSV format untuk BD isi sebagai ground truth:

```csv
sample_file,line_number,expected_action,expected_title,expected_assignee_name,expected_deadline,expected_status_keyword,notes
mom-2026-04-15.docx,5,create,"Follow-up vendor X","Mbak Sari","2026-04-22",,
mom-2026-04-15.docx,8,skip,,,,,"Decision/agreement, bukan action item"
mom-2026-04-15.docx,12,create,"Revisi laporan Q1",,,review,"Owner implisit"
mom-2026-04-22.docx,3,update,"Follow-up vendor X","Mbak Sari",,done,"MoM sebut sudah selesai"
```

Setelah BD isi 5-10 file, run:

```python
# Pseudocode evaluation script
for sample_file in sample_files:
    actual_output = run_cowork_prompt(sample_file)
    expected = load_ground_truth(sample_file)
    metrics = compare(actual_output, expected)
    # metrics: precision, recall, false_positive_count, hallucination_count

aggregate_metrics(all_samples)
# Report: false_positive_rate, false_negative_rate per failure type
```

## Anti-patterns yang harus dihindari

1. **Tune prompt tanpa eval data** — guesswork, akan oscillate forever
2. **Ubah multiple hal sekaligus per iteration** — gak bisa attribute improvement ke change yang mana
3. **Hapus anti-hallucination constraint** untuk "lebih helpful" — hallucination > miss action items dalam impact bisnis
4. **Hardcode threshold di prompt tanpa update ADR** — silent decision drift
5. **Tambah few-shot example yang terlalu spesifik** — bikin overfit ke kasus tertentu, gagal di generalisasi
6. **Skip dry-run mode untuk test prompt baru di production** — risiko UPDATE task user secara salah
7. **Tidak monitor `cowork_runs` table** untuk pattern fail — table sudah di-spec untuk audit, harus dipakai
8. **Lupa update Edge Function parser** kalau output schema berubah — silent fail di pipeline

## Output format

Saat user minta "tune prompt":

1. Capture failure type dari sample yang kasih (1-6)
2. Propose intervensi spesifik dengan diff format:
   ```diff
   - Old prompt section
   + New prompt section
   ```
3. Predict expected impact: "Ini harusnya fix Type 3 (wrong assignee), tidak affect Type 1/2"
4. Reminder: "Re-run full sample set sebelum approve. Jangan deploy ke production tanpa eval."

Saat user minta "generate prompt baru":

1. Generate full prompt sesuai PRD §12.1 baseline
2. File location: `cowork-agent/prompt.md`
3. Versioning: `prompt-v{N}.md` jika sudah ada iteration sebelumnya
4. Sertakan changelog di header file

## Kapan TIDAK pakai skill ini

- User minta debug Cowork connection ke Drive (itu infrastructure, bukan prompt)
- User minta ubah Edge Function `cowork-sync` (itu code, bukan prompt)
- User minta hitung statistik dari `cowork_runs` table (itu analytics, pakai SQL biasa)
- User minta brainstorm fitur Cowork baru (itu PRD-level discussion, bukan tuning)

## Related

- PRD F9 (Cowork integration spec)
- PRD §12.1 (full prompt template baseline)
- CLAUDE.md Checkpoint 3 — review hasil Cowork dengan 5-10 sample MoM real
- ADR-006 (jika ada — untuk threshold change)
- Action item PRD §10.3 #9 — kumpulkan sample MoM
- Tabel `cowork_runs` — audit trail per run
