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
        <h2 className="text-2xl font-bold">Announcements Studio</h2>
        <p className="text-slate-600">Manage announcement folders, playlists, and scheduling intervals</p>
      </div>
      <div className="flex gap-3 flex-wrap">
        <Dialog open={isInstantOpen} onOpenChange={onInstantOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Volume2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Instant Play</span>
              <span className="sm:hidden">Play</span>
            </Button>
          </DialogTrigger>
          {instantPlayDialog}
        </Dialog>
        <Dialog open={isCreateOpen} onOpenChange={onCreateOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={onCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
          </DialogTrigger>
          {createDialog}
        </Dialog>
      </div>
    </div>
  );
}

