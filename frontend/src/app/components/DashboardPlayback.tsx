import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Slider } from '@/app/components/ui/slider';
import { cn } from '@/app/components/ui/utils';
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
  Pause,
  Square, 
  Music, 
  Radio, 
  SkipForward,
  Volume2,
  Clock,
  Disc3
} from 'lucide-react';
import { announcementsAPI, musicAPI, zonesAPI, playbackAPI } from '@/lib/api';
import { Folder } from '@/lib/types';
import { toast } from 'sonner';
import { useLocalPlayer } from '@/lib/localPlayer';
import { usePlayback } from '@/lib/playback';
import { formatDuration } from '@/lib/utils';

export function DashboardPlayback() {
  const { user } = useAuth();
  const clientId = user?.role === 'admin' ? null : user?.clientId;
  const { play: playLocal, pause: pauseLocal, setVolume: setLocalVolume, isPlaying: localIsPlaying } = useLocalPlayer();
  const { state: playbackState, nowPlaying: playbackNowPlaying, playPause: playbackPlayPause, activeTarget } = usePlayback();

  const [musicFiles, setMusicFiles] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementFolders, setAnnouncementFolders] = useState<Folder[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [selectedAnnouncementFolderId, setSelectedAnnouncementFolderId] = useState<string | null>(null);

  const filteredZones = clientId ? zones.filter((z: any) => z.clientId === clientId) : zones;

  // Filter music by active zone if one is selected
  let filteredMusic = musicFiles;
  if (activeTarget) {
    filteredMusic = musicFiles.filter((m: any) => m.zoneId === activeTarget || m.zone === activeTarget);
  }
  
  // Get announcements from selected folder, or all enabled if no folder selected
  // Also filter by active zone if one is selected
  let filteredAnnouncements = selectedAnnouncementFolderId
    ? announcements.filter((a: any) => a.enabled && a.category === selectedAnnouncementFolderId)
    : announcements.filter((a: any) => a.enabled);
  
  if (activeTarget) {
    filteredAnnouncements = filteredAnnouncements.filter((a: any) => a.zoneId === activeTarget || a.zone === activeTarget);
  }

  const isAudioUrl = (url?: string) => {
    if (!url) return false;
    const u = url.toLowerCase();
    return (
      u.endsWith('.mp3') ||
      u.endsWith('.wav') ||
      u.endsWith('.m4a') ||
      u.endsWith('.aac') ||
      u.endsWith('.ogg') ||
      u.endsWith('.flac')
    );
  };

  // Playback state - sync with shared playback state
  // Use playbackState from PlaybackProvider if available, otherwise use local state
  const isBackendPlaying = playbackState === 'live' && (playbackNowPlaying?.isPlaying ?? false);
  const [localIsPlayingState, setLocalIsPlayingState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Determine actual playing state: backend playback OR local preview
  const isPlaying = isBackendPlaying || localIsPlayingState || localIsPlaying;
  const [selectedMusicIds, setSelectedMusicIds] = useState<string[]>([]);
  const [selectedAnnouncementIds, setSelectedAnnouncementIds] = useState<string[]>([]);
  const [announcementInterval, setAnnouncementInterval] = useState(300); // seconds (default 5 minutes = 300 seconds)
  const [fadeDuration, setFadeDuration] = useState(3); // seconds
  const [backgroundVolume, setBackgroundVolume] = useState(20); // percentage (0-100)
  const [announcementVolume, setAnnouncementVolume] = useState(100); // percentage (0-100)

  // Current playback state
  const [currentMusicIndex, setCurrentMusicIndex] = useState(0);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [isPlayingAnnouncement, setIsPlayingAnnouncement] = useState(false);
  const [timeUntilNextAnnouncement, setTimeUntilNextAnnouncement] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Audio refs (announcements only; music uses the global LocalPlayer)
  const announcementAudioRef = useRef<HTMLAudioElement | null>(null);

  // Timer refs
  const intervalTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);

  // Get current music and announcement
  const currentMusic = selectedMusicIds[currentMusicIndex] 
    ? filteredMusic.find(m => m.id === selectedMusicIds[currentMusicIndex])
    : null;

  // Get current announcement based on index (cycles through selected announcements)
  const nextAnnouncement = selectedAnnouncementIds.length > 0 && currentAnnouncementIndex < selectedAnnouncementIds.length
    ? filteredAnnouncements.find(a => a.id === selectedAnnouncementIds[currentAnnouncementIndex])
    : null;

  // Get current zone from activeTarget
  const currentZone = filteredZones.find((z: any) => String(z.id) === activeTarget);
  const selectedZoneId = activeTarget;
  const selectedZoneName = currentZone?.name || 'Selected Zone';

  // Start playback
  const handleStart = async () => {
    if (selectedMusicIds.length === 0) {
      toast.error('Please select at least one music track');
      return;
    }

    if (!activeTarget) {
      toast.error('Please select a zone from the top of the page');
      return;
    }

    setIsLoading(true);
    try {
      const zoneId = activeTarget;

      if (!zoneId) {
        toast.error('Zone not found');
        setIsLoading(false);
        return;
      }

      // Start backend playback (pass music file IDs directly)
      if (zoneId) {
        await playbackAPI.play(zoneId, [], false, selectedMusicIds);
      }

      setLocalIsPlayingState(true);
      // Only start announcement countdown if announcements are selected from folder
      // Announcements will play turnwise from the selected folder
      setTimeUntilNextAnnouncement(selectedAnnouncementIds.length > 0 ? announcementInterval : 0);
      setCurrentAnnouncementIndex(0); // Start from first announcement in folder
      
      // Also start local preview playback
      if (currentMusic?.url) {
        try {
          await playLocal({
            id: String(currentMusic.id),
            title: String(currentMusic.name),
            url: String(currentMusic.url),
          });
        } catch (e: any) {
          console.warn('Local preview play failed:', e?.name, e?.message);
        }
      }

      toast.success(`Playback started on ${selectedZoneName}`);
    } catch (e: any) {
      console.error('Playback start failed:', e);
      toast.error(e?.message || 'Failed to start playback');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop playback
  const handleStop = async () => {
    setIsLoading(true);
    try {
      if (activeTarget) {
        await playbackAPI.pause(activeTarget);
      }

      setLocalIsPlayingState(false);
      setIsPlayingAnnouncement(false);
      setTimeUntilNextAnnouncement(0);
      setElapsedTime(0);
      
      pauseLocal();
      setLocalVolume(100);
      if (announcementAudioRef.current) {
        announcementAudioRef.current.pause();
        announcementAudioRef.current.currentTime = 0;
      }

      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }

      toast.info('Playback stopped');
    } catch (e: any) {
      console.error('Playback stop failed:', e);
      toast.error(e?.message || 'Failed to stop playback');
    } finally {
      setIsLoading(false);
    }
  };

  // Play next announcement manually
  const handleNextAnnouncement = () => {
    if (!isPlaying) return;
    playAnnouncement();
  };

  // Play announcement
  const playAnnouncement = async () => {
    if (selectedAnnouncementIds.length === 0) return;

    setIsPlayingAnnouncement(true);
    
    // Fade music down
    {
      const fadeSteps = 20;
      const fadeInterval = (fadeDuration * 1000) / fadeSteps;
      const startVol = 100;
      const endVol = Math.max(0, Math.min(100, backgroundVolume));
      const volStep = (startVol - endVol) / fadeSteps;
      let currentStep = 0;
      const fadeDown = setInterval(() => {
        setLocalVolume(Math.round(Math.max(endVol, startVol - volStep * currentStep)));
        currentStep++;
        if (currentStep >= fadeSteps) clearInterval(fadeDown);
      }, fadeInterval);
    }

    // Play announcement after fade
    setTimeout(async () => {
      if (!nextAnnouncement?.url) {
        toast.error('Selected announcement has no playable URL. Upload an announcement audio first.');
        setIsPlayingAnnouncement(false);
        setTimeUntilNextAnnouncement(announcementInterval);
        return;
      }

      // Show prominent announcement notification
      toast.success(`🔊 Playing Announcement: ${nextAnnouncement?.title || 'Announcement'}`, {
        duration: 3000,
        description: `Music volume reduced to ${backgroundVolume}%`,
      });

      // Ensure announcement audio element exists
      if (!announcementAudioRef.current) {
        announcementAudioRef.current = new Audio();
      }

      const ann = announcementAudioRef.current;
      ann.src = nextAnnouncement.url;
      ann.currentTime = 0;
      
      // Set announcement volume based on user preference (0-100%)
      const targetVolume = Math.max(0, Math.min(1, announcementVolume / 100));
      ann.volume = targetVolume;
      
      // Monitor and maintain announcement volume during playback
      // This ensures announcements stay at the user-set volume
      const volumeMonitor = setInterval(() => {
        const currentTarget = Math.max(0, Math.min(1, announcementVolume / 100));
        if (Math.abs(ann.volume - currentTarget) > 0.01) {
          ann.volume = currentTarget;
        }
      }, 50); // Check every 50ms to ensure volume stays at target

      const onEnded = () => {
        clearInterval(volumeMonitor);
        ann.removeEventListener('ended', onEnded);

        // Fade music back up
        {
          const fadeSteps = 20;
          const fadeInterval = (fadeDuration * 1000) / fadeSteps;
          const startVol = Math.max(0, Math.min(100, backgroundVolume));
          const endVol = 100;
          const volStep = (endVol - startVol) / fadeSteps;
          let currentStep = 0;
          const fadeUp = setInterval(() => {
            setLocalVolume(Math.round(Math.min(endVol, startVol + volStep * currentStep)));
            currentStep++;
            if (currentStep >= fadeSteps) clearInterval(fadeUp);
          }, fadeInterval);
        }

        setIsPlayingAnnouncement(false);
        // Cycle to next announcement in the queue (continuous loop)
        setCurrentAnnouncementIndex((prev) => (prev + 1) % selectedAnnouncementIds.length);
        // Reset timer for next announcement
        setTimeUntilNextAnnouncement(announcementInterval);
      };

      ann.addEventListener('ended', onEnded);

      try {
        await ann.play();
        // Double-check volume after play starts
        const targetVolume = Math.max(0, Math.min(1, announcementVolume / 100));
        ann.volume = targetVolume;
      } catch (e) {
        clearInterval(volumeMonitor);
        ann.removeEventListener('ended', onEnded);
        console.error('Announcement play failed:', e);
        toast.error('Failed to play announcement audio');
        setIsPlayingAnnouncement(false);
        setTimeUntilNextAnnouncement(announcementInterval);
      }
    }, fadeDuration * 1000);
  };

  // Timer effect
  useEffect(() => {
    if (isPlaying && !isPlayingAnnouncement && selectedAnnouncementIds.length > 0) {
      // Countdown timer
      intervalTimerRef.current = setInterval(() => {
        setTimeUntilNextAnnouncement((prev) => {
          if (prev <= 1) {
            playAnnouncement();
            return announcementInterval;
          }
          return prev - 1;
        });
      }, 1000);

      // Elapsed timer
      elapsedTimerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      return () => {
        if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      };
    }
  }, [isPlaying, isPlayingAnnouncement, announcementInterval, selectedAnnouncementIds.length]);

  // Load real backend music + announcements + zones + folders
  useEffect(() => {
    const load = async () => {
      try {
        const [m, a, folders, z] = await Promise.all([
          musicAPI.getMusicFiles(),
          announcementsAPI.getAnnouncements(),
          musicAPI.getFolders('announcements'),
          zonesAPI.getZones(),
        ]);
        setMusicFiles((m || []).filter((x: any) => isAudioUrl(x?.url)));
        setAnnouncements((a || []).filter((x: any) => isAudioUrl(x?.url)));
        setAnnouncementFolders(folders || []);
        setZones(z || []);
      } catch (e: any) {
        console.error('Failed to load playback data:', e);
        toast.error(e?.message || 'Failed to load playback data');
      }
    };
    load();
  }, []);

  // Sync local state with shared playback state
  useEffect(() => {
    // Update local state when shared playback state changes
    if (playbackState === 'live' && playbackNowPlaying?.isPlaying) {
      setLocalIsPlayingState(true);
    } else if (playbackState === 'standby') {
      setLocalIsPlayingState(false);
    }
  }, [playbackState, playbackNowPlaying?.isPlaying]);

  // Sync with local player state
  useEffect(() => {
    // If local player is playing, update local state
    if (localIsPlaying) {
      setLocalIsPlayingState(true);
    } else if (!isBackendPlaying) {
      // Only set to false if backend is also not playing
      setLocalIsPlayingState(false);
    }
  }, [localIsPlaying, isBackendPlaying]);

  // Play next track when the index changes (allowed once playback has started)
  useEffect(() => {
    if (!isPlaying) return;
    if (!currentMusic?.url) return;
    playLocal({
      id: String(currentMusic.id),
      title: String(currentMusic.name),
      url: String(currentMusic.url),
    }).catch((e: any) => {
      console.error('Music play failed:', e?.name, e?.message, e);
    });
    setLocalVolume(isPlayingAnnouncement ? backgroundVolume : 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMusicIndex]);

  // Handle track ended - auto-advance to next song in queue
  useEffect(() => {
    const handleTrackEnded = (event: CustomEvent) => {
      // Only auto-advance if we're playing and not playing an announcement
      if (!isPlaying || isPlayingAnnouncement) return;
      
      // Check if this is the current track
      if (event.detail?.trackId === currentMusic?.id) {
        // Advance to next track in queue
        if (selectedMusicIds.length > 0) {
          setCurrentMusicIndex((prev) => {
            const nextIndex = (prev + 1) % selectedMusicIds.length;
            return nextIndex;
          });
          
          // Also advance backend playback
          if (activeTarget) {
            playbackAPI.next(activeTarget).catch((e) => {
              console.error('Failed to advance backend track:', e);
            });
          }
        }
      }
    };

    window.addEventListener('track-ended', handleTrackEnded as EventListener);
    return () => {
      window.removeEventListener('track-ended', handleTrackEnded as EventListener);
    };
  }, [isPlaying, isPlayingAnnouncement, currentMusic?.id, selectedMusicIds.length, activeTarget, filteredZones]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Playback Control */}
      <Card className="border-white/10 shadow-xl bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <div className="p-2 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg shadow-md">
              <Disc3 className="h-5 w-5 text-white" />
            </div>
            Live Playback Control
          </CardTitle>
          <CardDescription className="text-gray-400 mt-1.5">
            Control music and announcement playback across your zones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 sm:space-y-6">
          {/* Zone Info */}
          {activeTarget && currentZone && (
            <div className="p-4 bg-gradient-to-r from-[#1db954]/10 to-[#1ed760]/5 border border-[#1db954]/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg">
                  <Radio className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Playing on: {selectedZoneName}</p>
                  <p className="text-xs text-gray-400">Change zone using the selector at the top of the page</p>
                </div>
              </div>
            </div>
          )}
          {!activeTarget && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-sm text-gray-400 text-center">Please select a zone from the selector at the top of the page</p>
            </div>
          )}

          {/* Music Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base sm:text-lg font-bold text-white">Select Music Tracks</Label>
              {filteredMusic.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedMusicIds.length === filteredMusic.length) {
                      setSelectedMusicIds([]);
                    } else {
                      setSelectedMusicIds(filteredMusic.map(m => m.id));
                    }
                  }}
                  className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3 text-[#1db954] hover:text-[#1ed760] hover:bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10"
                >
                  {selectedMusicIds.length === filteredMusic.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
            {filteredMusic.length === 0 ? (
              <div className="p-8 sm:p-12 bg-white/5/5 backdrop-blur-sm rounded-lg border border-white/10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-white/5/5 mb-4">
                  <Music className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-400 font-medium mb-1">No music tracks available</p>
                <p className="text-sm text-gray-400">Upload music files to get started</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 max-h-72 sm:max-h-96 overflow-y-auto p-3 sm:p-4 bg-white/5/5 backdrop-blur-sm rounded-lg border border-white/10">
                  {filteredMusic.map((music) => {
                    const isSelected = selectedMusicIds.includes(music.id);
                    return (
                      <label
                        key={music.id}
                        className={cn(
                          "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer min-h-[64px] sm:min-h-[72px] active:scale-[0.98]",
                          isSelected
                            ? "bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10 border-[#1db954] shadow-lg shadow-[#1db954]/20 scale-[1.01]"
                            : "bg-white/5 border-white/20 hover:border-[#1db954]/50 hover:bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10/50 hover:shadow-md"
                        )}
                      >
                        {/* Custom Checkbox */}
                        <div className="relative shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMusicIds([...selectedMusicIds, music.id]);
                              } else {
                                setSelectedMusicIds(selectedMusicIds.filter(id => id !== music.id));
                              }
                            }}
                            className="sr-only"
                          />
                          <div className={cn(
                            "w-6 h-6 sm:w-7 sm:h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200",
                            isSelected
                              ? "bg-gradient-to-br from-[#1db954] to-[#1ed760] border-[#1db954] shadow-md"
                              : "bg-white/5 border-white/30 hover:border-[#1db954]"
                          )}>
                            {isSelected && (
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        {/* Icon */}
                        <div className={cn(
                          "p-2.5 sm:p-3 rounded-lg shrink-0 transition-all duration-200",
                          isSelected 
                            ? "bg-gradient-to-br from-[#1db954] to-[#1ed760] shadow-lg scale-110" 
                            : "bg-white/5/5"
                        )}>
                          <Music className={cn(
                            "h-5 w-5 sm:h-6 sm:w-6 transition-colors",
                            isSelected ? "text-white" : "text-gray-400"
                          )} />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm sm:text-base font-bold truncate mb-1",
                            isSelected ? "text-white" : "text-gray-300"
                          )}>{music.name}</p>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 shrink-0" />
                            <p className="text-xs sm:text-sm text-gray-400 font-medium">
                              {music.duration ? formatDuration(music.duration) : '0:00'}
                            </p>
                          </div>
                        </div>
                        {/* Play Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (music.url) {
                              playLocal({
                                id: String(music.id),
                                title: String(music.name),
                                url: String(music.url),
                              }).catch((err) => {
                                console.error('Play failed:', err);
                                toast.error('Failed to play track');
                              });
                              toast.success(`Playing: ${music.name}`);
                            } else {
                              toast.error('Track has no playable URL');
                            }
                          }}
                          className="shrink-0 h-8 w-8 p-0 text-[#1db954] hover:text-[#1ed760] hover:bg-[#1db954]/20"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="shrink-0">
                            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-md animate-pulse"></div>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between pt-2 px-1">
                  <p className="text-sm sm:text-base font-semibold text-gray-300">
                    <span className="font-bold text-[#1db954] text-lg sm:text-xl">{selectedMusicIds.length}</span> 
                    <span className="ml-1">track{selectedMusicIds.length !== 1 ? 's' : ''} selected</span>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Announcement Folder Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base sm:text-lg font-bold text-white">Select Announcement Folder</Label>
            </div>
            {announcementFolders.length === 0 ? (
              <div className="p-8 sm:p-12 bg-white/5/5 backdrop-blur-sm rounded-lg border border-white/10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-white/5/5 mb-4">
                  <Radio className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-400 font-medium mb-1">No announcement folders available</p>
                <p className="text-sm text-gray-400">Create folders in the Announcements section to organize your announcements</p>
              </div>
            ) : (
              <>
                <Select 
                  value={selectedAnnouncementFolderId || 'none'} 
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setSelectedAnnouncementFolderId(null);
                      // Select all enabled announcements
                      setSelectedAnnouncementIds(announcements.filter((a: any) => a.enabled).map(a => a.id));
                    } else {
                      setSelectedAnnouncementFolderId(value);
                      // Auto-select all announcements in the selected folder
                      const folderAnnouncements = announcements.filter((a: any) => a.enabled && a.category === value);
                      setSelectedAnnouncementIds(folderAnnouncements.map(a => a.id));
                    }
                  }}
                >
                  <SelectTrigger className="h-12 bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] border-white/20 hover:border-[#1db954] focus:border-[#1db954] focus:ring-[#1db954]/20 shadow-sm text-base font-medium text-white">
                    <SelectValue placeholder="Select a folder (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-white/10">
                    <SelectItem value="none" className="text-base text-white hover:bg-white/10">No Folder (All Enabled)</SelectItem>
                    {announcementFolders.map((folder) => {
                      const folderAnnouncements = announcements.filter((a: any) => a.enabled && a.category === folder.id);
                      return (
                        <SelectItem key={folder.id} value={folder.id} className="text-base text-white hover:bg-white/10">
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="font-medium">{folder.name}</span>
                            <span className="text-xs text-gray-400 font-medium">
                              ({folderAnnouncements.length} announcements)
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedAnnouncementFolderId && (
                  <div className="p-4 bg-white/5/5 backdrop-blur-sm rounded-lg border border-white/10">
                    <p className="text-sm text-gray-300 mb-2">
                      <span className="font-bold text-[#1db954]">{filteredAnnouncements.length}</span> announcement{filteredAnnouncements.length !== 1 ? 's' : ''} in this folder will play turnwise
                    </p>
                    <p className="text-xs text-gray-400">
                      Announcements will play in order based on the interval you set below
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Announcement Interval */}
          <div className="space-y-4 p-5 sm:p-6 bg-white/5/5 backdrop-blur-sm rounded-lg border border-white/10 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg shadow-md">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <Label className="text-base sm:text-lg font-bold text-white">Announcement Interval</Label>
              </div>
            </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex-1 relative">
                    <div className="[&_[data-slot=slider-range]]:bg-gradient-to-br from-[#1db954] to-[#1ed760] [&_[data-slot=slider-thumb]]:bg-gradient-to-br from-[#1db954] to-[#1ed760] [&_[data-slot=slider-thumb]]:ring-[#1db954]/20">
                      <Slider
                        value={[announcementInterval]}
                        onValueChange={(value) => setAnnouncementInterval(value[0])}
                        min={10}
                        max={1800}
                        step={10}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="px-4 py-2.5 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg shadow-md min-w-[80px] sm:min-w-[100px]">
                    <div className="text-lg sm:text-xl font-bold text-white text-center">
                      {announcementInterval < 60 
                        ? `${announcementInterval}s`
                        : announcementInterval % 60 === 0
                          ? `${announcementInterval / 60} min${announcementInterval / 60 !== 1 ? 's' : ''}`
                          : `${Math.floor(announcementInterval / 60)}m ${announcementInterval % 60}s`
                      }
                    </div>
                  </div>
                </div>
              <p className="text-xs sm:text-sm text-gray-400 font-medium pl-1">
                How often announcements will play (10 seconds - 30 minutes)
              </p>
            </div>
          </div>

          {/* Fade Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-4 p-5 sm:p-6 bg-white/5/5 backdrop-blur-sm rounded-lg border border-white/10 shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg shadow-md">
                  <Volume2 className="h-4 w-4 text-white" />
                </div>
                <Label className="text-base sm:text-lg font-bold text-white">Fade Duration</Label>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex-1 relative">
                    <div className="[&_[data-slot=slider-range]]:bg-gradient-to-br from-[#1db954] to-[#1ed760] [&_[data-slot=slider-thumb]]:bg-gradient-to-br from-[#1db954] to-[#1ed760] [&_[data-slot=slider-thumb]]:ring-[#1db954]/20">
                      <Slider
                        value={[fadeDuration]}
                        onValueChange={(value) => setFadeDuration(value[0])}
                        min={1}
                        max={10}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="px-4 py-2.5 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg shadow-md min-w-[60px] sm:min-w-[70px]">
                    <div className="text-lg sm:text-xl font-bold text-white text-center">
                      {fadeDuration}s
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6 bg-white/5/5 backdrop-blur-sm rounded-lg border border-white/10 shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg shadow-md">
                  <Volume2 className="h-4 w-4 text-white" />
                </div>
                <Label className="text-base sm:text-lg font-bold text-white">Music Volume During Announcement</Label>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex-1 relative">
                    <div className="[&_[data-slot=slider-range]]:bg-gradient-to-br from-[#1db954] to-[#1ed760] [&_[data-slot=slider-thumb]]:bg-gradient-to-br from-[#1db954] to-[#1ed760] [&_[data-slot=slider-thumb]]:ring-[#1db954]/20">
                      <Slider
                        value={[backgroundVolume]}
                        onValueChange={(value) => setBackgroundVolume(value[0])}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="px-4 py-2.5 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg shadow-md min-w-[70px] sm:min-w-[80px]">
                    <div className="text-lg sm:text-xl font-bold text-white text-center">
                      {backgroundVolume}%
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 font-medium pl-1">
                  Music volume when announcement plays (0-100%)
                </p>
              </div>
            </div>
          </div>

          {/* Volume Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-4 p-5 sm:p-6 bg-white/5/5 backdrop-blur-sm rounded-lg border border-white/10 shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg shadow-md">
                  <Volume2 className="h-4 w-4 text-white" />
                </div>
                <Label className="text-base sm:text-lg font-bold text-white">Announcement Volume</Label>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex-1 relative">
                    <div className="[&_[data-slot=slider-range]]:bg-gradient-to-br from-[#1db954] to-[#1ed760] [&_[data-slot=slider-thumb]]:bg-gradient-to-br from-[#1db954] to-[#1ed760] [&_[data-slot=slider-thumb]]:ring-[#1db954]/20">
                      <Slider
                        value={[announcementVolume]}
                        onValueChange={(value) => setAnnouncementVolume(value[0])}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="px-4 py-2.5 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg shadow-md min-w-[70px] sm:min-w-[80px]">
                    <div className="text-lg sm:text-xl font-bold text-white text-center">
                      {announcementVolume}%
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 font-medium pl-1">
                  Volume level for announcements (0-100%)
                </p>
              </div>
            </div>
          </div>

          {/* Start/Stop/Pause Button */}
          <div className="pt-4 space-y-3">
            {!isPlaying ? (
              <Button 
                onClick={handleStart}
                disabled={isLoading}
                className="w-full h-14 sm:h-16 text-base sm:text-lg font-semibold bg-gradient-to-r from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954] shadow-lg shadow-[#1db954]/30 transition-all duration-200"
                size="lg"
              >
                <Play className="h-5 w-5 sm:h-6 sm:w-6 mr-2 shrink-0" />
                <span className="truncate max-w-[calc(100%-3rem)]">
                  {isLoading ? 'Starting...' : (currentMusic?.name ? `Play: ${currentMusic.name}` : 'Start Playback')}
                </span>
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button 
                  onClick={async () => {
                    // Pause/Resume using shared playback controls
                    if (activeTarget) {
                      try {
                        await playbackPlayPause();
                        // Also pause local preview
                        if (localIsPlaying) {
                          pauseLocal();
                        }
                        setLocalIsPlayingState(!localIsPlayingState);
                      } catch (e: any) {
                        toast.error(e?.message || 'Failed to pause/resume');
                      }
                    } else {
                      // For local preview only
                      if (localIsPlaying) {
                        pauseLocal();
                        setLocalIsPlayingState(false);
                      } else {
                        if (currentMusic?.url) {
                          await playLocal({
                            id: String(currentMusic.id),
                            title: String(currentMusic.name),
                            url: String(currentMusic.url),
                          });
                          setLocalIsPlayingState(true);
                        }
                      }
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1 h-14 sm:h-16 text-base sm:text-lg font-semibold bg-gradient-to-br from-[#1db954] to-[#1ed760] hover:from-[#1ed760] hover:to-[#1db954] shadow-lg shadow-[#1db954]/30 transition-all duration-200"
                  size="lg"
                >
                  {localIsPlaying || isBackendPlaying ? (
                    <>
                      <Pause className="h-5 w-5 sm:h-6 sm:w-6 mr-2 shrink-0" />
                      <span>{isLoading ? 'Pausing...' : 'Pause'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 sm:h-6 sm:w-6 mr-2 shrink-0" />
                      <span>{isLoading ? 'Resuming...' : 'Resume'}</span>
                    </>
                  )}
                </Button>
              <Button 
                onClick={handleStop}
                disabled={isLoading}
                className="flex-1 h-14 sm:h-16 text-base sm:text-lg font-semibold bg-slate-600 hover:bg-slate-700 shadow-lg shadow-slate-500/30 transition-all duration-200"
                size="lg"
              >
                <Square className="h-5 w-5 sm:h-6 sm:w-6 mr-2 shrink-0" />
                <span>{isLoading ? 'Stopping...' : 'Stop'}</span>
              </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Currently Playing Display */}
      {isPlaying && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Now Playing */}
          <Card className="border-white/10 shadow-lg bg-white/5/5 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-white">
                <div className="p-1.5 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-lg">
                  <Music className="h-4 w-4 text-white" />
                </div>
                Now Playing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentMusic ? (
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10 rounded-lg border border-blue-200/50 shadow-sm">
                    <p className="font-bold text-lg text-white truncate">{currentMusic.name}</p>
                    <p className="text-sm text-gray-400 mt-1.5 font-medium">
                      Track {currentMusicIndex + 1} of {selectedMusicIds.length}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 p-2.5 bg-slate-50 rounded-lg">
                    <Clock className="h-4 w-4 text-[#1db954]" />
                    <span className="font-medium">Playing for {formatTime(elapsedTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 p-2.5 bg-slate-50 rounded-lg">
                    <Volume2 className="h-4 w-4 text-[#1db954]" />
                    <span className="font-medium">
                      Music Volume: {isPlayingAnnouncement ? `${backgroundVolume}%` : '100%'}
                    </span>
                  </div>
                  {isPlayingAnnouncement && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-[#1db954] p-2.5 bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10 rounded-lg border border-blue-200">
                        <Volume2 className="h-4 w-4" />
                        <span className="font-medium">
                          Announcement Volume: {announcementVolume}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10 rounded-lg border-2 border-blue-300 shadow-sm">
                        <Badge className="bg-gradient-to-br from-[#1db954] to-[#1ed760] animate-pulse shadow-md">
                          🔊 Announcement Playing
                        </Badge>
                        <p className="text-sm text-[#1db954] font-semibold flex-1 truncate">
                          {nextAnnouncement?.title || 'Announcement'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">No music selected</p>
              )}
            </CardContent>
          </Card>

          {/* Next Announcement */}
          <Card className={cn(
            "border-white/10 shadow-lg bg-white/5/5 backdrop-blur-sm transition-all duration-200",
            isPlayingAnnouncement && "ring-2 ring-[#1db954] shadow-xl shadow-[#1db954]/20"
          )}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-white">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  isPlayingAnnouncement ? "bg-gradient-to-br from-[#1db954] to-[#1ed760] animate-pulse" : "bg-gradient-to-br from-[#1db954] to-[#1ed760]"
                )}>
                  <Radio className="h-4 w-4 text-white" />
                </div>
                {isPlayingAnnouncement ? '🔊 Currently Playing Announcement' : 'Next Announcement'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextAnnouncement ? (
                <div className="space-y-3">
                    <div className={cn(
                      "p-4 rounded-lg border-2 shadow-sm transition-all duration-200",
                      isPlayingAnnouncement 
                        ? "bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10 border-blue-300" 
                        : "bg-gradient-to-r from-[#1db954]/20 to-[#1ed760]/10 border-blue-200"
                    )}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-lg">{nextAnnouncement.title}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {nextAnnouncement.type === 'tts' ? 'Text-to-Speech' : 'Uploaded Audio'} • {nextAnnouncement.duration ? formatDuration(nextAnnouncement.duration) : '0:00'}
                        </p>
                      </div>
                      {isPlayingAnnouncement && (
                        <div className="ml-2">
                          <div className="h-3 w-3 bg-gradient-to-br from-[#1db954] to-[#1ed760] rounded-md animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      {isPlayingAnnouncement 
                        ? '🔊 Playing now...' 
                        : `In ${formatTime(timeUntilNextAnnouncement)}`
                      }
                    </span>
                  </div>
                  {selectedAnnouncementIds.length > 1 && (
                    <div className="text-xs text-gray-400 bg-slate-50 p-2 rounded">
                      {selectedAnnouncementIds.length - currentAnnouncementIndex - 1} more announcement{selectedAnnouncementIds.length - currentAnnouncementIndex - 1 !== 1 ? 's' : ''} in queue
                    </div>
                  )}
                  <Button
                    onClick={handleNextAnnouncement}
                    disabled={isPlayingAnnouncement}
                    className="w-full"
                    variant={isPlayingAnnouncement ? "default" : "outline"}
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    {isPlayingAnnouncement ? 'Playing...' : 'Play Now'}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Radio className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-gray-400">No announcements selected</p>
                  <p className="text-xs text-gray-400 mt-1">Select announcements above to play them</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
