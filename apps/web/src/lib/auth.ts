/**
 * Auth helper module — wrapper di atas supabase.auth + public.users profile fetch.
 *
 * Pattern:
 *   - signIn / signOut / getSession: thin wrapper supabase.auth method
 *   - getCurrentUserProfile: fetch row dari public.users dengan id = auth.uid()
 *     (RLS users_select_same_team_or_self enable user lihat self)
 *   - onAuthStateChange: subscribe ke event login/logout untuk reactive UI
 */
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserRole = 'admin' | 'manager' | 'member' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  team_id: string | null;
  locale: 'id' | 'en';
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Fetch profile current user dari public.users.
 * Return null kalau belum login atau RLS block (defensive).
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, team_id, locale')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserProfile;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange(callback);
}
