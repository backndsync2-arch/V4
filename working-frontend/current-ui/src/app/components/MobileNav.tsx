import React from 'react';
import { LayoutDashboard, Music, Radio, Calendar, Grid3x3, UsersRound, ListMusic } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface MobileNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function MobileNav({ currentPage, onNavigate }: MobileNavProps) {
  const navItems = [
    { id: 'dashboard', label: 'Control', icon: LayoutDashboard },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'announcements', label: 'Announce', icon: Radio },
    { id: 'channel-playlists', label: 'Playlists', icon: ListMusic },
    { id: 'scheduler', label: 'Schedule', icon: Calendar },
    { id: 'zones', label: 'Zones', icon: Grid3x3 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-area-bottom lg:hidden z-40 shadow-lg">
      <nav className="grid grid-cols-6 h-16">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 transition-all min-h-[44px] relative',
              currentPage === item.id
                ? 'text-blue-600'
                : 'text-slate-500 active:bg-slate-100'
            )}
          >
            <item.icon className={cn('h-5 w-5 transition-transform', currentPage === item.id && 'scale-110')} />
            <span className="text-xs font-medium">{item.label}</span>
            {currentPage === item.id && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}