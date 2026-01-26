import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { backgroundAudio } from '@/lib/backgroundAudio';
import { ContinuousPlaybackEngine, Track, Playlist } from '@/lib/continuousPlayback';
import { playbackAPI, wsClient } from '@/lib/api';
import { toast } from 'sonner';

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
  const [volume, setVolumeState] = useState(75);
  const [ducking, setDuckingState] = useState(50);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [isRepeatOn, setIsRepeatOn] = useState(false);
  const [backgroundAudioStatus, setBackgroundAudioStatus] = useState(backgroundAudio.getStatus());
  
  // No demo/static "now playing" - UI should reflect real backend/local playback state only
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);

  // Start empty; real playlist discovery is backend-dependent
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [availablePlaylists, setAvailablePlaylists] = useState<Playlist[]>([]);

  // Use refs to avoid circular dependencies in useEffect
  const playPauseRef = useRef<(() => Promise<void>) | null>(null);
  const skipNextRef = useRef<(() => Promise<void>) | null>(null);
  const skipPreviousRef = useRef<(() => Promise<void>) | null>(null);

  const enableBackgroundPlayback = useCallback(async () => {
    await backgroundAudio.enableBackground();
    setBackgroundAudioStatus(backgroundAudio.getStatus());
  }, []);

  const startOutput = useCallback(async () => {
    try {
      await playbackAPI.play(activeTarget, selectedPlaylists, isShuffleOn);
      setState('live');
      setNowPlaying(prev => prev ? { ...prev, isPlaying: true } : null);
      toast.success('Live output started');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start output');
      console.error('Start output error:', error);
    }
  }, [activeTarget, selectedPlaylists, isShuffleOn]);

  const stopOutput = useCallback(async () => {
    try {
      await playbackAPI.pause(activeTarget);
      setState('standby');
      setNowPlaying(prev => prev ? { ...prev, isPlaying: false } : null);
      toast.success('Live output stopped');
    } catch (error: any) {
      toast.error(error.message || 'Failed to stop output');
      console.error('Stop output error:', error);
    }
  }, [activeTarget]);

  const playPause = useCallback(async () => {
    try {
      if (nowPlaying?.isPlaying) {
        await playbackAPI.pause(activeTarget);
      } else {
        await playbackAPI.resume(activeTarget);
      }
      setNowPlaying(prev => prev ? { ...prev, isPlaying: !prev.isPlaying } : null);
      if (state === 'standby') setState('live');
    } catch (error: any) {
      toast.error(error.message || 'Playback control failed');
      console.error('Play/pause error:', error);
    }
  }, [activeTarget, nowPlaying?.isPlaying, state]);

  const skipNext = useCallback(async () => {
    try {
      await playbackAPI.next(activeTarget);
      toast.success('Skipped to next track');
    } catch (error: any) {
      toast.error(error.message || 'Failed to skip track');
      console.error('Skip next error:', error);
    }
  }, [activeTarget]);

  const skipPrevious = useCallback(async () => {
    try {
      await playbackAPI.previous(activeTarget);
      toast.success('Skipped to previous track');
    } catch (error: any) {
      toast.error(error.message || 'Failed to skip track');
      console.error('Skip previous error:', error);
    }
  }, [activeTarget]);

  const setVolume = useCallback(async (vol: number) => {
    setVolumeState(vol);
    try {
      await playbackAPI.setVolume(activeTarget, vol);
    } catch (error: any) {
      toast.error('Failed to set volume');
      console.error('Set volume error:', error);
    }
  }, [activeTarget]);

  const setDucking = useCallback((amount: number) => {
    setDuckingState(amount);
  }, []);

  const playInstantAnnouncement = useCallback(async (announcementId: string, targetIds: string[], options = {}) => {
    try {
      await playbackAPI.play(activeTarget, [announcementId], false);
      toast.success('Announcement sent to devices');
    } catch (error: any) {
      toast.error(error.message || 'Failed to play announcement');
      console.error('Play instant announcement error:', error);
    }
  }, [activeTarget]);

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

  // Handle WebSocket connection separately
  useEffect(() => {
    // Only connect if we have a valid zone ID (UUID format)
    // "all-zones" is not a valid zone ID, so skip WebSocket connection for it
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (activeTarget && activeTarget !== 'all-zones' && uuidRegex.test(activeTarget)) {
      wsClient.connect(activeTarget);
    } else {
      // For "all-zones" or invalid zone IDs, connect to general events endpoint
      wsClient.connect();
    }
    
    const handlePlaybackUpdate = (data: any) => {
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
    };

    wsClient.on('playback_update', handlePlaybackUpdate);

    return () => {
      wsClient.off('playback_update', handlePlaybackUpdate);
      wsClient.disconnect();
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