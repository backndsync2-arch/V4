import React from 'react';
import { useAuth } from '@/lib/auth';
import { Music2, LayoutDashboard, Music, Radio, Calendar, User, Users, Grid3x3, LogOut, UsersRound, ListMusic } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { GlobalHeader } from '@/app/components/GlobalHeader';
import { MiniPlayer } from '@/app/components/MiniPlayer';
import { MobileNav } from '@/app/components/MobileNav';
import { MobileMenu } from '@/app/components/MobileMenu';
import { ImpersonationBanner } from '@/app/components/ImpersonationBanner';
import { useLocalPlayer } from '@/lib/localPlayer';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, signOut, impersonatingClient } = useAuth();
  const { track } = useLocalPlayer();
  const isMusicPlaying = !!track;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'music', label: 'Music Library', icon: Music },
    { id: 'announcements', label: 'Announcements', icon: Radio },
    { id: 'channel-playlists', label: 'Channel Playlists', icon: ListMusic },
    { id: 'scheduler', label: 'Scheduler', icon: Calendar },
    { id: 'zones', label: 'Zones & Devices', icon: Grid3x3 },
    // Hide Team Members for client users or when not logged in
    ...(user && user.role !== 'client' ? [{ id: 'users', label: 'Team Members', icon: UsersRound }] : []),
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Users }] : []),
    ...(user ? [{ id: 'profile', label: 'Profile', icon: User }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Impersonation Banner */}
      <ImpersonationBanner />

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:block fixed left-0 h-screen w-64 bg-slate-900 text-white z-50",
        impersonatingClient ? "top-[52px]" : "top-0"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-700 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg">
                <Music2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">sync2gear</h1>
                <p className="text-xs text-slate-400 capitalize">{user?.role || 'Guest'}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  window.location.hash = item.id;
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                  currentPage === item.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-700 shrink-0">
            {user ? (
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign out</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  // Navigate to login page via hash
                  onNavigate('login');
                  window.location.hash = 'login';
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <User className="h-5 w-5" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow">
                <Music2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">sync2gear</h1>
                <p className="text-xs text-slate-500 capitalize">{user?.role || 'Guest'}</p>
              </div>
            </div>
            <MobileMenu currentPage={currentPage} onNavigate={onNavigate} />
          </div>
        </header>

        {/* Global Header (Zone selector & status) */}
        <GlobalHeader />

        {/* Desktop Page Header */}
        <header className="hidden lg:block bg-white border-b border-slate-200 px-6 xl:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                {navItems.find(item => item.id === currentPage)?.label}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {user ? `${user.name} • ${user.email}` : 'Not signed in'}
              </p>
            </div>
          </div>
        </header>

        <main className={cn(
          "p-4 md:p-6 lg:p-8",
          // Add bottom padding when music is playing to prevent content from being hidden
          isMusicPlaying && "pb-20 lg:pb-20"
        )}>
          {children}
        </main>
      </div>

      {/* Mini Player (above mobile nav) */}
      <div className="fixed bottom-16 left-0 right-0 lg:bottom-0 lg:left-64 z-30">
        <MiniPlayer />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav currentPage={currentPage} onNavigate={onNavigate} />
    </div>
  );
}