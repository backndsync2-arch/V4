import React from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
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
      <div className="col-span-full text-center py-12 text-gray-400">
        {searchQuery ? 'No announcements found matching your search' : 'No announcements in this folder'}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ touchAction: 'pan-y' }}>
      {announcements.map((audio) => {
        return (
          <Card key={audio.id} className="overflow-hidden border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-lg hover:shadow-xl hover:shadow-[#1db954]/20 transition-all duration-300 group">
            <div className="aspect-square bg-gradient-to-br from-[#1db954]/20 via-[#1ed760]/10 to-[#2a2a2a] relative overflow-hidden group">
              <ImageUpload
                currentImage={audio.coverArtUrl || announcementIcons[audio.id] || undefined}
                onImageChange={(url) => onIconChange(audio.id, url)}
                variant="cover"
                className="w-full h-full"
              />
              <Button
                size="sm"
                variant={playingAudio === audio.id ? 'default' : 'outline'}
                onClick={() => onPlay(audio.id)}
                className={playingAudio === audio.id 
                  ? "absolute bottom-2 right-2 bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954] text-white shadow-lg shadow-[#1db954]/50" 
                  : "absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"}
              >
                {playingAudio === audio.id ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
            <CardContent className="p-3 bg-[#1a1a1a]">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm line-clamp-2 flex-1 text-white leading-snug pr-1">{audio.title}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-gray-400 hover:text-white hover:bg-white/10 shrink-0 -mt-0.5">
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  {audio.category && (
                    <Badge variant="outline" className="text-[10px] bg-white/5 text-gray-300 border-white/10 px-1.5 py-0.5 h-5">
                      {folders.find(f => f.id === audio.category)?.name || audio.category}
                    </Badge>
                  )}
                  <Badge variant={audio.type === 'tts' ? 'secondary' : 'default'} className={audio.type === 'tts' 
                    ? "text-[10px] bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/20 text-[#1db954] border-[#1db954]/30 px-1.5 py-0.5 h-5" 
                    : "text-[10px] bg-white/5 text-gray-300 border-white/10 px-1.5 py-0.5 h-5"}>
                    {audio.type.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-white/5 text-gray-300 border-white/10 px-1.5 py-0.5 h-5">
                    {formatDuration(audio.duration)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                  <Label htmlFor={`enabled-grid-${audio.id}`} className="text-[11px] sm:text-xs font-medium text-gray-400 cursor-pointer">
                    Enabled
                  </Label>
                  <Switch
                    id={`enabled-grid-${audio.id}`}
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

