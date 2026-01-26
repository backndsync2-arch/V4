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
      <div className="text-center py-12 text-slate-500">
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
            className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-slate-50 rounded-lg"
          >
            <ImageUpload
              currentImage={announcementIcons[audio.id] || undefined}
              onImageChange={(url) => onIconChange(audio.id, url)}
              variant="icon"
            />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between flex-1 gap-4 w-full">
              <div className="flex items-start md:items-center gap-4 flex-1 min-w-0 w-full md:w-auto">
                <Button
                  size="sm"
                  variant={playingAudio === audio.id ? 'default' : 'outline'}
                  onClick={() => onPlay(audio.id)}
                  className="shrink-0"
                >
                  {playingAudio === audio.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Radio className="h-5 w-5 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{audio.title}</p>
                    {audio.category && (
                      <Badge variant="outline" className="shrink-0">
                        {folders.find(f => f.id === audio.category)?.name || audio.category}
                      </Badge>
                    )}
                    <Badge variant={audio.type === 'tts' ? 'secondary' : 'default'} className="shrink-0">
                      {audio.type.toUpperCase()}
                    </Badge>
                  </div>
                  {script && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-1">{script.text}</p>
                  )}
                  <p className="text-sm text-slate-500 mt-1">
                    Duration: {formatDuration(audio.duration)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`enabled-${audio.id}`} className="text-sm">
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
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {audio.type === 'tts' && (!audio.url || audio.url === '' || audio.duration === 0) && (
                      <>
                        <DropdownMenuItem onClick={() => onRegenerateVoice(audio.id)}>
                          <Volume2 className="h-4 w-4 mr-2" />
                          {!audio.url || audio.url === '' ? 'Add Voice' : 'Change Voice'}
                        </DropdownMenuItem>
                        {audio.url && audio.url !== '' && audio.duration === 0 && (
                          <DropdownMenuItem onClick={() => onRecalculateDuration(audio.id)}>
                            <Clock className="h-4 w-4 mr-2" />
                            Recalculate Duration
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    {audio.type === 'uploaded' && audio.duration === 0 && (
                      <DropdownMenuItem onClick={() => onRecalculateDuration(audio.id)}>
                        <Clock className="h-4 w-4 mr-2" />
                        Recalculate Duration
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onDelete(audio.id)} className="text-red-600">
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

