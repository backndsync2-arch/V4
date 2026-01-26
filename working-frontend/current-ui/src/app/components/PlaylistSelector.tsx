import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Badge } from '@/app/components/ui/badge';
import { Music, CheckCircle2, Circle, Shuffle, Repeat } from 'lucide-react';
import { toast } from 'sonner';

interface Playlist {
  id: string;
  name: string;
  trackCount: number;
  duration: number; // in seconds
  image?: string;
}

interface PlaylistSelectorProps {
  playlists: Playlist[];
  selectedPlaylists: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  isShuffleOn?: boolean;
  isRepeatOn?: boolean;
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
}

export function PlaylistSelector({
  playlists,
  selectedPlaylists,
  onSelectionChange,
  isShuffleOn = false,
  isRepeatOn = true,
  onToggleShuffle,
  onToggleRepeat,
}: PlaylistSelectorProps) {
  const togglePlaylist = (playlistId: string) => {
    const newSelection = selectedPlaylists.includes(playlistId)
      ? selectedPlaylists.filter(id => id !== playlistId)
      : [...selectedPlaylists, playlistId];
    
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    onSelectionChange(playlists.map(p => p.id));
    toast.success('All playlists selected');
  };

  const clearAll = () => {
    onSelectionChange([]);
    toast.info('All playlists deselected');
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const totalTracks = playlists
    .filter(p => selectedPlaylists.includes(p.id))
    .reduce((sum, p) => sum + p.trackCount, 0);

  const totalDuration = playlists
    .filter(p => selectedPlaylists.includes(p.id))
    .reduce((sum, p) => sum + p.duration, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Playlist Selection
            </CardTitle>
            <CardDescription>
              Select multiple playlists to play continuously
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
            >
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Playback Options */}
        <div className="flex gap-2">
          <Button
            variant={isShuffleOn ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleShuffle}
            className="flex-1"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle {selectedPlaylists.length > 1 ? 'All' : ''}
          </Button>
          <Button
            variant={isRepeatOn ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleRepeat}
            className="flex-1"
          >
            <Repeat className="h-4 w-4 mr-2" />
            Loop Forever
          </Button>
        </div>

        {/* Selection Summary */}
        {selectedPlaylists.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-blue-900">Queue Summary</h4>
              <Badge className="bg-blue-600">
                {selectedPlaylists.length} playlist{selectedPlaylists.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-600 font-medium">Total Tracks</p>
                <p className="text-2xl font-bold text-blue-900">{totalTracks}</p>
              </div>
              <div>
                <p className="text-blue-600 font-medium">Total Duration</p>
                <p className="text-2xl font-bold text-blue-900">{formatDuration(totalDuration)}</p>
              </div>
            </div>
            <p className="text-xs text-blue-700 mt-3">
              {isShuffleOn 
                ? `🔀 Shuffling from ${totalTracks} tracks across all selected playlists`
                : `▶️ Playing ${selectedPlaylists.length} playlist${selectedPlaylists.length !== 1 ? 's' : ''} in sequence, then looping`
              }
            </p>
          </div>
        )}

        {/* Playlist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {playlists.map((playlist) => {
            const isSelected = selectedPlaylists.includes(playlist.id);
            
            return (
              <button
                key={playlist.id}
                onClick={() => togglePlaylist(playlist.id)}
                className={`
                  relative p-4 rounded-lg border-2 transition-all text-left
                  hover:scale-105 hover:shadow-lg
                  ${isSelected 
                    ? 'border-blue-600 bg-blue-50 shadow-md' 
                    : 'border-slate-200 bg-white hover:border-blue-300'
                  }
                `}
              >
                {/* Selection Indicator */}
                <div className="absolute top-2 right-2">
                  {isSelected ? (
                    <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  ) : (
                    <Circle className="h-6 w-6 text-slate-300" />
                  )}
                </div>

                {/* Playlist Image */}
                {playlist.image && (
                  <div className="mb-3 rounded overflow-hidden">
                    <img 
                      src={playlist.image} 
                      alt={playlist.name}
                      className="w-full h-24 object-cover"
                    />
                  </div>
                )}

                {/* Playlist Info */}
                <div className="pr-8">
                  <h3 className={`font-semibold mb-1 ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                    {playlist.name}
                  </h3>
                  <div className="flex flex-col gap-1 text-xs">
                    <span className={isSelected ? 'text-blue-600' : 'text-slate-500'}>
                      {playlist.trackCount} tracks
                    </span>
                    <span className={isSelected ? 'text-blue-600' : 'text-slate-500'}>
                      {formatDuration(playlist.duration)}
                    </span>
                  </div>
                </div>

                {/* Selection Badge */}
                {isSelected && (
                  <div className="mt-3">
                    <Badge className="bg-blue-600 text-xs">
                      Selected
                    </Badge>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Empty State */}
        {selectedPlaylists.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No playlists selected</p>
            <p className="text-sm">Select at least one playlist to start continuous playback</p>
          </div>
        )}

        {/* Continuous Playback Notice */}
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <p className="text-sm text-green-800">
            ✓ Playback is <strong>continuous</strong> - music will loop forever<br />
            ✓ Scheduled announcements will interrupt and then resume<br />
            {selectedPlaylists.length > 1 && (
              <>✓ Multiple playlists will play {isShuffleOn ? 'shuffled together' : 'one after another'}</>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
