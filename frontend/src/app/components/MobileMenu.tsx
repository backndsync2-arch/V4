import React from 'react';
import { useAuth } from '@/lib/auth';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { Button } from '@/app/components/ui/button';
import { Menu, User, Users, UsersRound, LogOut } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface MobileMenuProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function MobileMenu({ currentPage, onNavigate }: MobileMenuProps) {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  // Mobile menu items - same visibility rules as desktop navbar
  const menuItems = [
    // Team Members: visible to admin, staff, and client roles (not floor_user)
    ...(user && user.role !== 'floor_user' ? [{ id: 'users', label: 'Team Members', icon: UsersRound }] : []),
    // Admin panel: only for sync2gear admins
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin Dashboard', icon: Users }] : []),
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left',
                currentPage === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button
            onClick={() => {
              signOut();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
