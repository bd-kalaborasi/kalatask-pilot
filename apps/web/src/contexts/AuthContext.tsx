/**
 * AuthContext — provide session + user profile state ke seluruh app.
 *
 * F10 augment: detect first login → trigger create_onboarding_sample RPC
 * (Q5 owner answer b). Idempotent — RPC skip duplicate insert.
 *
 * Lifecycle:
 *   1. Mount: bootstrap dengan onAuthStateChange listener
 *   2. Saat session change: re-fetch user profile dari public.users
 *   3. Kalau profile.onboarding_state.sample_seeded !== true:
 *      → call createOnboardingSample(profile.id)
 *      → updateOnboardingState({ sample_seeded: true })
 *      → re-fetch profile (ensure UI sees latest state)
 *   4. Saat sign out: clear session + profile
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  getCurrentUserProfile,
  onAuthStateChange,
  signOut as supabaseSignOut,
  type OnboardingState,
  type UserProfile,
} from '@/lib/auth';
import {
  createOnboardingSample,
  shouldSeedSample,
  updateOnboardingState,
} from '@/lib/onboarding';

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setOnboardingState: (patch: Partial<OnboardingState>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const seedSampleIfNeeded = useCallback(async (userProfile: UserProfile) => {
    if (!shouldSeedSample(userProfile.onboarding_state)) return userProfile;
    const projectId = await createOnboardingSample(userProfile.id);
    if (!projectId) return userProfile;
    const merged = await updateOnboardingState(userProfile.id, {
      sample_seeded: true,
    });
    return merged
      ? { ...userProfile, onboarding_state: merged }
      : userProfile;
  }, []);

  useEffect(() => {
    let mounted = true;

    // Subscribe-only pattern. onAuthStateChange fires INITIAL_SESSION
    // immediately on subscribe. Callback WAJIB sync — async work via void.
    // CRITICAL: set profile IMMEDIATELY when fetched. Don't await seed RPC
    // di .then chain karena bikin supabase-js v2 listener deadlock (issues
    // #762, #963) — lock contention dengan auth listener internals.
    // Seed check fires di separate microtask, update profile post-seed.
    const { data } = onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setLoading(false);
      if (newSession) {
        void getCurrentUserProfile().then((userProfile) => {
          if (!mounted) return;
          setProfile(userProfile);
          if (userProfile) {
            // Defer seed check ke microtask terpisah biar tidak block setProfile.
            void seedSampleIfNeeded(userProfile).then((seeded) => {
              if (mounted && seeded !== userProfile) setProfile(seeded);
            });
          }
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [seedSampleIfNeeded]);

  const handleSignOut = async () => {
    await supabaseSignOut();
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = useCallback(async () => {
    const fresh = await getCurrentUserProfile();
    setProfile(fresh);
  }, []);

  const setOnboardingState = useCallback(
    async (patch: Partial<OnboardingState>) => {
      if (!profile) return;
      const merged = await updateOnboardingState(profile.id, patch);
      if (merged) {
        setProfile({ ...profile, onboarding_state: merged });
      }
    },
    [profile],
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        signOut: handleSignOut,
        refreshProfile,
        setOnboardingState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus di dalam <AuthProvider>');
  return ctx;
}
