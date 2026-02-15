import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { FolderPlus, Folder, Settings, Clock } from 'lucide-react';
import { Folder as FolderType, AnnouncementAudio } from './announcements.types';

interface AnnouncementsFolderListProps {
  folders: FolderType[];
  selectedFolder: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFolderSettings: (folderId: string) => void;
  audioFiles: AnnouncementAudio[];
  allAnnouncementsCount?: number;
  isCreateFolderOpen: boolean;
  onCreateFolderOpenChange: (open: boolean) => void;
  newFolderName: string;
  onNewFolderNameChange: (name: string) => void;
  onCreateFolder: () => void;
  isCreatingFolder: boolean;
  getFolderStats: (folderId: string) => { enabled: number; total: number; totalDuration: number };
  folderSettings: Record<string, any>;
}

export function AnnouncementsFolderList({
  folders,
  selectedFolder,
  onFolderSelect,
  onFolderSettings,
  audioFiles,
  allAnnouncementsCount,
  isCreateFolderOpen,
  onCreateFolderOpenChange,
  newFolderName,
  onNewFolderNameChange,
  onCreateFolder,
  isCreatingFolder,
  getFolderStats,
  folderSettings,
}: AnnouncementsFolderListProps) {
  return (
    <Card className="xl:col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Folders</CardTitle>
          <Dialog open={isCreateFolderOpen} onOpenChange={onCreateFolderOpenChange}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <FolderPlus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Create Folder</DialogTitle>
                <DialogDescription className="text-gray-400">Organize your announcements with folder-level playlist settings</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => onNewFolderNameChange(e.target.value)}
                />
                <Button onClick={onCreateFolder} className="w-full" disabled={isCreatingFolder}>
                  {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto md:overflow-x-visible">
        <div className="flex md:flex-col gap-2 md:space-y-2 md:gap-0 min-w-max md:min-w-0">
          <button
            onClick={() => onFolderSelect(null)}
            className={`flex-shrink-0 md:w-full flex items-center gap-3 p-3 rounded-lg transition-colors min-h-[44px] ${
              selectedFolder === null ? 'bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10 text-[#1db954]' : 'hover:bg-white/10'
            }`}
          >
            <Folder className="h-5 w-5 shrink-0" />
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium">All</div>
              <div className="text-sm font-medium">Announcements</div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {audioFiles.length}
            </Badge>
          </button>
          {folders.map((folder) => {
            const stats = getFolderStats(folder.id);
            const settings = folderSettings[folder.id];
            return (
              <div key={folder.id} className="flex-shrink-0 md:w-full">
                <div
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors min-h-[44px] cursor-pointer ${
                    selectedFolder === folder.id ? 'bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10 text-[#1db954]' : 'hover:bg-white/10'
                  }`}
                >
                  <div 
                    onClick={() => onFolderSelect(folder.id)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Folder className="h-5 w-5 shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="whitespace-nowrap">{folder.name}</span>
                        {/* Always show delete button for folders, even if active */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20 ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete folder "${folder.name}"?`)) {
                              // Call delete folder API
                              // This needs to be passed down as a prop
                              // For now we will rely on the settings dialog delete
                              onFolderSettings(folder.id);
                            }
                          }}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        {settings?.enabled && (
                          <Badge variant="default" className="shrink-0">
                            <Clock className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {stats.enabled}/{stats.total} enabled
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFolderSettings(folder.id);
                    }}
                    className="shrink-0"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

