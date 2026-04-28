/**
 * useOnboarding hook — expose onboarding state + actions.
 *
 * Wraps AuthContext for reading profile.onboarding_state and patching
 * it via setOnboardingState (which persists to public.users).
 */
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  shouldShowWizard,
  tooltipSeen as isTooltipSeen,
} from '@/lib/onboarding';
import type { OnboardingState } from '@/lib/auth';

export function useOnboarding() {
  const { profile, setOnboardingState } = useAuth();
  const state: OnboardingState = profile?.onboarding_state ?? {};

  // Guard: wizard only relevant for authenticated users with a profile.
  // Without profile (login page, loading state) suppress wizard modal.
  const showWizard = !!profile && shouldShowWizard(state);

  const completeWizard = useCallback(async () => {
    await setOnboardingState({ tutorial_done: true });
  }, [setOnboardingState]);

  const skipWizard = useCallback(async () => {
    await setOnboardingState({ tutorial_skipped: true });
  }, [setOnboardingState]);

  const reopenWizard = useCallback(async () => {
    await setOnboardingState({ tutorial_done: false, tutorial_skipped: false });
  }, [setOnboardingState]);

  const tooltipSeen = useCallback(
    (key: string) => isTooltipSeen(state, key),
    [state],
  );

  const markTooltipSeen = useCallback(
    async (key: string) => {
      if (isTooltipSeen(state, key)) return;
      const next = [...(state.tooltips_seen ?? []), key];
      await setOnboardingState({ tooltips_seen: next });
    },
    [state, setOnboardingState],
  );

  return {
    state,
    showWizard,
    completeWizard,
    skipWizard,
    reopenWizard,
    tooltipSeen,
    markTooltipSeen,
  };
}
