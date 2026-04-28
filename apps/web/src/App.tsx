import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastContainer } from '@/components/ui/toast-container';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { WizardTour } from '@/components/onboarding/WizardTour';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { ManagerDashboardPage } from '@/pages/ManagerDashboardPage';
import { BottleneckPage } from '@/pages/BottleneckPage';
import { lazy, Suspense } from 'react';
// Lazy-load Recharts-heavy pages untuk code-split (R1 mitigation Sprint 3)
const ProductivityDashboardPage = lazy(() =>
  import('@/pages/ProductivityDashboardPage').then((m) => ({
    default: m.ProductivityDashboardPage,
  })),
);
const WorkloadPage = lazy(() =>
  import('@/pages/WorkloadPage').then((m) => ({ default: m.WorkloadPage })),
);

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ToastContainer />
        <BrowserRouter>
        <WizardTour />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute>
                <ProjectDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/manager"
            element={
              <ProtectedRoute>
                <ManagerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/productivity"
            element={
              <ProtectedRoute>
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center bg-canvas">
                      <p className="text-sm text-muted-foreground">
                        Memuat dashboard...
                      </p>
                    </div>
                  }
                >
                  <ProductivityDashboardPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workload"
            element={
              <ProtectedRoute>
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center bg-canvas">
                      <p className="text-sm text-muted-foreground">Memuat...</p>
                    </div>
                  }
                >
                  <WorkloadPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bottleneck"
            element={
              <ProtectedRoute>
                <BottleneckPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
