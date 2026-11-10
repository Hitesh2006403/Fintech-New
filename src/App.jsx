import React from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { Header } from './components/layout/Header.jsx';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { MobileBottomNav } from './components/layout/MobileBottomNav.jsx';
import { QuickAddModal } from './components/common/QuickAddModal.jsx';

// 10 Dedicated Pages
import { OverviewDashboard } from './pages/OverviewDashboard.jsx';
import { IncomeManagement } from './pages/IncomeManagement.jsx';
import { ExpensesBills } from './pages/ExpensesBills.jsx';
import { SafeToSpendCalculator } from './pages/SafeToSpendCalculator.jsx';
import { CashFlowForecast } from './pages/CashFlowForecast.jsx';
import { PaymentDelaySimulator } from './pages/PaymentDelaySimulator.jsx';
import { SmartBillPrioritization } from './pages/SmartBillPrioritization.jsx';
import { LeanWeekSavings } from './pages/LeanWeekSavings.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';
import { ProfileSettings } from './pages/ProfileSettings.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { OAuthCallbackHandler } from './pages/OAuthCallbackHandler.jsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx';

const AdminPortal = React.lazy(() => import('./pages/admin/AdminPortal.jsx').then(m => ({ default: m.AdminPortal })));
import { Background3D } from './components/common/Background3D.jsx';
import { navigationTracker } from './services/navigationTracker.js';

import './App.css';

function LoadingScreen({ message = 'Verifying secure session...' }) {
  const [showRetry, setShowRetry] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1220', position: 'relative' }}>
      <Background3D />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1, padding: 24, textAlign: 'center' }}>
        <div style={{ width: 38, height: 38, border: '3px solid rgba(56, 189, 248, 0.2)', borderTopColor: '#38BDF8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', boxShadow: '0 0 16px rgba(56, 189, 248, 0.35)' }} />
        <div style={{ fontSize: 13.5, color: '#94A3B8', fontWeight: 500 }}>{message}</div>
        {showRetry && (
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38BDF8',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Retry Connection
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('uip_auth_token');
                  localStorage.removeItem('uip_fallback_user');
                } catch {}
                window.location.href = '/login';
              }}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94A3B8',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const AUTHORIZED_ADMIN_EMAILS = ['hiteshav2006@gmail.com', 'dishankbs04@gmail.com'];

export function checkIsAdmin(user) {
  if (!user) return false;
  if (user.isAdmin || user.role === 'Super Administrator' || user.role === 'admin') return true;
  if (user.email && AUTHORIZED_ADMIN_EMAILS.includes(user.email.toLowerCase().trim())) return true;
  return false;
}

// Route Guard for Landing / Home
function HomeRoute() {
  const { user, authLoading } = useApp();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user || !user.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (checkIsAdmin(user)) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function NavigationWatcher() {
  const location = useLocation();

  React.useEffect(() => {
    navigationTracker.record(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}

// Route Guard for Login Page
function LoginRoute() {
  const { user, authLoading } = useApp();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (user && user.isAuthenticated) {
    if (checkIsAdmin(user)) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthPage initialMode="login" />;
}

// Route Guard for Register Page
function RegisterRoute() {
  const { user, authLoading } = useApp();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (user && user.isAuthenticated) {
    if (checkIsAdmin(user)) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthPage initialMode="register" />;
}

// Route Guard for Setup Wizard Page
function SetupWizardRoute() {
  const { authLoading } = useApp();

  if (authLoading) {
    return <LoadingScreen message="Loading setup wizard..." />;
  }

  return <AuthPage initialMode="onboarding" />;
}

// User App Shell Layout
function MainAppShellLayout() {
  const { user, authLoading } = useApp();
  const location = useLocation();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user || !user.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="app-shell">
      <Background3D />
      <Sidebar />
      <div className="app-main-content">
        <Header />
        <main>
          <Outlet />
        </main>
      </div>
      <QuickAddModal />
      <MobileBottomNav />
    </div>
  );
}

// Admin Route Guard
function AdminRouteGuard() {
  const { user, authLoading } = useApp();
  const location = useLocation();

  if (authLoading) {
    return <LoadingScreen message="Verifying administrator credentials & session..." />;
  }

  if (!user || !user.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isAdmin = checkIsAdmin(user);
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <React.Suspense fallback={<LoadingScreen message="Loading Administrator Portal..." />}>
      <AdminPortal />
    </React.Suspense>
  );
}

function AppRoutes() {
  return (
    <>
      <NavigationWatcher />
      <Routes>
        {/* Root Route */}
        <Route path="/" element={<HomeRoute />} />

        {/* Common Login, Register, Setup & Password Recovery Routes */}
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route path="/setup" element={<SetupWizardRoute />} />
        <Route path="/onboarding" element={<Navigate to="/setup" replace />} />
        <Route path="/reset-password" element={<AuthPage initialMode="forgot" />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />

        {/* OAuth Callback Handlers (Prevents 404 Route Unresolved on OAuth redirect return) */}
        <Route path="/auth/callback" element={<OAuthCallbackHandler />} />
        <Route path="/callback" element={<OAuthCallbackHandler />} />
        <Route path="/login/callback" element={<OAuthCallbackHandler />} />
        <Route path="/oauth/callback" element={<OAuthCallbackHandler />} />
        <Route path="/api/auth/callback" element={<OAuthCallbackHandler />} />

        {/* Protected User Dashboard Routes */}
        <Route element={<MainAppShellLayout />}>
          <Route path="/dashboard" element={<OverviewDashboard />} />
          <Route path="/income" element={<IncomeManagement />} />
          <Route path="/expenses" element={<ExpensesBills />} />
          <Route path="/transactions" element={<ExpensesBills />} />
          <Route path="/safe-to-spend" element={<SafeToSpendCalculator />} />
          <Route path="/forecast" element={<CashFlowForecast />} />
          <Route path="/simulator" element={<PaymentDelaySimulator />} />
          <Route path="/prioritization" element={<SmartBillPrioritization />} />
          <Route path="/savings" element={<LeanWeekSavings />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<ProfileSettings />} />
        </Route>

        {/* Protected Admin Routes */}
        <Route path="/admin" element={<AdminRouteGuard />} />
        <Route path="/admin/*" element={<AdminRouteGuard />} />

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </ErrorBoundary>
  );
}

