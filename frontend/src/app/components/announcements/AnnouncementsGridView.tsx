import React from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { Play, Pause, Volume2, Clock, Trash2, MoreVertical } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { ImageUpload } from '@/app/components/ImageUpload';
import { AnnouncementAudio, Folder } from './announcements.types';

interface AnnouncementsGridViewProps {
  announcements: AnnouncementAudio[];
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

export function AnnouncementsGridView({
  announcements,
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
}: AnnouncementsGridViewProps) {
  if (announcements.length === 0) {
    return (
      <div className="col-span-full text-center py-12 text-slate-500">
        {searchQuery ? 'No announcements found matching your search' : 'No announcements in this folder'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {announcements.map((audio) => {
        return (
          <Card key={audio.id} className="overflow-hidden">
            <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 relative">
              <ImageUpload
                currentImage={announcementIcons[audio.id] || undefined}
                onImageChange={(url) => onIconChange(audio.id, url)}
                variant="icon"
              />
              <Button
                size="sm"
                variant={playingAudio === audio.id ? 'default' : 'outline'}
                onClick={() => onPlay(audio.id)}
                className="absolute bottom-2 right-2"
              >
                {playingAudio === audio.id ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm line-clamp-2 flex-1">{audio.title}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
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
                <div className="flex items-center gap-2 flex-wrap">
                  {audio.category && (
                    <Badge variant="outline" className="text-xs">
                      {folders.find(f => f.id === audio.category)?.name || audio.category}
                    </Badge>
                  )}
                  <Badge variant={audio.type === 'tts' ? 'secondary' : 'default'} className="text-xs">
                    {audio.type.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {formatDuration(audio.duration)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Switch
                    checked={audio.enabled}
                    onCheckedChange={() => onToggleEnabled(audio.id)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

