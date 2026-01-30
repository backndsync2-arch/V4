import React from 'react';
import { useAuth } from '@/lib/auth';
import { Music2, LayoutDashboard, Music, Radio, Calendar, User, Users, Grid3x3, LogOut, UsersRound } from 'lucide-react';
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
    { id: 'scheduler', label: 'Scheduler', icon: Calendar },
    { id: 'zones', label: 'Zones', icon: Grid3x3 },
    // Hide Team Members for client users or when not logged in
    ...(user && user.role !== 'client' ? [{ id: 'users', label: 'Team Members', icon: UsersRound }] : []),
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Users }] : []),
    ...(user ? [{ id: 'profile', label: 'Profile', icon: User }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#0a0a0a] overflow-y-auto">
      {/* Impersonation Banner */}
      <ImpersonationBanner />

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:block fixed left-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white z-50 shadow-2xl",
        impersonatingClient ? "top-[52px]" : "top-0"
      )}>
        <div className="flex flex-col h-full backdrop-blur-sm">
          <div className="p-6 border-b border-white/10 shrink-0 bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-xl shadow-lg shadow-[#1db954]/50">
                <Music2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">sync2gear</h1>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{user?.role || 'Guest'}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative',
                  currentPage === item.id
                    ? 'bg-gradient-to-r from-[#1db954] to-[#1ed760] text-white shadow-lg shadow-[#1db954]/30 scale-[1.02]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white hover:scale-[1.01]'
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 shrink-0 transition-transform",
                  currentPage === item.id && "scale-110"
                )} />
                <span className="truncate font-medium">{item.label}</span>
                {currentPage === item.id && (
                  <div className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10 shrink-0 bg-gradient-to-r from-[#0a0a0a] to-[#1a1a1a]">
            {user ? (
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200 border border-transparent hover:border-red-500/30"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign out</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onNavigate('login');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-[#1db954] to-[#1ed760] text-white hover:from-[#1ed760] hover:to-[#1db954] transition-all duration-200 shadow-lg shadow-[#1db954]/30"
              >
                <User className="h-5 w-5" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden bg-[#1a1a1a]/95 backdrop-blur-xl border-b border-white/10 px-4 py-3.5 sticky top-0 z-30 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-xl shadow-lg shadow-[#1db954]/30">
                <Music2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">sync2gear</h1>
                <p className="text-xs text-gray-400 capitalize font-medium">{user?.role || 'Guest'}</p>
              </div>
            </div>
            <MobileMenu currentPage={currentPage} onNavigate={onNavigate} />
          </div>
        </header>

        {/* Global Header (Zone selector & status) */}
        <GlobalHeader />

        {/* Desktop Page Header */}
        <header className="hidden lg:block bg-[#1a1a1a]/95 backdrop-blur-xl border-b border-white/10 px-6 xl:px-8 py-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {navItems.find(item => item.id === currentPage)?.label}
              </h2>
              <p className="text-sm text-gray-400 mt-1.5">
                {user ? `${user.name} • ${user.email}` : 'Not signed in'}
              </p>
            </div>
          </div>
        </header>

        <main className={cn(
          "p-4 sm:p-5 md:p-6 lg:p-8",
          // Always add bottom padding on mobile for MobileNav (80px = h-20)
          // When music is playing, add extra padding for MiniPlayer (~78px) + MobileNav (80px) = ~158px
          // Using pb-44 (176px) to ensure no overlap with extra breathing room
          "pb-24 lg:pb-8",
          isMusicPlaying && "pb-44 lg:pb-20"
        )}>
          {children}
        </main>
      </div>

      {/* Mini Player (above mobile nav) */}
      <div className="fixed bottom-20 left-0 right-0 lg:bottom-0 lg:left-64 z-30">
        <MiniPlayer />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav currentPage={currentPage} onNavigate={onNavigate} />
    </div>
  );
}