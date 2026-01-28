import React from 'react';
import { LayoutDashboard, Music, Radio, Calendar, Grid3x3, UsersRound } from 'lucide-react';
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
    { id: 'scheduler', label: 'Schedule', icon: Calendar },
    { id: 'zones', label: 'Zones', icon: Grid3x3 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a]/95 backdrop-blur-2xl border-t border-white/10 safe-area-bottom lg:hidden z-40 shadow-2xl shadow-black/50">
      <nav className="grid grid-cols-5 h-20 pb-safe">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onNavigate(item.id);
              window.location.hash = item.id;
            }}
            className={cn(
              'flex flex-col items-center justify-center gap-1.5 transition-all duration-200 min-h-[44px] relative group',
              currentPage === item.id
                ? 'text-[#1db954]'
                : 'text-gray-400 active:scale-95 active:text-[#1db954]'
            )}
          >
            <div className={cn(
              'p-2 rounded-lg transition-all duration-200',
              currentPage === item.id
                ? 'bg-gradient-to-br from-[#1db954]/20 to-[#1ed760]/10 scale-110 border border-[#1db954]/30'
                : 'group-active:bg-white/5'
            )}>
              <item.icon className={cn(
                'h-5 w-5 transition-all duration-200',
                currentPage === item.id && 'scale-110 drop-shadow-sm'
              )} />
            </div>
            <span className={cn(
              'text-[10px] font-semibold transition-all duration-200',
              currentPage === item.id && 'text-[#1db954] scale-105'
            )}>{item.label}</span>
            {currentPage === item.id && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-gradient-to-r from-[#1db954] to-[#1ed760] shadow-sm" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}