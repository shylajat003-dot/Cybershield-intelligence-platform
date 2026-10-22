import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { SOCLayout } from './layouts/SOCLayout';
import { LoadingSpinner } from './components/LoadingSpinner';

// ─── Eagerly loaded (always needed) ──────────────────────────────────────────
import { Login } from './pages/Login';
import { Register } from './pages/Register';

// ─── Route-level lazy loading ─────────────────────────────────────────────────
// Each page becomes its own JS chunk → initial bundle size drops significantly.
// Recharts (the heaviest dependency) is only loaded when the Dashboard is visited.
const Dashboard        = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Threats          = lazy(() => import('./pages/Threats').then(m => ({ default: m.Threats })));
const ThreatDetail     = lazy(() => import('./pages/ThreatDetail').then(m => ({ default: m.ThreatDetail })));
const Incidents        = lazy(() => import('./pages/Incidents').then(m => ({ default: m.Incidents })));
const IncidentDetail   = lazy(() => import('./pages/IncidentDetail').then(m => ({ default: m.IncidentDetail })));
const Vulnerabilities  = lazy(() => import('./pages/Vulnerabilities').then(m => ({ default: m.Vulnerabilities })));
const Assets           = lazy(() => import('./pages/Assets').then(m => ({ default: m.Assets })));
const AssetDetail      = lazy(() => import('./pages/AssetDetail').then(m => ({ default: m.AssetDetail })));
const Alerts           = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })));
const ThreatSources    = lazy(() => import('./pages/ThreatSources').then(m => ({ default: m.ThreatSources })));
const Reports          = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const AuditLogs        = lazy(() => import('./pages/AuditLogs').then(m => ({ default: m.AuditLogs })));
const AttackTechniques = lazy(() => import('./pages/AttackTechniques').then(m => ({ default: m.AttackTechniques })));

// ─── Shared page suspense fallback ───────────────────────────────────────────
const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-[60vh]">
    <LoadingSpinner text="Loading module..." size="lg" />
  </div>
);

// ─── Auth guard ───────────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <LoadingSpinner text="Authenticating SOC session..." size="lg" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

// ─── App ──────────────────────────────────────────────────────────────────────
export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public auth routes — no lazy loading needed */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected SOC shell — lazy pages load inside Suspense */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <SOCLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />

              <Route
                path="dashboard"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Dashboard />
                  </Suspense>
                }
              />
              <Route
                path="threats"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Threats />
                  </Suspense>
                }
              />
              <Route
                path="threats/:id"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ThreatDetail />
                  </Suspense>
                }
              />
              <Route
                path="incidents"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Incidents />
                  </Suspense>
                }
              />
              <Route
                path="incidents/:id"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <IncidentDetail />
                  </Suspense>
                }
              />
              <Route
                path="vulnerabilities"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Vulnerabilities />
                  </Suspense>
                }
              />
              <Route
                path="assets"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Assets />
                  </Suspense>
                }
              />
              <Route
                path="assets/:id"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AssetDetail />
                  </Suspense>
                }
              />
              <Route
                path="alerts"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Alerts />
                  </Suspense>
                }
              />
              <Route
                path="sources"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ThreatSources />
                  </Suspense>
                }
              />
              <Route
                path="reports"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Reports />
                  </Suspense>
                }
              />
              <Route
                path="attack-techniques"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AttackTechniques />
                  </Suspense>
                }
              />
              <Route
                path="audit-logs"
                element={
                  <ProtectedRoute adminOnly>
                    <Suspense fallback={<PageLoader />}>
                      <AuditLogs />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
