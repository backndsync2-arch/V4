import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import { Play, Pause, Trash2, MoreVertical, Radio } from 'lucide-react';
import { ImageUpload } from '@/app/components/ImageUpload';
import { formatDuration } from '@/lib/utils';
import type { AnnouncementAudio, Folder } from '@/lib/types';

interface AnnouncementListProps {
  announcements: AnnouncementAudio[];
  scripts: any[];
  folders: Folder[];
  viewMode: 'list' | 'grid';
  playingAudio: string | null;
  announcementIcons: Record<string, string | null>;
  onPlay: (id: string) => void;
  onToggleEnabled: (id: string) => void;
  onDelete: (id: string) => void;
  onIconChange: (id: string, url: string | null) => void;
  searchQuery: string;
  filterEnabled: 'all' | 'enabled' | 'disabled';
  selectedFolder: string | null;
}

export function AnnouncementList({
  announcements,
  scripts,
  folders,
  viewMode,
  playingAudio,
  announcementIcons,
  onPlay,
  onToggleEnabled,
  onDelete,
  onIconChange,
  searchQuery,
  filterEnabled,
  selectedFolder,
}: AnnouncementListProps) {
  if (announcements.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-white/10">
        <CardContent>
          <div className="text-center py-12 text-gray-400">
            {searchQuery ? 'No announcements found matching your search' : 'No announcements in this folder'}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'list') {
    return (
      <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">
                {selectedFolder ? folders.find(f => f.id === selectedFolder)?.name : 'All Announcements'}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {announcements.length} announcement{announcements.length !== 1 ? 's' : ''} 
                {filterEnabled !== 'all' && ` (${filterEnabled})`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {announcements.map((audio) => {
              const script = scripts.find(s => s.id === audio.scriptId);
              return (
                <div
                  key={audio.id}
                  className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
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
                        className={playingAudio === audio.id 
                          ? "shrink-0 bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954] text-white shadow-lg shadow-[#1db954]/50" 
                          : "shrink-0 bg-white/5 hover:bg-white/10 text-white border-white/20"}
                      >
                        {playingAudio === audio.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Radio className="h-5 w-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-white">{audio.title}</p>
                          {audio.category && (
                            <Badge variant="outline" className="shrink-0 bg-white/5 text-gray-300 border-white/10">
                              {folders.find(f => f.id === audio.category)?.name || audio.category}
                            </Badge>
                          )}
                          <Badge variant={audio.type === 'tts' ? 'secondary' : 'default'} className={audio.type === 'tts' 
                            ? "shrink-0 bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/20 text-[#1db954] border-[#1db954]/30" 
                            : "shrink-0 bg-white/5 text-gray-300 border-white/10"}>
                            {audio.type.toUpperCase()}
                          </Badge>
                        </div>
                        {script && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-1">{script.text}</p>
                        )}
                        <p className="text-sm text-gray-400 mt-1">
                          Duration: {formatDuration(audio.duration)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`enabled-${audio.id}`} className="text-sm text-gray-300">
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
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">
              {selectedFolder ? folders.find(f => f.id === selectedFolder)?.name : 'All Announcements'}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {announcements.length} announcement{announcements.length !== 1 ? 's' : ''} 
              {filterEnabled !== 'all' && ` (${filterEnabled})`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {announcements.map((audio) => {
            const script = scripts.find(s => s.id === audio.scriptId);
            return (
              <Card key={audio.id} className="overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border-white/10 group hover:shadow-xl hover:shadow-[#1db954]/20 transition-all duration-300">
                <div className="aspect-square bg-gradient-to-br from-[#1db954]/20 via-[#1ed760]/10 to-[#2a2a2a] relative overflow-hidden">
                  <ImageUpload
                    currentImage={announcementIcons[audio.id] || undefined}
                    onImageChange={(url) => onIconChange(audio.id, url)}
                    variant="icon"
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
                <CardContent className="p-4 bg-[#1a1a1a]">
                  <div className="space-y-2">
                    <p className="font-medium truncate text-white">{audio.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={audio.type === 'tts' ? 'secondary' : 'default'} className={audio.type === 'tts' 
                        ? "shrink-0 bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/20 text-[#1db954] border-[#1db954]/30" 
                        : "shrink-0 bg-white/5 text-gray-300 border-white/10"}>
                        {audio.type.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="shrink-0 bg-white/5 text-gray-300 border-white/10">
                        {formatDuration(audio.duration)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Switch
                        checked={audio.enabled}
                        onCheckedChange={() => onToggleEnabled(audio.id)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#2a2a2a] border-white/10">
                          <DropdownMenuItem onClick={() => onDelete(audio.id)} className="text-red-400 hover:bg-red-500/20">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

