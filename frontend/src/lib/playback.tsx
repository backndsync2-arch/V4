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
  stopAnnouncement: () => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlaybackState>('standby');
  const [mode, setMode] = useState<PlaybackMode>('music+announcements');
  const [activeTarget, setActiveTarget] = useState('');
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

  // Track active announcement audio elements (Map<announcementId, AudioElement>)
  const activeAnnouncementAudio = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Function to stop currently playing announcement
  const stopAnnouncement = useCallback(() => {
    activeAnnouncementAudio.current.forEach((audio, announcementId) => {
      audio.pause();
      audio.currentTime = 0;
      activeAnnouncementAudio.current.delete(announcementId);
    });
    setNowPlaying(null);
    toast.info('Announcement stopped');
  }, []);

  // Handle WebSocket connection separately
  useEffect(() => {
    // Only connect if we have a valid zone ID (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (activeTarget && uuidRegex.test(activeTarget)) {
      wsClient.connect(activeTarget);
    } else {
      // For invalid zone IDs, connect to general events endpoint
      wsClient.connect();
    }
    
    const handlePlaybackUpdate = (message: any) => {
      // WebSocket message structure: { type: 'playback_update', data: {...} }
      const data = message.data || message;
      
      // Check if this message is for the active zone
      const messageZoneId = data.zone_id || data.zoneId;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      // If we have an active target (zone), only process messages for that zone
      if (activeTarget && uuidRegex.test(activeTarget) && messageZoneId) {
        const zoneMatches = String(messageZoneId).toLowerCase() === String(activeTarget).toLowerCase();
        if (!zoneMatches) {
          console.log('[Playback] Ignoring message for different zone:', {
            message_zone: messageZoneId,
            active_zone: activeTarget
          });
          return;
        }
      }
      
      console.log('[Playback] WebSocket update received:', {
        message_type: message.type,
        has_announcement: !!data.current_announcement_data,
        is_playing: data.is_playing,
        announcement: data.current_announcement_data,
        zone_id: messageZoneId,
        active_target: activeTarget,
        zone_matches: activeTarget ? String(messageZoneId).toLowerCase() === String(activeTarget).toLowerCase() : true
      });
      
      // Handle announcement playback
      if (data.current_announcement_data && data.is_playing) {
        const announcement = data.current_announcement_data;
        console.log('[Playback] Processing announcement:', announcement);
        
        // Backend sends 'file_url', but also check 'url' for compatibility
        const announcementUrl = announcement.file_url || announcement.url || announcement.file;
        const announcementId = announcement.id;
        
        if (!announcementUrl) {
          console.error('[Playback] Announcement has no URL:', announcement);
          toast.error(`Announcement "${announcement.title || 'Unknown'}" has no audio file`);
          return;
        }
        
        // Make URL absolute if it's relative
        const absoluteUrl = announcementUrl.startsWith('http') 
          ? announcementUrl 
          : `${window.location.origin}${announcementUrl}`;
        
        
        // Stop any existing announcement for this zone
        const existingAudio = activeAnnouncementAudio.current.get(announcementId);
        if (existingAudio) {
          existingAudio.pause();
          existingAudio.currentTime = 0;
          activeAnnouncementAudio.current.delete(announcementId);
        }
        
        if (absoluteUrl) {
          // Ensure AudioContext is ready before playing
          const playAnnouncement = async () => {
            try {
              // Ensure AudioContext is created and resumed
              backgroundAudio.createAudioContext();
              await backgroundAudio.resumeAudioContext();
            } catch (err) {
              console.warn('Could not resume AudioContext for scheduled announcement:', err);
            }
            
            // Play announcement audio
            const audio = new Audio(absoluteUrl);
            activeAnnouncementAudio.current.set(announcementId, audio);
            
            // Set volume
            audio.volume = 1.0;
            
            // Update now playing to show announcement
            setNowPlaying({
              type: 'announcement',
              title: announcement.title || 'Announcement',
              playlist: undefined,
              duration: announcement.duration || 0,
              elapsed: 0,
              isPlaying: true,
            });
            
            // Load and play
            audio.load();
            
            // Set up event handlers before playing
            audio.onended = () => {
              activeAnnouncementAudio.current.delete(announcementId);
              if (data.current_track_data) {
                setNowPlaying({
                  type: 'music',
                  title: data.current_track_data.title || 'Music',
                  playlist: undefined,
                  duration: data.current_track_data.duration || 0,
                  elapsed: data.position || 0,
                  isPlaying: data.is_playing,
                });
              } else {
                setNowPlaying(null);
              }
            };
            
            audio.onerror = (e) => {
              console.error('[Playback] Audio error:', e, absoluteUrl);
              activeAnnouncementAudio.current.delete(announcementId);
              toast.error(`Failed to load announcement: ${announcement.title || 'Unknown'}`);
            };
            
            audio.play().then(() => {
              toast.success(`🔊 Playing: ${announcement.title || 'Announcement'}`);
            }).catch((error) => {
              console.error('[Playback] Failed to play announcement:', error);
              activeAnnouncementAudio.current.delete(announcementId);
              // Show toast if autoplay is blocked
              if (error.name === 'NotAllowedError' || error.message?.includes('user gesture')) {
                toast.error('Please click "Start Playback" first to allow audio playback');
              } else {
                toast.error('Failed to play announcement: ' + (error.message || 'Unknown error'));
              }
            });
          };
          
          // Play immediately (user has already interacted if playback is running)
          playAnnouncement();
        }
      }
      
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

    // Listen for playback updates
    wsClient.on('playback_update', handlePlaybackUpdate);
    
    // Also listen for initial playback state
    const handlePlaybackState = (message: any) => {
      const data = message.data || message;
      console.log('[Playback] Initial state received:', data);
      handlePlaybackUpdate(message); // Use same handler
    };
    wsClient.on('playback_state', handlePlaybackState);

    return () => {
      // Only remove event listeners, don't disconnect WebSocket
      // The WebSocket connection is shared and should persist
      wsClient.off('playback_update', handlePlaybackUpdate);
      wsClient.off('playback_state', handlePlaybackState);
      // Don't disconnect here - let the WebSocket client manage its own lifecycle
      // Disconnecting here causes "closed before connection established" errors
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
    stopAnnouncement,
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