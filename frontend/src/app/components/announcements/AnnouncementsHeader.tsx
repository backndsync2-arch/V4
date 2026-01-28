import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogTrigger } from '@/app/components/ui/dialog';
import { Volume2, Plus } from 'lucide-react';

interface AnnouncementsHeaderProps {
  onCreateClick: () => void;
  onInstantPlayClick: () => void;
  isCreateOpen: boolean;
  isInstantOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onInstantOpenChange: (open: boolean) => void;
  instantPlayDialog: React.ReactNode;
  createDialog: React.ReactNode;
}

export function AnnouncementsHeader({
  onCreateClick,
  onInstantPlayClick,
  isCreateOpen,
  isInstantOpen,
  onCreateOpenChange,
  onInstantOpenChange,
  instantPlayDialog,
  createDialog,
}: AnnouncementsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          Announcements Studio
        </h2>
        <p className="text-gray-400 mt-1.5">Manage announcement folders, playlists, and scheduling intervals</p>
      </div>
      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <Dialog open={isInstantOpen} onOpenChange={onInstantOpenChange}>
          <DialogTrigger asChild>
            <Button 
              variant="outline"
              className="bg-white/5 backdrop-blur-sm border-white/20 hover:bg-white/10 text-white shadow-sm"
            >
              <Volume2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Instant Play</span>
              <span className="sm:hidden">Play</span>
            </Button>
          </DialogTrigger>
          {instantPlayDialog}
        </Dialog>
        <Dialog open={isCreateOpen} onOpenChange={onCreateOpenChange}>
          <DialogTrigger asChild>
            <Button 
              onClick={onCreateClick}
              className="bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954] text-white shadow-lg shadow-[#1db954]/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Create Announcement</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </DialogTrigger>
          {createDialog}
        </Dialog>
      </div>
    </div>
  );
}

