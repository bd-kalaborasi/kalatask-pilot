-- =============================================================
-- Auth Seed: 4 test users (1 per role) untuk Sprint 1 frontend testing
--
-- ⚠️  TEST CREDENTIALS — JANGAN DIPAKAI DI PRODUCTION ⚠️
--     Password sengaja di-bake di SQL untuk dev convenience.
--     Real production users dibuat via Dashboard / signup flow nanti.
--
-- Test logins:
--   admin@kalatask.test  / TestAdmin123!  (role: admin)
--   sari@kalatask.test   / TestSari123!   (role: manager, Team Alpha)
--   andi@kalatask.test   / TestAndi123!   (role: member,  Team Alpha)
--   maya@kalatask.test   / TestMaya123!   (role: viewer,  Team Beta)
--
-- UUIDs match users.csv fixture untuk konsistensi.
--
-- Apply:
--   Buka Supabase Dashboard → SQL Editor → paste file ini → Run.
--   Idempotent: ON CONFLICT DO NOTHING aman di-run ulang.
--
-- Reversal:
--   DELETE FROM public.users WHERE id IN (
--     '00000000-0000-0000-0000-000000000001',
--     '00000000-0000-0000-0000-000000000002',
--     '00000000-0000-0000-0000-000000000003',
--     '00000000-0000-0000-0000-000000000008'
--   );
--   DELETE FROM auth.identities WHERE user_id IN (
--     '00000000-0000-0000-0000-000000000001',
--     '00000000-0000-0000-0000-000000000002',
--     '00000000-0000-0000-0000-000000000003',
--     '00000000-0000-0000-0000-000000000008'
--   );
--   DELETE FROM auth.users WHERE id IN (
--     '00000000-0000-0000-0000-000000000001',
--     '00000000-0000-0000-0000-000000000002',
--     '00000000-0000-0000-0000-000000000003',
--     '00000000-0000-0000-0000-000000000008'
--   );
--   DELETE FROM public.teams WHERE id IN (
--     '00000000-0000-0000-0000-00000000aaaa',
--     '00000000-0000-0000-0000-00000000bbbb'
--   );
--
-- Author: Claude Code (Sprint 1 Step 9)
-- =============================================================


-- ============================================================
-- 1. TEAMS — required oleh public.users.team_id FK
-- ============================================================
INSERT INTO public.teams (id, name, description) VALUES
  ('00000000-0000-0000-0000-00000000aaaa', 'Team Alpha', 'Tim pilot Alpha — anggota: admin, sari, andi'),
  ('00000000-0000-0000-0000-00000000bbbb', 'Team Beta',  'Tim pilot Beta — anggota: maya')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 2. AUTH USERS — encrypted_password via crypt() bcrypt
-- ============================================================
-- pgcrypto extension sudah enabled by default di Supabase managed.
-- Pattern dari Supabase community recipe untuk seed auth users.

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin@kalatask.test',
    crypt('TestAdmin123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Test"}'::jsonb,
    now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'sari@kalatask.test',
    crypt('TestSari123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sari Wijaya"}'::jsonb,
    now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'andi@kalatask.test',
    crypt('TestAndi123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Andi Pratama"}'::jsonb,
    now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000008',
    'authenticated', 'authenticated',
    'maya@kalatask.test',
    crypt('TestMaya123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maya Anggraini"}'::jsonb,
    now(), now(),
    '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 3. AUTH IDENTITIES — required untuk email login provider
-- ============================================================
-- Supabase butuh row di auth.identities untuk associate email provider
-- ke user. Tanpa ini, signInWithPassword fail meski auth.users ada.

INSERT INTO auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@kalatask.test","email_verified":true}'::jsonb,
    'email',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '{"sub":"00000000-0000-0000-0000-000000000002","email":"sari@kalatask.test","email_verified":true}'::jsonb,
    'email',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    '{"sub":"00000000-0000-0000-0000-000000000003","email":"andi@kalatask.test","email_verified":true}'::jsonb,
    'email',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000008',
    '{"sub":"00000000-0000-0000-0000-000000000008","email":"maya@kalatask.test","email_verified":true}'::jsonb,
    'email',
    now(), now(), now()
  )
ON CONFLICT (provider_id, provider) DO NOTHING;


-- ============================================================
-- 4. PUBLIC.USERS — sync profile dengan UUID match auth.users
-- ============================================================
INSERT INTO public.users (id, email, full_name, role, team_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@kalatask.test', 'Admin Test',      'admin',   '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000002', 'sari@kalatask.test',  'Sari Wijaya',     'manager', '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000003', 'andi@kalatask.test',  'Andi Pratama',    'member',  '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000008', 'maya@kalatask.test',  'Maya Anggraini',  'viewer',  '00000000-0000-0000-0000-00000000bbbb')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- POST-APPLY VERIFICATION:
--
--   1. Verify auth.users row count:
--      SELECT count(*) FROM auth.users
--      WHERE email LIKE '%@kalatask.test';
--      Expected: 4
--
--   2. Verify public.users sync:
--      SELECT email, role FROM public.users
--      WHERE email LIKE '%@kalatask.test'
--      ORDER BY role;
--      Expected: 4 rows (admin / manager / member / viewer)
--
--   3. Test login via curl atau frontend dengan kredensial di header.
-- =============================================================
