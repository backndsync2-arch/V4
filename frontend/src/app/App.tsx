import React, { useState } from 'react';
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
import { Scheduler } from '@/app/components/Scheduler';
import { Zones } from '@/app/components/Zones';
import { Users } from '@/app/components/Users';
import { Admin } from '@/app/components/Admin';
import { AdminSettings } from '@/app/components/AdminSettings';
import { Profile } from '@/app/components/Profile';
import { TutorialOverlay } from '@/app/components/TutorialOverlay';
import { Toaster } from '@/app/components/ui/sonner';

// Security module is disabled for development
// To enable in production: set VITE_ENABLE_SECURITY=true in .env
// import '@/lib/security';

// Version: 1.0.3 - Fix PlaybackProvider context error on hot reload
const APP_VERSION = '1.0.3';

function AppContent() {
  const { user, isLoading } = useAuth();
  
  // Initialize currentPage from URL hash, default to 'dashboard'
  const getPageFromHash = () => {
    const hash = window.location.hash.slice(1) || 'dashboard';
    const validPages = ['dashboard', 'music', 'announcements', 'scheduler', 'zones', 'users', 'admin', 'admin-settings', 'profile', 'login'];
    // If hash is 'login', show login page
    if (hash === 'login') {
      return 'login';
    }
    return validPages.includes(hash) ? hash : 'dashboard';
  };
  
  const [currentPage, setCurrentPage] = useState(getPageFromHash);
  const [showLogin, setShowLogin] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCancellation, setShowCancellation] = useState(false);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Sync URL hash with currentPage
  React.useEffect(() => {
    if (window.location.hash.slice(1) !== currentPage) {
      window.location.hash = currentPage;
    }
  }, [currentPage]);

  // Listen for hash changes (browser back/forward)
  React.useEffect(() => {
    const handleHashChange = () => {
      const page = getPageFromHash();
      setCurrentPage(page);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Listen for navigation events from Admin page
  React.useEffect(() => {
    const handleNavigate = (e: any) => {
      const page = e.detail || 'dashboard';
      setCurrentPage(page);
      window.location.hash = page;
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  // Listen for login request from Layout
  React.useEffect(() => {
    const handleShowLogin = () => {
      setCurrentPage('login');
      window.location.hash = 'login';
    };
    window.addEventListener('showLogin', handleShowLogin);
    return () => window.removeEventListener('showLogin', handleShowLogin);
  }, []);

  // If user is logged in and on login page, redirect to dashboard
  React.useEffect(() => {
    if (user && currentPage === 'login') {
      setCurrentPage('dashboard');
      window.location.hash = 'dashboard';
    }
  }, [user, currentPage]);

  // If user is null and not on login page, redirect to login
  // But only if we're done loading (to avoid redirecting during initial auth check)
  React.useEffect(() => {
    if (!isLoading && !user && currentPage !== 'login') {
      // Check if there's a token in localStorage - if not, definitely redirect
      const token = localStorage.getItem('sync2gear_access_token');
      if (!token) {
        // No token at all, definitely redirect to login
        setCurrentPage('login');
        window.location.hash = 'login';
      }
      // If there's a token but no user, it means the token is invalid
      // The auth context will handle clearing it, so we wait a bit longer
      // to see if the user gets loaded
      else {
        // Give auth context more time to load user from token
        const checkAuth = setTimeout(() => {
          const stillNoUser = !user;
          const stillHasToken = localStorage.getItem('sync2gear_access_token');
          if (stillNoUser && stillHasToken) {
            // Token exists but user didn't load - token might be invalid
            // Don't redirect here, let the auth context handle it
            console.log('Token exists but user not loaded - auth context will handle');
          } else if (stillNoUser && !stillHasToken) {
            // Token was cleared, redirect to login
            setCurrentPage('login');
            window.location.hash = 'login';
          }
        }, 500);
        return () => clearTimeout(checkAuth);
      }
    }
  }, [user, isLoading, currentPage]);

  // NOW WE CAN HAVE CONDITIONAL RETURNS
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

  // Show login page if hash is 'login' or showLogin is true
  if (currentPage === 'login' || (showLogin && !user)) {
    return <SignInEnhanced onBackToLanding={() => {
      setShowLogin(false);
      setCurrentPage('dashboard');
      window.location.hash = 'dashboard';
    }} />;
  }

  // Safety check: if no user and not loading, show login (prevents blank page)
  if (!user && !isLoading && currentPage !== 'login') {
    return <SignInEnhanced onBackToLanding={() => {
      setShowLogin(false);
      setCurrentPage('dashboard');
      window.location.hash = 'dashboard';
    }} />;
  }

  const renderPage = () => {
    try {
      switch (currentPage) {
        case 'dashboard':
          return <Dashboard />;
        case 'music':
          return <MusicLibrary />;
        case 'announcements':
          return <AnnouncementsFinal />;
        case 'scheduler':
          return <Scheduler />;
        case 'zones':
          return <Zones />;
        case 'users':
          return <Users />;
        case 'admin':
          return user.role === 'admin' ? <Admin /> : <Dashboard />;
        case 'admin-settings':
          return user.role === 'admin' ? <AdminSettings /> : <Dashboard />;
        case 'profile':
          return <Profile />;
        default:
          return <Dashboard />;
      }
    } catch (error) {
      console.error('Error rendering page:', error);
      return (
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-semibold mb-2">Error Loading Page</h2>
            <p className="text-red-600 text-sm">Failed to load {currentPage}</p>
            <p className="text-red-500 text-xs mt-2">{String(error)}</p>
            <button
              onClick={() => {
                setCurrentPage('dashboard');
                window.location.hash = 'dashboard';
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <PlaybackProvider>
      <LocalPlayerProvider>
        <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
          {renderPage()}
        </Layout>
        <TutorialOverlay />
      </LocalPlayerProvider>
    </PlaybackProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}