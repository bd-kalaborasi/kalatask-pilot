/**
 * Playwright globalSetup — pre-condition test users untuk Sprint 4 wizard.
 *
 * Sprint 4 ships F10 wizard yang auto-show kalau onboarding_state.tutorial_done
 * undefined. Untuk avoid wizard intercept click events di Sprint 1-3 specs,
 * set tutorial_done=true untuk semua test user (admin/manager/member/viewer)
 * sebelum suite run. Each user login + PATCH own users row via Supabase
 * REST API (RLS users_update_own allows). Idempotent — overwrite per run.
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const TEST_USERS = [
  { email: 'admin@kalatask.test', password: 'TestAdmin123!' },
  { email: 'sari@kalatask.test', password: 'TestSari123!' },
  { email: 'andi@kalatask.test', password: 'TestAndi123!' },
  { email: 'maya@kalatask.test', password: 'TestMaya123!' },
];

export default async function globalSetup() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      '[globalSetup] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing — skip wizard pre-condition',
    );
    return;
  }
  for (const user of TEST_USERS) {
    const client = createClient(supabaseUrl, supabaseKey);
    const { data: signin, error: signinErr } =
      await client.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });
    if (signinErr || !signin.user) {
      console.warn(
        `[globalSetup] login failed for ${user.email}: ${signinErr?.message}`,
      );
      continue;
    }
    const { data: row } = await client
      .from('users')
      .select('onboarding_state')
      .eq('id', signin.user.id)
      .maybeSingle();
    const existing = (row?.onboarding_state as Record<string, unknown>) ?? {};
    const existingSeen = Array.isArray(existing.tooltips_seen)
      ? (existing.tooltips_seen as string[])
      : [];
    const merged = {
      ...existing,
      tutorial_done: true,
      tutorial_skipped: false,
      sample_seeded: true,
      tooltips_seen: Array.from(
        new Set([...existingSeen, 'kanban-drag', 'view-toggle']),
      ),
    };
    const { error: updErr } = await client
      .from('users')
      .update({ onboarding_state: merged })
      .eq('id', signin.user.id);
    if (updErr) {
      console.warn(
        `[globalSetup] update onboarding_state failed for ${user.email}: ${updErr.message}`,
      );
    }
    await client.auth.signOut();
  }
}
