import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useFiles } from '@/lib/files';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Slider } from '@/app/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { 
  Play, 
  Square, 
  Music, 
  Radio, 
  SkipForward,
  Volume2,
  Clock,
  Disc3,
  ListMusic,
  Folder as FolderIcon
} from 'lucide-react';
import { musicAPI, zonesAPI, schedulerAPI, playbackAPI, wsClient } from '@/lib/api';
import { toast } from 'sonner';
import type { Device, Folder, ChannelPlaylist } from '@/lib/types';

interface Zone {
  id: string;
  name: string;
}

interface PlaybackStateData {
  current_track_data?: {
    id: string;
    title: string;
    file_url: string;
    duration: number;
  };
  current_announcement_data?: {
    id: string;
    title: string;
    file_url: string;
    duration: number;
  };
  is_playing: boolean;
  position: number;
  volume: number;
  queue_position: number;
}

export function DashboardPlayback() {
  const { user } = useAuth();
  const { zones: allZones, folders: allFolders, channelPlaylists, isLoading: loadingStates } = useFiles();
  const clientId = user?.role === 'admin' ? null : user?.clientId;

  // Filter data for client
  const zones = clientId ? allZones.filter(z => z.clientId === clientId) : allZones;
  const folders = allFolders.filter(f => f.type === 'music' && (!clientId || f.clientId === clientId));
  const isLoading = loadingStates.zones || loadingStates.folders || loadingStates.channelPlaylists;
  
  // Selection state
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [shuffle, setShuffle] = useState(false);
  
  // Playback state
  const [playbackState, setPlaybackState] = useState<PlaybackStateData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Audio refs
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const announcementAudioRef = useRef<HTMLAudioElement | null>(null);
  const interruptedPositionRef = useRef<number>(0);
  const interruptedTrackUrlRef = useRef<string>('');

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const [zonesData, foldersData, playlistsData] = await Promise.all([
          zonesAPI.getZones().catch(() => []),
          musicAPI.getFolders().catch(() => []),
          schedulerAPI.getChannelPlaylists().catch(() => [])
        ]);
        
        const filteredZones = Array.isArray(zonesData) 
          ? (clientId ? zonesData.filter((z: any) => z.clientId === clientId) : zonesData)
          : [];
        const filteredFolders = Array.isArray(foldersData)
          ? foldersData.filter((f: Folder) => f.type === 'music' && (!clientId || f.clientId === clientId))
          : [];
        const filteredPlaylists = Array.isArray(playlistsData)
          ? (clientId ? playlistsData.filter((p: any) => p.clientId === clientId) : playlistsData)
          : [];
        
        setZones(filteredZones.map((z: any) => ({ id: z.id, name: z.name })));
        setFolders(filteredFolders);
        setChannelPlaylists(filteredPlaylists);
        
        // Set first zone as default
        if (filteredZones.length > 0 && !selectedZoneId) {
          setSelectedZoneId(filteredZones[0].id);
        }
      } catch (error: any) {
        console.error('Failed to load playback data:', error);
        toast.error('Failed to load playback data', { description: error?.message || 'Please try again' });
      } finally {
        setIsLoading(false);
      }
    };
    
    void loadData();
  }, [user, clientId]);

  // Load playback state when zone changes
  useEffect(() => {
    if (!selectedZoneId) return;
    
    const loadPlaybackState = async () => {
      try {
        const state = await playbackAPI.getPlaybackState(selectedZoneId);
        setPlaybackState(state);
        setIsPlaying(state?.is_playing || false);
        
        // Update audio player if state exists
        if (state?.is_playing && state.current_track_data?.file_url) {
          updateAudioPlayer(state);
        }
      } catch (error: any) {
        console.error('Failed to load playback state:', error);
      }
    };
    
    void loadPlaybackState();
  }, [selectedZoneId]);

  // WebSocket integration for playback updates
  useEffect(() => {
    if (!selectedZoneId) return;
    
    // Connect to zone-specific playback WebSocket
    wsClient.connectPlayback(selectedZoneId);
    
    const handlePlaybackUpdate = (message: any) => {
      // WebSocket sends: { type: 'playback_update', data: {...} }
      const data = message.data || message;
      
      if (data) {
        setPlaybackState(data);
        setIsPlaying(data.is_playing || false);
        
        // Update audio player based on state
        if (data.is_playing) {
          updateAudioPlayer(data);
        } else {
          // Pause audio
          if (musicAudioRef.current) {
            musicAudioRef.current.pause();
          }
          if (announcementAudioRef.current) {
            announcementAudioRef.current.pause();
          }
        }
      }
    };
    
    wsClient.on('playback_update', handlePlaybackUpdate);
    
    return () => {
      wsClient.off('playback_update', handlePlaybackUpdate);
      wsClient.disconnectPlayback();
    };
  }, [selectedZoneId]);

  // Update audio player based on playback state
  const updateAudioPlayer = (state: PlaybackStateData) => {
    // If announcement is playing, play announcement audio
    if (state.current_announcement_data?.file_url) {
      if (announcementAudioRef.current) {
        // Save music state if playing
        if (musicAudioRef.current && !musicAudioRef.current.paused) {
          interruptedPositionRef.current = musicAudioRef.current.currentTime;
          interruptedTrackUrlRef.current = musicAudioRef.current.src;
          musicAudioRef.current.pause();
        }
        
        // Play announcement
        announcementAudioRef.current.src = state.current_announcement_data.file_url;
        announcementAudioRef.current.currentTime = state.position || 0;
        announcementAudioRef.current.play().catch(err => {
          console.error('Failed to play announcement:', err);
          toast.error('Failed to play announcement audio', { 
            description: err.message || 'Audio file may be unavailable' 
          });
        });
      }
    } 
    // If music is playing, play music audio
    else if (state.current_track_data?.file_url) {
      if (musicAudioRef.current) {
        // Resume interrupted track or play new track
        if (interruptedTrackUrlRef.current && musicAudioRef.current.src === interruptedTrackUrlRef.current) {
          musicAudioRef.current.currentTime = interruptedPositionRef.current;
          interruptedTrackUrlRef.current = '';
          interruptedPositionRef.current = 0;
        } else {
          musicAudioRef.current.src = state.current_track_data.file_url;
          musicAudioRef.current.currentTime = state.position || 0;
        }
        
        musicAudioRef.current.volume = (state.volume || 100) / 100;
        musicAudioRef.current.play().catch(err => {
          console.error('Failed to play music:', err);
          toast.error('Failed to play music audio', { 
            description: err.message || 'Audio file may be unavailable' 
          });
        });
      }
    }
  };

  // Handle audio loading errors
  useEffect(() => {
    const musicAudio = musicAudioRef.current;
    const announcementAudio = announcementAudioRef.current;
    
    const handleMusicError = () => {
      if (musicAudio?.error) {
        console.error('Music audio error:', musicAudio.error);
        toast.error('Failed to load music audio', { 
          description: 'The audio file may be corrupted or unavailable' 
        });
      }
    };
    
    const handleAnnouncementError = () => {
      if (announcementAudio?.error) {
        console.error('Announcement audio error:', announcementAudio.error);
        toast.error('Failed to load announcement audio', { 
          description: 'The audio file may be corrupted or unavailable' 
        });
      }
    };
    
    if (musicAudio) {
      musicAudio.addEventListener('error', handleMusicError);
    }
    if (announcementAudio) {
      announcementAudio.addEventListener('error', handleAnnouncementError);
    }
    
    return () => {
      if (musicAudio) {
        musicAudio.removeEventListener('error', handleMusicError);
      }
      if (announcementAudio) {
        announcementAudio.removeEventListener('error', handleAnnouncementError);
      }
    };
  }, []);

  // Handle track end - advance to next
  useEffect(() => {
    const musicAudio = musicAudioRef.current;
    if (!musicAudio) return;
    
    const handleEnded = () => {
      if (selectedZoneId && isPlaying) {
        // Auto-advance to next track
        playbackAPI.next(selectedZoneId).catch(err => {
          console.error('Failed to advance to next track:', err);
          toast.error('Failed to advance to next track', { 
            description: err.message || 'Please try manually' 
          });
        });
      }
    };
    
    musicAudio.addEventListener('ended', handleEnded);
    return () => {
      musicAudio.removeEventListener('ended', handleEnded);
    };
  }, [selectedZoneId, isPlaying]);

  // Handle announcement end - resume music
  useEffect(() => {
    const announcementAudio = announcementAudioRef.current;
    if (!announcementAudio) return;
    
    const handleEnded = () => {
      if (selectedZoneId && playbackState?.current_track_data) {
        // Resume music after announcement
        playbackAPI.resume(selectedZoneId).catch(err => {
          console.error('Failed to resume music:', err);
          toast.error('Failed to resume music', { 
            description: err.message || 'Please try manually' 
          });
        });
      }
    };
    
    announcementAudio.addEventListener('ended', handleEnded);
    return () => {
      announcementAudio.removeEventListener('ended', handleEnded);
    };
  }, [selectedZoneId, playbackState]);

  // Start playback
  const handleStart = async () => {
    if (!selectedZoneId) {
      toast.error('Please select a zone');
      return;
    }

    if (selectedPlaylistIds.length === 0) {
      toast.error('Please select at least one playlist or folder');
      return;
    }

    try {
      setIsLoading(true);
      await playbackAPI.play(selectedZoneId, selectedPlaylistIds, shuffle);
      setIsPlaying(true);
      toast.success(`Playback started on ${zones.find(z => z.id === selectedZoneId)?.name || 'zone'}`);
    } catch (error: any) {
      console.error('Failed to start playback:', error);
      toast.error('Failed to start playback', { description: error?.message || 'Please try again' });
    } finally {
      setIsLoading(false);
    }
  };

  // Stop playback
  const handleStop = async () => {
    if (!selectedZoneId) return;

    try {
      setIsLoading(true);
      await playbackAPI.pause(selectedZoneId);
      setIsPlaying(false);
      
      // Stop audio
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current.currentTime = 0;
      }
      if (announcementAudioRef.current) {
        announcementAudioRef.current.pause();
        announcementAudioRef.current.currentTime = 0;
      }
      
      toast.info('Playback stopped');
    } catch (error: any) {
      console.error('Failed to stop playback:', error);
      toast.error('Failed to stop playback', { description: error?.message || 'Please try again' });
    } finally {
      setIsLoading(false);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTrack = playbackState?.current_track_data;
  const currentAnnouncement = playbackState?.current_announcement_data;
  const allPlaylists = [
    ...channelPlaylists.map(p => ({ id: p.id, name: p.name, type: 'playlist' as const })),
    ...folders.map(f => ({ id: f.id, name: f.name, type: 'folder' as const }))
  ];

  return (
    <div className="space-y-6">
      {/* Hidden audio elements */}
      <audio ref={musicAudioRef} preload="auto" />
      <audio ref={announcementAudioRef} preload="auto" />

      {/* Main Playback Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Disc3 className="h-6 w-6" />
            Live Playback Control
          </CardTitle>
          <CardDescription>
            Control music and announcement playback across your zones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Zone Selector */}
          <div className="space-y-2">
            <Label>Target Zone</Label>
            <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a zone" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Playlist/Folder Selection */}
          <div className="space-y-2">
            <Label>Select Playlists or Folders</Label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg">
              {allPlaylists.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-2 bg-white rounded border hover:border-blue-400 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlaylistIds.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlaylistIds([...selectedPlaylistIds, item.id]);
                      } else {
                        setSelectedPlaylistIds(selectedPlaylistIds.filter(id => id !== item.id));
                      }
                    }}
                    className="h-4 w-4"
                  />
                  {item.type === 'playlist' ? (
                    <ListMusic className="h-4 w-4 text-blue-600" />
                  ) : (
                    <FolderIcon className="h-4 w-4 text-purple-600" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.type === 'playlist' ? 'Channel Playlist' : 'Music Folder'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-sm text-slate-500">
              {selectedPlaylistIds.length} playlist{selectedPlaylistIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Shuffle Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="shuffle"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="shuffle" className="cursor-pointer">
              Shuffle tracks
            </Label>
          </div>

          {/* Start/Stop Button */}
          <div className="pt-4">
            {!isPlaying ? (
              <Button 
                onClick={handleStart}
                disabled={isLoading || !selectedZoneId || selectedPlaylistIds.length === 0}
                className="w-full h-16 text-lg bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <Play className="h-6 w-6 mr-2" />
                {isLoading ? 'Starting...' : 'Start Playback'}
              </Button>
            ) : (
              <Button 
                onClick={handleStop}
                disabled={isLoading}
                className="w-full h-16 text-lg bg-red-600 hover:bg-red-700"
                size="lg"
                variant="destructive"
              >
                <Square className="h-6 w-6 mr-2" />
                {isLoading ? 'Stopping...' : 'Stop Playback'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Currently Playing Display */}
      {isPlaying && playbackState && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Now Playing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {currentAnnouncement ? (
                  <Radio className="h-5 w-5" />
                ) : (
                  <Music className="h-5 w-5" />
                )}
                Now Playing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentAnnouncement ? (
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="font-medium text-lg">{currentAnnouncement.title}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Announcement • {formatTime(currentAnnouncement.duration)}
                    </p>
                  </div>
                  <Badge className="bg-orange-500">Announcement Playing</Badge>
                </div>
              ) : currentTrack ? (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="font-medium text-lg">{currentTrack.title}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Track {playbackState.queue_position + 1} • {formatTime(currentTrack.duration)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="h-4 w-4" />
                    <span>Position: {formatTime(playbackState.position || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Volume2 className="h-4 w-4" />
                    <span>Volume: {playbackState.volume || 100}%</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">No track playing</p>
              )}
            </CardContent>
          </Card>

          {/* Playback Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Disc3 className="h-5 w-5" />
                Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => playbackAPI.previous(selectedZoneId).catch(err => {
                    console.error('Failed to skip previous:', err);
                    toast.error('Failed to skip previous', { description: err.message || 'Please try again' });
                  })}
                  variant="outline"
                  className="flex-1"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => {
                    if (isPlaying) {
                      playbackAPI.pause(selectedZoneId).catch(err => {
                        console.error('Failed to pause:', err);
                        toast.error('Failed to pause', { description: err.message || 'Please try again' });
                      });
                    } else {
                      playbackAPI.resume(selectedZoneId).catch(err => {
                        console.error('Failed to resume:', err);
                        toast.error('Failed to resume', { description: err.message || 'Please try again' });
                      });
                    }
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  {isPlaying ? 'Pause' : 'Resume'}
                </Button>
                <Button
                  onClick={() => playbackAPI.next(selectedZoneId).catch(err => {
                    console.error('Failed to skip next:', err);
                    toast.error('Failed to skip next', { description: err.message || 'Please try again' });
                  })}
                  variant="outline"
                  className="flex-1"
                >
                  Next
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Volume: {playbackState.volume || 100}%</Label>
                <Slider
                  value={[playbackState.volume || 100]}
                  onValueChange={(value) => {
                    playbackAPI.setVolume(selectedZoneId, value[0]).catch(err => {
                      console.error('Failed to set volume:', err);
                      toast.error('Failed to set volume', { description: err.message || 'Please try again' });
                    });
                  }}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
