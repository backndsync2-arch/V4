import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { PlaybackProvider } from '@/lib/playback';
import { LocalPlayerProvider } from '@/lib/localPlayer';
import { SignInEnhanced } from '@/app/components/SignInEnhanced';
import { LandingPage } from '@/app/components/LandingPage';
import { TermsAndConditions } from '@/app/components/TermsAndConditions';
import { PrivacyPolicy } from '@/app/components/PrivacyPolicy';
import { CancellationPolicy } from '@/app/components/CancellationPolicy';
import { Layout } from '@/app/components/Layout';
import { Dashboard } from '@/app/components/Dashboard';
import { MusicLibrary } from '@/app/components/MusicLibrary';
import { AnnouncementsFinal } from '@/app/components/AnnouncementsFinal';
import { SimpleScheduler } from '@/app/components/SimpleScheduler';
import { Zones } from '@/app/components/Zones';
import { Users } from '@/app/components/Users';
import { Admin } from '@/app/components/Admin';
import { AdminSettings } from '@/app/components/AdminSettings';
import { Profile } from '@/app/components/Profile';
import { AuditLogs } from '@/app/components/AuditLogs';
import { TutorialOverlay } from '@/app/components/TutorialOverlay';
import { Toaster } from '@/app/components/ui/sonner';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      const token = localStorage.getItem('sync2gear_access_token');
      if (!token) {
        navigate('/login', { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

// Admin Route Component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, impersonatingClient } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not admin OR if impersonating (admin should see client view when impersonating)
    if (user && (user.role !== 'admin' || impersonatingClient)) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, impersonatingClient, navigate]);

  // Don't show admin panel when impersonating
  if (user?.role !== 'admin' || impersonatingClient) {
    return null;
  }

  return <>{children}</>;
}

// Main App Content with Routes
function AppContent() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCancellation, setShowCancellation] = useState(false);

  // Get current page from pathname for Layout
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    return path.slice(1) || 'dashboard';
  };

  const currentPage = getCurrentPage();

  // Redirect logged-in users away from login page
  useEffect(() => {
    if (user && location.pathname === '/login') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // Redirect non-logged-in users to login (except for login and landing pages)
  useEffect(() => {
    if (!isLoading && !user && location.pathname !== '/login' && location.pathname !== '/') {
      const token = localStorage.getItem('sync2gear_access_token');
      if (!token) {
        navigate('/login', { replace: true });
      }
    }
  }, [user, isLoading, location.pathname, navigate]);

  // Redirect root to dashboard if logged in
  useEffect(() => {
    if (user && location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show Terms & Conditions
  if (showTerms) {
    return <TermsAndConditions onBack={() => setShowTerms(false)} />;
  }

  // Show Privacy Policy
  if (showPrivacy) {
    return <PrivacyPolicy onBack={() => setShowPrivacy(false)} />;
  }

  // Show Cancellation Policy
  if (showCancellation) {
    return <CancellationPolicy onBack={() => setShowCancellation(false)} />;
  }

  // Landing page (public)
  if (location.pathname === '/' && !user) {
    return (
      <LandingPage 
        onNavigateToLogin={() => navigate('/login')}
        onNavigateToTerms={() => setShowTerms(true)}
        onNavigateToPrivacy={() => setShowPrivacy(true)}
        onNavigateToCancellation={() => setShowCancellation(true)}
      />
    );
  }

  // Login page (public)
  if (location.pathname === '/login' && !user) {
    return <SignInEnhanced onBackToLanding={() => navigate('/')} />;
  }

  // All other routes require authentication
  return (
    <PlaybackProvider>
      <LocalPlayerProvider>
        <Layout currentPage={currentPage} onNavigate={(page) => navigate(`/${page}`)}>
          <Routes>
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/music" element={
              <ProtectedRoute>
                <MusicLibrary />
              </ProtectedRoute>
            } />
            <Route path="/announcements" element={
              <ProtectedRoute>
                <AnnouncementsFinal />
              </ProtectedRoute>
            } />
            <Route path="/scheduler" element={
              <ProtectedRoute>
                <SimpleScheduler />
              </ProtectedRoute>
            } />
            <Route path="/zones" element={
              <ProtectedRoute>
                <Zones />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="/audit-logs" element={
              <ProtectedRoute>
                <AuditLogs />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin-settings" element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            {/* Redirect root to dashboard if logged in, otherwise to landing */}
            <Route path="/" element={
              user ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />
            } />
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
        <TutorialOverlay />
      </LocalPlayerProvider>
    </PlaybackProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
