import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { Play, Pause, Radio, Volume2, Clock, Trash2, MoreVertical } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { ImageUpload } from '@/app/components/ImageUpload';
import { AnnouncementAudio, Folder } from './announcements.types';

interface AnnouncementsListViewProps {
  announcements: AnnouncementAudio[];
  scripts: any[];
  folders: Folder[];
  playingAudio: string | null;
  onPlay: (id: string) => void;
  onToggleEnabled: (id: string) => void;
  onRegenerateVoice: (id: string) => void;
  onRecalculateDuration: (id: string) => void;
  onDelete: (id: string) => void;
  announcementIcons: Record<string, string | null>;
  onIconChange: (id: string, url: string | null) => void;
  searchQuery: string;
}

export function AnnouncementsListView({
  announcements,
  scripts,
  folders,
  playingAudio,
  onPlay,
  onToggleEnabled,
  onRegenerateVoice,
  onRecalculateDuration,
  onDelete,
  announcementIcons,
  onIconChange,
  searchQuery,
}: AnnouncementsListViewProps) {
  if (announcements.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        {searchQuery ? 'No announcements found matching your search' : 'No announcements in this folder'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((audio) => {
        const script = scripts.find(s => s.id === audio.scriptId);
        return (
          <div
            key={audio.id}
            className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] rounded-lg border border-white/10 shadow-lg hover:shadow-xl hover:shadow-[#1db954]/20 transition-all duration-300"
          >
            <ImageUpload
              currentImage={announcementIcons[audio.id] || undefined}
              onImageChange={(url) => onIconChange(audio.id, url)}
              variant="icon"
            />

            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                <Button
                  size="sm"
                  variant={playingAudio === audio.id ? 'default' : 'outline'}
                  onClick={() => onPlay(audio.id)}
                  className={playingAudio === audio.id 
                    ? "shrink-0 bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954] text-white shadow-lg shadow-[#1db954]/50 h-8 w-8 p-0" 
                    : "shrink-0 bg-white/5 hover:bg-white/10 text-white border-white/20 h-8 w-8 p-0"}
                >
                  {playingAudio === audio.id ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-medium text-sm truncate text-white">{audio.title}</p>
                    <Badge variant={audio.type === 'tts' ? 'secondary' : 'default'} className={audio.type === 'tts' 
                      ? "shrink-0 text-[10px] bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/20 text-[#1db954] border-[#1db954]/30 px-1.5 py-0.5" 
                      : "shrink-0 text-[10px] bg-white/5 text-gray-300 border-white/10 px-1.5 py-0.5"}>
                      {audio.type.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatDuration(audio.duration)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Label htmlFor={`enabled-${audio.id}`} className="text-[11px] sm:text-xs font-medium whitespace-nowrap text-gray-400">
                    Enabled
                  </Label>
                  <Switch
                    id={`enabled-${audio.id}`}
                    checked={audio.enabled}
                    onCheckedChange={() => onToggleEnabled(audio.id)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="shrink-0 text-gray-400 hover:text-white hover:bg-white/10 h-7 w-7 p-0">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#2a2a2a] border-white/10">
                    {audio.type === 'tts' && (
                      <>
                        <DropdownMenuItem onClick={() => onRegenerateVoice(audio.id)} className="text-white hover:bg-white/10">
                          <Volume2 className="h-4 w-4 mr-2" />
                          Change Voice
                        </DropdownMenuItem>
                        {audio.url && audio.url !== '' && audio.duration === 0 && (
                          <DropdownMenuItem onClick={() => onRecalculateDuration(audio.id)} className="text-white hover:bg-white/10">
                            <Clock className="h-4 w-4 mr-2" />
                            Recalculate Duration
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    {audio.type === 'uploaded' && audio.duration === 0 && (
                      <DropdownMenuItem onClick={() => onRecalculateDuration(audio.id)} className="text-white hover:bg-white/10">
                        <Clock className="h-4 w-4 mr-2" />
                        Recalculate Duration
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onDelete(audio.id)} className="text-red-400 hover:bg-red-500/20">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

