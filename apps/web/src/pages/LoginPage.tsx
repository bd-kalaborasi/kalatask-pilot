/**
 * LoginPage — Supabase Auth email + password login.
 *
 * Microcopy per skill kalatask-microcopy:
 *   - Sign in: "Masuk"
 *   - Login fail: "Email atau password salah. Coba lagi atau reset password."
 *   - Loading: "Memuat..."
 */
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { signIn } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function LoginPage() {
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Kalau sudah logged in, redirect ke dashboard
  if (!authLoading && session) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    const { error } = await signIn(email, password);
    setSubmitting(false);

    if (error) {
      setErrorMsg('Email atau password salah. Coba lagi atau reset password.');
      return;
    }
    // Successful sign in — AuthContext listener akan auto-update session,
    // kemudian Navigate redirect via early return di atas saat re-render.
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <h1 className="kt-wordmark text-4xl">
            <span className="kt-wordmark-kala">Kala</span>
            <span className="kt-wordmark-task">Task</span>
          </h1>
          <CardTitle className="text-xl">Masuk ke KalaTask</CardTitle>
          <CardDescription>
            Pakai email kerja kamu untuk masuk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@kalaborasi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={submitting}
              />
            </div>
            {errorMsg && (
              <p
                role="alert"
                className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md"
              >
                {errorMsg}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Memuat...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
