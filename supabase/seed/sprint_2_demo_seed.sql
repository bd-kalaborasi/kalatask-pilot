-- =============================================================
-- Sprint 2 Demo Seed — sample projects + tasks untuk Kanban + Gantt demo
--
-- Tujuan:
--   Sprint 1 hanya seed users + teams. Sprint 2 ship F3 view UI tanpa
--   project/task data di remote. Seed ini provide fixture data untuk:
--   1. Visual demo Kanban (5 status, kolom Blocked dengan red urgency)
--   2. Visual demo Gantt (bar untuk task dengan estimated_hours,
--      milestone untuk task tanpa estimate)
--   3. Test F14 lifecycle UI dengan project status mix
--   4. Manual Checkpoint 3 (BD owner verification)
--
-- Apply:
--   Buka Supabase Dashboard → SQL Editor → paste isi file → Run.
--   Idempotent: ON CONFLICT DO NOTHING aman re-run.
--
-- Cleanup (kalau mau remove demo data):
--   DELETE FROM public.projects WHERE id IN (
--     '00000000-0000-0000-0000-0000000d1100',
--     '00000000-0000-0000-0000-0000000d2200',
--     '00000000-0000-0000-0000-0000000d3300'
--   );
--   -- Tasks cascade-deleted via FK ON DELETE CASCADE.
--
-- Refer:
--   - PRD F3 acceptance criteria (line 202-205)
--   - PRD F14 (line 144) — project lifecycle status enum
--   - docs/sprint-2-checkpoint-3-instructions.md
--   - Sprint 1 seed: supabase/seed/auth_users_seed.sql (4 test users)
--
-- Schema:
--   3 projects: 1 active Sari (Team Alpha), 1 active Rangga (Team Beta),
--               1 on_hold Sari (Team Alpha)
--   18 tasks distributed:
--     - Project Onboarding: 7 task (mix status, 1 subtask)
--     - Project Customer Feedback: 7 task (mix status)
--     - Project Migrasi: 4 task (review/todo/blocked/done — on_hold scenario)
--   Mix deadline + estimated_hours untuk Gantt scenarios.
--   Indonesian language (BRAND.md tone friendly-professional).
--
-- Author: Claude Code (Sprint 2 Step 8)
-- =============================================================


-- ============================================================
-- 1. PROJECTS (3 sample)
-- ============================================================
INSERT INTO public.projects (id, name, description, owner_id, status, completed_at) VALUES
  ('00000000-0000-0000-0000-0000000d1100', 'Demo: Onboarding Tim Q2', 'Materi onboarding new hire Q2 — sample data Sprint 2 demo', '00000000-0000-0000-0000-000000000002', 'active', NULL),
  ('00000000-0000-0000-0000-0000000d2200', 'Demo: Customer Feedback Sprint', 'Riset feedback pelanggan Q2 untuk roadmap Q3', '00000000-0000-0000-0000-000000000005', 'active', NULL),
  ('00000000-0000-0000-0000-0000000d3300', 'Demo: Migrasi Internal Tools', 'Migrasi tools internal — pause sampai vendor selesai', '00000000-0000-0000-0000-000000000002', 'on_hold', NULL)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 2. TASKS (18 distributed across 3 project)
