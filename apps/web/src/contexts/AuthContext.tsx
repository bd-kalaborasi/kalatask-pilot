/**
 * AuthContext — provide session + user profile state ke seluruh app.
 *
 * Pattern: simple useState + useEffect (no reducer/Zustand — Context cukup
 * untuk auth scope per task brief constraint).
 *
 * Lifecycle:
 *   1. Mount: bootstrap dengan getSession() + onAuthStateChange listener
 *   2. Saat session change: re-fetch user profile dari public.users
 *   3. Saat sign out: clear session + profile
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  getCurrentUserProfile,
  getSession,
  onAuthStateChange,
  signOut as supabaseSignOut,
  type UserProfile,
} from '@/lib/auth';

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Bootstrap: cek session existing + fetch profile kalau ada
    (async () => {
      const initialSession = await getSession();
      if (!mounted) return;
      setSession(initialSession);
      if (initialSession) {
        const userProfile = await getCurrentUserProfile();
        if (mounted) setProfile(userProfile);
      }
      if (mounted) setLoading(false);
    })();

    // Subscribe ke auth state change (sign in / sign out / token refresh)
    const { data } = onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession) {
        const userProfile = await getCurrentUserProfile();
        if (mounted) setProfile(userProfile);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabaseSignOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, signOut: handleSignOut }}
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
