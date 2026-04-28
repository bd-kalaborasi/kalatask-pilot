/**
 * Onboarding helpers — F10 sample data + tutorial state.
 *
 * Pattern (Q5 owner answer b): client-side trigger via AuthContext.
 *   - createOnboardingSample(): RPC call ke create_onboarding_sample(p_user_id)
 *     SECURITY DEFINER bypass RLS, idempotent (returns same project_id pada repeat).
 *   - updateOnboardingState(): UPDATE public.users.onboarding_state JSONB.
 *   - shouldSeedSample(): checks state.sample_seeded flag.
 */
import { supabase } from '@/lib/supabase';
import type { OnboardingState } from '@/lib/auth';

export async function createOnboardingSample(userId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_onboarding_sample', {
    p_user_id: userId,
  });
  if (error) {
    console.error('[onboarding] createOnboardingSample failed:', error);
    return null;
  }
  return (data as string | null) ?? null;
}

export async function updateOnboardingState(
  userId: string,
  patch: Partial<OnboardingState>,
): Promise<OnboardingState | null> {
  const { data: current } = await supabase
    .from('users')
    .select('onboarding_state')
    .eq('id', userId)
    .maybeSingle();

  const merged: OnboardingState = {
    ...((current?.onboarding_state as OnboardingState | null) ?? {}),
    ...patch,
  };

  const { error } = await supabase
    .from('users')
    .update({ onboarding_state: merged })
    .eq('id', userId);

  if (error) {
    console.error('[onboarding] updateOnboardingState failed:', error);
    return null;
  }
  return merged;
}

export function shouldSeedSample(state: OnboardingState): boolean {
  return state.sample_seeded !== true;
}

export function shouldShowWizard(state: OnboardingState): boolean {
  return state.tutorial_done !== true && state.tutorial_skipped !== true;
}

export function tooltipSeen(state: OnboardingState, key: string): boolean {
  return (state.tooltips_seen ?? []).includes(key);
}

export async function markTooltipSeen(
  userId: string,
  state: OnboardingState,
  key: string,
): Promise<OnboardingState | null> {
  if (tooltipSeen(state, key)) return state;
  const next = [...(state.tooltips_seen ?? []), key];
  return updateOnboardingState(userId, { tooltips_seen: next });
}
