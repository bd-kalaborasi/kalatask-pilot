import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { ManagerDashboardPage } from '@/pages/ManagerDashboardPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