-- ============================================================
INSERT INTO public.tasks (id, project_id, parent_id, title, description, assignee_id, created_by, status, priority, deadline, estimated_hours, start_date, source) VALUES
  -- Project Onboarding (Sari) — 7 task
  ('00000000-0000-0000-0000-0000000d1101', '00000000-0000-0000-0000-0000000d1100', NULL, 'Susun deck onboarding day 1', 'Slide deck welcome dan tour kantor untuk new hire', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'todo', 'high', '2026-05-15', 8, '2026-05-08', 'manual'),
  ('00000000-0000-0000-0000-0000000d1102', '00000000-0000-0000-0000-0000000d1100', NULL, 'Review materi mentor handbook', 'Review handbook mentor — pastikan up-to-date dengan policy 2026', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'in_progress', 'medium', '2026-05-20', 4, NULL, 'manual'),
  ('00000000-0000-0000-0000-0000000d1103', '00000000-0000-0000-0000-0000000d1100', '00000000-0000-0000-0000-0000000d1101', 'Setup template Google Slides', 'Subtask: bikin template branded sesuai BRAND.md', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'todo', 'low', '2026-05-12', 2, NULL, 'manual'),
  ('00000000-0000-0000-0000-0000000d1104', '00000000-0000-0000-0000-0000000d1100', NULL, 'Schedule sesi Q&A dengan tim BD', 'Block calendar tim BD untuk sesi tanya jawab onboarding', NULL, '00000000-0000-0000-0000-000000000002', 'todo', 'medium', '2026-05-18', NULL, NULL, 'manual'),
  ('00000000-0000-0000-0000-0000000d1105', '00000000-0000-0000-0000-0000000d1100', NULL, 'Review draft sama lead BD', 'Review final draft onboarding deck dengan Pak Budi', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'review', 'high', '2026-05-22', 3, NULL, 'manual'),
  ('00000000-0000-0000-0000-0000000d1106', '00000000-0000-0000-0000-0000000d1100', NULL, 'Finalize budget sesi catering', 'Approve budget catering pelatihan minggu pertama', NULL, '00000000-0000-0000-0000-000000000002', 'done', 'medium', '2026-04-25', 2, NULL, 'manual'),
  ('00000000-0000-0000-0000-0000000d1107', '00000000-0000-0000-0000-0000000d1100', NULL, 'Vendor printing buku panduan stuck', 'Vendor printing belum kasih kabar — follow up minggu ini', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'blocked', 'urgent', '2026-05-10', NULL, NULL, 'manual'),

  -- Project Customer Feedback (Rangga) — 7 task
  ('00000000-0000-0000-0000-0000000d2201', '00000000-0000-0000-0000-0000000d2200', NULL, 'Susun pertanyaan survey', 'Buat draft 15 pertanyaan untuk customer survey Q2', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005', 'in_progress', 'urgent', '2026-05-05', 8, '2026-04-28', 'manual'),
  ('00000000-0000-0000-0000-0000000d2202', '00000000-0000-0000-0000-0000000d2200', NULL, 'Distribusi survey ke 50 customer', 'Kirim link survey ke 50 customer top-tier via email', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000005', 'todo', 'high', '2026-05-12', 4, NULL, 'manual'),
  ('00000000-0000-0000-0000-0000000d2203', '00000000-0000-0000-0000-0000000d2200', NULL, 'Setup tools analisa NPS', 'Pasang tools (Typeform / Google Form) untuk NPS calc', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005', 'todo', 'medium', NULL, NULL, NULL, 'manual'),
  ('00000000-0000-0000-0000-0000000d2204', '00000000-0000-0000-0000-0000000d2200', NULL, 'Compile feedback report', 'Aggregate hasil + draft report 2 halaman', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000005', 'review', 'medium', '2026-05-25', 12, '2026-05-15', 'manual'),
  ('00000000-0000-0000-0000-0000000d2205', '00000000-0000-0000-0000-0000000d2200', NULL, 'Schedule debrief dengan stakeholder', 'Kalendar meeting debrief temuan key feedback', NULL, '00000000-0000-0000-0000-000000000005', 'todo', 'low', NULL, NULL, NULL, 'manual'),
  ('00000000-0000-0000-0000-0000000d2206', '00000000-0000-0000-0000-0000000d2200', NULL, 'Address blocker dari vendor analytics', 'Vendor belum reply integrasi API — wait + escalate', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005', 'blocked', 'urgent', '2026-05-01', NULL, NULL, 'manual'),
  ('00000000-0000-0000-0000-0000000d2207', '00000000-0000-0000-0000-0000000d2200', NULL, 'Q1 retro sudah complete', 'Q1 retrospective sudah final + dokumen archived', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000005', 'done', 'high', '2026-04-15', 6, '2026-04-08', 'manual'),

  -- Project Migrasi Internal (Sari, on_hold) — 4 task
  ('00000000-0000-0000-0000-0000000d3301', '00000000-0000-0000-0000-0000000d3300', NULL, 'Audit current tools usage', 'List tools internal + jumlah user aktif untuk evaluasi migrasi', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'review', 'medium', '2026-04-30', 6, '2026-04-22', 'manual'),
  ('00000000-0000-0000-0000-0000000d3302', '00000000-0000-0000-0000-0000000d3300', NULL, 'Proposal vendor baru', 'Bandingkan 3 vendor + rekomendasi ke management', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'todo', 'low', NULL, 8, NULL, 'manual'),
  ('00000000-0000-0000-0000-0000000d3303', '00000000-0000-0000-0000-0000000d3300', NULL, 'Pause: tunggu approval budget Q3', 'Project di-hold sampai approval budget management', NULL, '00000000-0000-0000-0000-000000000002', 'blocked', 'medium', NULL, NULL, NULL, 'manual'),
  ('00000000-0000-0000-0000-0000000d3304', '00000000-0000-0000-0000-0000000d3300', NULL, 'Document existing pain points', 'Catat pain point user current tools — input untuk vendor brief', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'done', 'low', '2026-04-18', 4, NULL, 'manual')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- POST-APPLY VERIFICATION:
--   SELECT count(*) FROM public.projects WHERE id LIKE '00000000-0000-0000-0000-0000000d%';
--     Expected: 3
--   SELECT count(*) FROM public.tasks WHERE project_id LIKE '00000000-0000-0000-0000-0000000d%';
--     Expected: 18
--
-- POST-DEMO CLEANUP:
--   Lihat header file untuk DELETE statement.
-- =============================================================
