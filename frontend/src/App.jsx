import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import EntryAnimation from './components/EntryAnimation';

// Lazy-loaded route components for on-demand code splitting
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const RegisterTenant = lazy(() => import('./pages/RegisterTenant'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Properties = lazy(() => import('./pages/Properties'));
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'));
const Apartments = lazy(() => import('./pages/Apartments'));
const Tenants = lazy(() => import('./pages/Tenants'));
const TenantDetail = lazy(() => import('./pages/TenantDetail'));
const Bills = lazy(() => import('./pages/Bills'));
const Payments = lazy(() => import('./pages/Payments'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const Reports = lazy(() => import('./pages/Reports'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Profile = lazy(() => import('./pages/Profile'));
const Search = lazy(() => import('./pages/Search'));
const Landing = lazy(() => import('./pages/Landing'));

// Full-screen loading fallback for guest/entry transitions
const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-8">
    <div className="w-8 h-8 rounded-full border-2 border-[#4A1715] dark:border-[#E6D3BF] border-t-transparent animate-spin opacity-80" />
  </div>
);

// Content-region loading fallback: non-blocking, theme-consistent, preserves Layout shell
const ContentFallback = () => (
  <div className="w-full min-h-[40vh] flex flex-col items-center justify-center p-8 transition-opacity duration-200">
    <div className="w-7 h-7 rounded-full border-2 border-[#4A1715] dark:border-[#E6D3BF] border-t-transparent animate-spin opacity-70" />
    <span className="mt-3 text-xs font-medium text-[#77665A] dark:text-[#AA9886] tracking-wide animate-pulse">
      Loading...
    </span>
  </div>
);

// Persistent Application Layout: keeps Layout shell mounted across all authenticated page switches
const AppLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  // Authenticated: Layout shell stays mounted; lazy chunks load inside <Outlet /> with in-content spinner
  if (user) {
    return (
      <Layout>
        <Suspense fallback={<ContentFallback />}>
          <Outlet />
        </Suspense>
      </Layout>
    );
  }

  // Public/guest navigation: renders child route directly without Layout shell
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
};

// Home Route: Shows public Landing page for guests, Dashboard within layout for logged-in users
const HomeRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Landing />;
  }

  return <Dashboard />;
};

// Protected Route Guard Wrapper
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Guest Route Guard Wrapper (Redirects to / if already logged in)
const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      {children}
    </Suspense>
  );
};

const App = () => {
  return (
    <>
      <EntryAnimation />
      <Routes>
        {/* Public Landing & Guest Authentication Routes */}
        <Route path="/landing" element={<Suspense fallback={<RouteFallback />}><Landing /></Suspense>} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/register-tenant" element={<GuestRoute><RegisterTenant /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
        <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
        <Route path="/verify-email" element={<GuestRoute><VerifyEmail /></GuestRoute>} />

        {/* Persistent Application Shell for Home & Protected Routes */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeRoute />} />

          {/* Role Dashboards */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/owner"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/tenant"
            element={
              <ProtectedRoute allowedRoles={['tenant']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Properties Management */}
          <Route
            path="/properties"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <Properties />
              </ProtectedRoute>
            }
          />
          <Route
            path="/properties/my"
            element={
              <ProtectedRoute allowedRoles={['tenant']}>
                <PropertyDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/properties/:id"
            element={
              <ProtectedRoute>
                <PropertyDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/apartments"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <Apartments />
              </ProtectedRoute>
            }
          />

          {/* Tenants Management */}
          <Route
            path="/tenants"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <Tenants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenants/:id"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <TenantDetail />
              </ProtectedRoute>
            }
          />

          {/* Invoices, Bills and Payments */}
          <Route
            path="/bills"
            element={
              <ProtectedRoute>
                <Bills />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            }
          />

          {/* Maintenance Support */}
          <Route
            path="/maintenance"
            element={
              <ProtectedRoute>
                <Maintenance />
              </ProtectedRoute>
            }
          />

          {/* Calendar Scheduler */}
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarView />
              </ProtectedRoute>
            }
          />

          {/* Reports and Audit Logs */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />

          {/* Profile details */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Global Unified Search */}
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <Search />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Fallback routing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
