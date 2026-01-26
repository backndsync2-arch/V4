import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { backgroundAudio } from '@/lib/backgroundAudio';
import { ContinuousPlaybackEngine, Track, Playlist } from '@/lib/continuousPlayback';
import { announcementsAPI, playbackAPI, wsClient, schedulerAPI, musicAPI, zonesAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

// Version: 1.0.3 - Fix context provider hot reload
export type PlaybackMode = 'music' | 'music+announcements' | 'announcements';
export type PlaybackState = 'live' | 'standby' | 'offline';

interface NowPlaying {
  type: 'music' | 'announcement';
  title: string;
  playlist?: string;
  duration: number;
  elapsed: number;
  isPlaying: boolean;
}

interface PlaybackContextType {
  state: PlaybackState;
  mode: PlaybackMode;
  activeTarget: string;
  targetDeviceCount: { online: number; total: number };
  nowPlaying: NowPlaying | null;
  volume: number;
  ducking: number;
  isShuffleOn: boolean;
  isRepeatOn: boolean;
  backgroundAudioStatus: any;
  selectedPlaylists: string[];
  availablePlaylists: Playlist[];
  
  // Actions
  startOutput: () => Promise<void>;
  stopOutput: () => Promise<void>;
  setActiveTarget: (targetId: string) => void;
  setMode: (mode: PlaybackMode) => void;
  playPause: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  setVolume: (vol: number) => Promise<void>;
  setDucking: (amount: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playInstantAnnouncement: (announcementId: string, targetIds: string[], options?: { duck?: boolean; interrupt?: boolean }) => Promise<void>;
  playPreview: (audioUrl: string) => void;
  stopPreview: () => void;
  enableBackgroundPlayback: () => Promise<void>;
  setSelectedPlaylists: (playlistIds: string[]) => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlaybackState>('standby');
  const [mode, setMode] = useState<PlaybackMode>('music+announcements');
  const [activeTarget, setActiveTarget] = useState('all-zones');
  const [targetDeviceCount] = useState({ online: 3, total: 4 });
  const [volume, setVolumeState] = useState(100); // Full volume by default
  const [ducking, setDuckingState] = useState(20); // Low volume during announcements
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [isRepeatOn, setIsRepeatOn] = useState(false);
  const [backgroundAudioStatus, setBackgroundAudioStatus] = useState(backgroundAudio.getStatus());
  
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);

  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [availablePlaylists, setAvailablePlaylists] = useState<Playlist[]>([]);
  const { user } = useAuth();
  const clientId = user?.role === 'admin' ? null : user?.clientId;

  const resolveZoneTargets = useCallback(async (targetId: string) => {
    if (!targetId || targetId === 'all-zones') {
      const zones = await zonesAPI.getZones().catch(() => []);
      return Array.isArray(zones) ? zones.map((zone) => zone.id) : [];
    }
    return [targetId];
  }, []);

  // Use refs to avoid circular dependencies in useEffect
  const playPauseRef = useRef<(() => Promise<void>) | null>(null);
  const skipNextRef = useRef<(() => Promise<void>) | null>(null);
  const skipPreviousRef = useRef<(() => Promise<void>) | null>(null);

  const enableBackgroundPlayback = useCallback(async () => {
    await backgroundAudio.enableBackground();
    setBackgroundAudioStatus(backgroundAudio.getStatus());
  }, []);

  const startOutput = useCallback(async () => {
    if (selectedPlaylists.length === 0) {
      toast.error('Please select at least one playlist');
      return;
    }
    try {
      const zoneIds = await resolveZoneTargets(activeTarget);
      if (zoneIds.length === 0) {
        toast.error('No zones available for playback');
        return;
      }
      await Promise.all(zoneIds.map((zoneId) => playbackAPI.play(zoneId, selectedPlaylists, isShuffleOn)));
      setState('live');
      // State will be updated via WebSocket
      toast.success('Live output started');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start output');
      console.error('Start output error:', error);
    }
  }, [activeTarget, selectedPlaylists, isShuffleOn, resolveZoneTargets]);

  const stopOutput = useCallback(async () => {
    try {
      const zoneIds = await resolveZoneTargets(activeTarget);
      await Promise.all(zoneIds.map((zoneId) => playbackAPI.pause(zoneId)));
      setState('standby');
      setNowPlaying(prev => prev ? { ...prev, isPlaying: false } : null);
      toast.success('Live output stopped');
    } catch (error: any) {
      toast.error(error.message || 'Failed to stop output');
      console.error('Stop output error:', error);
    }
  }, [activeTarget, resolveZoneTargets]);

  const playPause = useCallback(async () => {
    try {
      const zoneIds = await resolveZoneTargets(activeTarget);
      if (nowPlaying?.isPlaying) {
        await Promise.all(zoneIds.map((zoneId) => playbackAPI.pause(zoneId)));
      } else {
        await Promise.all(zoneIds.map((zoneId) => playbackAPI.resume(zoneId)));
      }
      // State will be updated via WebSocket
      if (state === 'standby') setState('live');
    } catch (error: any) {
      toast.error(error.message || 'Playback control failed');
      console.error('Play/pause error:', error);
    }
  }, [activeTarget, nowPlaying?.isPlaying, state, resolveZoneTargets]);

  const skipNext = useCallback(async () => {
    try {
      const zoneIds = await resolveZoneTargets(activeTarget);
      await Promise.all(zoneIds.map((zoneId) => playbackAPI.next(zoneId)));
      toast.success('Skipped to next track');
    } catch (error: any) {
      toast.error(error.message || 'Failed to skip track');
      console.error('Skip next error:', error);
    }
  }, [activeTarget, resolveZoneTargets]);

  const skipPrevious = useCallback(async () => {
    try {
      const zoneIds = await resolveZoneTargets(activeTarget);
      await Promise.all(zoneIds.map((zoneId) => playbackAPI.previous(zoneId)));
      toast.success('Skipped to previous track');
    } catch (error: any) {
      toast.error(error.message || 'Failed to skip track');
      console.error('Skip previous error:', error);
    }
  }, [activeTarget, resolveZoneTargets]);

  const setVolume = useCallback(async (vol: number) => {
    setVolumeState(vol);
    try {
      const zoneIds = await resolveZoneTargets(activeTarget);
      await Promise.all(zoneIds.map((zoneId) => playbackAPI.setVolume(zoneId, vol)));
    } catch (error: any) {
      toast.error('Failed to set volume');
      console.error('Set volume error:', error);
    }
  }, [activeTarget, resolveZoneTargets]);

  const setDucking = useCallback((amount: number) => {
    setDuckingState(amount);
  }, []);

  const playInstantAnnouncement = useCallback(async (announcementId: string, targetIds: string[], options = {}) => {
    try {
      const zoneIds = targetIds.length > 0 ? targetIds : await resolveZoneTargets(activeTarget);
      await announcementsAPI.playInstantAnnouncement(announcementId, zoneIds);
      toast.success('Announcement sent to zones');
    } catch (error: any) {
      toast.error(error.message || 'Failed to play announcement');
      console.error('Play instant announcement error:', error);
    }
  }, [activeTarget, resolveZoneTargets]);

  const playPreview = useCallback((audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(err => {
      toast.error('Failed to play preview');
      console.error('Preview play error:', err);
    });
  }, []);

  const stopPreview = useCallback(() => {
    // Stop any preview audio
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffleOn(prev => !prev);
    toast.success(!isShuffleOn ? 'Shuffle enabled' : 'Shuffle disabled');
  }, [isShuffleOn]);
  
  const toggleRepeat = useCallback(() => {
    setIsRepeatOn(prev => !prev);
    toast.success(!isRepeatOn ? 'Repeat enabled' : 'Repeat disabled');
  }, [isRepeatOn]);

  // Fetch available playlists from API
  useEffect(() => {
    const loadPlaylists = async () => {
      if (!user) return;
      
      try {
        const [channelPlaylistsData, foldersData] = await Promise.all([
          schedulerAPI.getChannelPlaylists().catch(() => []),
          musicAPI.getFolders().catch(() => [])
        ]);
        
        const filteredPlaylists = Array.isArray(channelPlaylistsData)
          ? (clientId ? channelPlaylistsData.filter((p: any) => p.clientId === clientId) : channelPlaylistsData)
          : [];
        const filteredFolders = Array.isArray(foldersData)
          ? foldersData.filter((f: any) => f.type === 'music' && (!clientId || f.clientId === clientId))
          : [];
        
        const allPlaylists: Playlist[] = [
          ...filteredPlaylists.map((p: any) => ({ id: p.id, name: p.name, tracks: [] })),
          ...filteredFolders.map((f: any) => ({ id: f.id, name: f.name, tracks: [] }))
        ];
        
        setAvailablePlaylists(allPlaylists);
      } catch (error: any) {
        console.error('Failed to load playlists:', error);
      }
    };
    
    void loadPlaylists();
  }, [user, clientId]);

  // Load playback state when activeTarget changes
  useEffect(() => {
    if (!activeTarget || activeTarget === 'all-zones') return;
    
    const loadPlaybackState = async () => {
      try {
        const state = await playbackAPI.getPlaybackState(activeTarget);
        if (state) {
          if (state.current_track_data) {
            setNowPlaying({
              type: 'music',
              title: state.current_track_data.title || 'Unknown',
              playlist: state.current_playlists?.[0] || '',
              duration: state.current_track_data.duration || 0,
              elapsed: state.position || 0,
              isPlaying: state.is_playing || false,
            });
          } else if (state.current_announcement_data) {
            setNowPlaying({
              type: 'announcement',
              title: state.current_announcement_data.title || 'Unknown',
              duration: state.current_announcement_data.duration || 0,
              elapsed: state.position || 0,
              isPlaying: state.is_playing || false,
            });
          }
          setState(state.is_playing ? 'live' : 'standby');
          setVolumeState(state.volume || 100);
        }
      } catch (error: any) {
        console.error('Failed to load playback state:', error);
      }
    };
    
    void loadPlaybackState();
  }, [activeTarget]);

  // Update refs when functions change
  useEffect(() => {
    playPauseRef.current = playPause;
    skipNextRef.current = skipNext;
    skipPreviousRef.current = skipPrevious;
  }, [playPause, skipNext, skipPrevious]);

  // Initialize background audio and setup media controls (only once)
  useEffect(() => {
    backgroundAudio.setupControls({
      play: () => playPauseRef.current?.(),
      pause: () => playPauseRef.current?.(),
      nexttrack: () => skipNextRef.current?.(),
      previoustrack: () => skipPreviousRef.current?.(),
    });

    const interval = setInterval(() => {
      setBackgroundAudioStatus(backgroundAudio.getStatus());
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []); // Empty dependency array - only run once

  // Handle WebSocket connection and real-time updates
  useEffect(() => {
    if (!activeTarget || activeTarget === 'all-zones') {
      wsClient.disconnectPlayback();
      return;
    }

    // Connect to playback WebSocket for this zone
    wsClient.connectPlayback(activeTarget);

    const handlePlaybackUpdate = (data: any) => {
      // console.log('Received playback update:', data); // Debug logging removed

      if (data.now_playing) {
        setNowPlaying({
          type: data.now_playing.type || 'music',
          title: data.now_playing.title,
          playlist: data.now_playing.playlist,
          duration: data.now_playing.duration,
          elapsed: data.now_playing.elapsed,
          isPlaying: data.now_playing.is_playing,
        });
      }

      if (data.state) {
        setState(data.state);
      }

      if (data.volume !== undefined) {
        setVolumeState(data.volume);
      }
    };

    const handleConnected = (data: any) => {
      if (data.type === 'playback') {
        // console.log('Playback WebSocket connected for zone:', activeTarget); // Debug logging removed
        // Request current playback state when connected
        setTimeout(() => {
          const loadState = async () => {
            try {
              const state = await playbackAPI.getPlaybackState(activeTarget);
              if (state) {
                if (state.current_track_data) {
                  setNowPlaying({
                    type: 'music',
                    title: state.current_track_data.title || 'Unknown',
                    playlist: state.current_playlists?.[0] || '',
                    duration: state.current_track_data.duration || 0,
                    elapsed: state.position || 0,
                    isPlaying: state.is_playing || false,
                  });
                } else if (state.current_announcement_data) {
                  setNowPlaying({
                    type: 'announcement',
                    title: state.current_announcement_data.title || 'Unknown',
                    duration: state.current_announcement_data.duration || 0,
                    elapsed: state.position || 0,
                    isPlaying: state.is_playing || false,
                  });
                }
                setState(state.is_playing ? 'live' : 'standby');
                setVolumeState(state.volume || 100);
              }
            } catch (error) {
              console.error('Failed to load playback state:', error);
            }
          };
          loadState();
        }, 1000);
      }
    };

    const handleDisconnected = (data: any) => {
      if (data.type === 'playback') {
        // console.log('Playback WebSocket disconnected'); // Debug logging removed
        setState('offline');
      }
    };

    const handleError = (data: any) => {
      if (data.type === 'playback') {
        console.error('Playback WebSocket error:', data.error);
        setState('offline');
      }
    };

    wsClient.on('playback_update', handlePlaybackUpdate);
    wsClient.on('connected', handleConnected);
    wsClient.on('disconnected', handleDisconnected);
    wsClient.on('error', handleError);

    return () => {
      wsClient.off('playback_update', handlePlaybackUpdate);
      wsClient.off('connected', handleConnected);
      wsClient.off('disconnected', handleDisconnected);
      wsClient.off('error', handleError);
      wsClient.disconnectPlayback();
    };
  }, [activeTarget]);

  // Update Media Session metadata when track changes
  useEffect(() => {
    if (nowPlaying) {
      backgroundAudio.updateMetadata({
        title: nowPlaying.title,
        artist: nowPlaying.playlist || 'sync2gear',
        album: nowPlaying.type === 'announcement' ? 'Announcements' : 'Music Library',
      });
    }
  }, [nowPlaying]);

  // Update playback state for lock screen
  useEffect(() => {
    backgroundAudio.setPlaybackState(
      nowPlaying?.isPlaying ? 'playing' : 'paused'
    );
  }, [nowPlaying?.isPlaying]);

  const contextValue: PlaybackContextType = {
    state,
    mode,
    activeTarget,
    targetDeviceCount,
    nowPlaying,
    volume,
    ducking,
    isShuffleOn,
    isRepeatOn,
    backgroundAudioStatus,
    startOutput,
    stopOutput,
    setActiveTarget,
    setMode,
    playPause,
    skipNext,
    skipPrevious,
    setVolume,
    setDucking,
    toggleShuffle,
    toggleRepeat,
    playInstantAnnouncement,
    playPreview,
    stopPreview,
    enableBackgroundPlayback,
    selectedPlaylists,
    availablePlaylists,
    setSelectedPlaylists,
  };

  return (
    <PlaybackContext.Provider value={contextValue}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within PlaybackProvider');
  }
  return context;
}