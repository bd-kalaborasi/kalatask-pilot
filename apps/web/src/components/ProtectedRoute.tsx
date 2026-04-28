/**
 * ProtectedRoute — guard untuk routes yang require auth.
 *
 * Pattern: component wrapper (bukan HOC) supaya pakai langsung di JSX
 * router config. Show loading spinner saat session check, redirect ke
 * /login kalau gagal.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-sm text-muted-foreground">Memuat...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
