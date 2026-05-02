/**
 * useOnboarding hook — expose onboarding state + actions.
 *
 * Wraps AuthContext for reading profile.onboarding_state and patching
 * it via setOnboardingState (which persists to public.users).
 *
 * Reopen flow uses an in-memory "ephemeral show" flag so users (and tests)
 * can re-trigger the wizard without flipping persisted DB state — preventing
 * stale tutorial_done=false leaking into subsequent sessions/tests.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  shouldShowWizard,
  tooltipSeen as isTooltipSeen,
} from '@/lib/onboarding';
import type { OnboardingState } from '@/lib/auth';

let ephemeralShow = false;
type Subscriber = (next: boolean) => void;
const subscribers = new Set<Subscriber>();

function setEphemeralShow(next: boolean) {
  ephemeralShow = next;
  subscribers.forEach((fn) => fn(next));
}

export function useOnboarding() {
  const { profile, setOnboardingState } = useAuth();
  const state: OnboardingState = profile?.onboarding_state ?? {};

  const [reopened, setReopened] = useState(ephemeralShow);
  useEffect(() => {
    const fn: Subscriber = (next) => setReopened(next);
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  // Wizard shows when persisted state says so OR user explicitly reopened.
  const showWizard =
    !!profile && (reopened || shouldShowWizard(state));

  const completeWizard = useCallback(async () => {
    setEphemeralShow(false);
    await setOnboardingState({ tutorial_done: true });
  }, [setOnboardingState]);

  const skipWizard = useCallback(async () => {
    setEphemeralShow(false);
    await setOnboardingState({ tutorial_skipped: true });
  }, [setOnboardingState]);

  const reopenWizard = useCallback(async () => {
    // Ephemeral only — does NOT clear persisted tutorial_done.
    // Skip/Complete clears the ephemeral flag.
    setEphemeralShow(true);
  }, []);

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
