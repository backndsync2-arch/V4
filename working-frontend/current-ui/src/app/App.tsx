import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { PlaybackProvider } from '@/lib/playback';
import { FilesProvider } from '@/lib/files';
import { SignInEnhanced } from '@/app/components/SignInEnhanced';
import { SignUp } from '@/app/components/SignUp';
import { ContactUsPage } from '@/app/components/ContactUsPage';
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
import { ChannelPlaylists } from '@/app/components/ChannelPlaylists';
import { Tutorial, useTutorial } from '@/app/components/Tutorial';
import { TutorialOverlay } from '@/app/components/TutorialOverlay';
import { Toaster } from '@/app/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';

// Security module is disabled for development
// To enable in production: set VITE_ENABLE_SECURITY=true in .env
// import '@/lib/security';

// Version: 1.0.4 - Dev mode: Auto-login as admin, bypass landing/login pages
// To restore original auth flow: See App.tsx.BACKUP_ORIGINAL_AUTH_FLOW

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Debug navigation changes
  React.useEffect(() => {
    console.log('Current page changed to:', currentPage);
  }, [currentPage]);
  
  // DEV MODE: Disable all landing/login/signup/tutorial pages
  // Auto-login is handled in auth.tsx
  const isDev = import.meta.env.DEV;
  
  // Store original state (for restoration later)
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showContactUs, setShowContactUs] = useState(false);
  const [signUpData, setSignUpData] = useState<{ name: string; email: string; companyName: string; phone?: string } | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCancellation, setShowCancellation] = useState(false);
  const { showTutorial, completeTutorial } = useTutorial();

  // Listen for navigation events from Admin page
  React.useEffect(() => {
    const handleNavigate = (e: any) => {
      setCurrentPage(e.detail);
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
          {isDev && (
            <p className="mt-2 text-xs text-gray-500">Dev mode: Auto-logging in as admin...</p>
          )}
        </div>
      </div>
    );
  }

  // DEV MODE: Skip all landing/login pages, go straight to app
  if (isDev) {
    // If no user after loading, show loading (auth is trying to auto-login)
    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Auto-logging in as admin...</p>
          </div>
        </div>
      );
    }
    // User is logged in, show app directly (skip all landing/login pages)
  } else {
    // PRODUCTION MODE: Show original auth flow
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

    if (!user) {
      if (showContactUs) {
        return (
          <ContactUsPage 
            signUpData={signUpData || undefined}
            onBackToLanding={() => {
              setShowContactUs(false);
              setSignUpData(null);
            }}
          />
        );
      }
      if (showSignUp) {
        return (
          <SignUp 
            onBackToSignIn={() => {
              setShowSignUp(false);
              setShowLogin(true);
            }}
            onBackToLanding={() => {
              setShowSignUp(false);
            }}
            onSignUpComplete={(data) => {
              setSignUpData(data);
              setShowSignUp(false);
              setShowContactUs(true);
            }}
          />
        );
      }
      if (showLogin) {
        return (
          <SignInEnhanced 
            onBackToLanding={() => setShowLogin(false)}
            onNavigateToSignUp={() => {
              setShowLogin(false);
              setShowSignUp(true);
            }}
          />
        );
      }
      return (
        <LandingPage 
          onNavigateToLogin={() => setShowLogin(true)}
          onNavigateToTerms={() => setShowTerms(true)}
          onNavigateToPrivacy={() => setShowPrivacy(true)}
          onNavigateToCancellation={() => setShowCancellation(true)}
        />
      );
    }
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
        case 'channel-playlists':
          return <ChannelPlaylists />;
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
          </div>
        </div>
      );
    }
  };

  return (
    <PlaybackProvider>
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        <ErrorBoundary>
          {renderPage()}
        </ErrorBoundary>
      </Layout>
      {/* Tutorial disabled in dev mode */}
      {!isDev && <TutorialOverlay />}
      {!isDev && showTutorial && <Tutorial onComplete={completeTutorial} />}
    </PlaybackProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <FilesProvider>
          <AppContent />
          <Toaster />
        </FilesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}